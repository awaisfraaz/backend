const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sherpa_onnx = require('sherpa-onnx-node');
const supabase = require('../supabaseClient');

// ─────────────────────────────────────────────
// Multer config — store WAV uploads in uploads/voice/
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'voice');
        // create folder if it doesn't exist yet
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // unique name: timestamp-originalname
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (req, file, cb) => {
        // accept only .wav files
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.wav') {
            return cb(new Error('Only .wav files are allowed'), false);
        }
        cb(null, true);
    }
});

// ─────────────────────────────────────────────
// Speaker Embedding Extractor — initialized ONCE
// ─────────────────────────────────────────────
const MODEL_PATH = path.join(
    __dirname, '..', 'models',
    '3dspeaker_speech_eres2net_base_sv_zh-cn_3dspeaker_16k.onnx'
);

let extractor = null;

function getExtractor() {
    if (!extractor) {
        if (!fs.existsSync(MODEL_PATH)) {
            throw new Error(
                `Speaker recognition model not found at ${MODEL_PATH}. ` +
                'Download it from https://github.com/k2-fsa/sherpa-onnx/releases/tag/speaker-recongition-models'
            );
        }
        extractor = new sherpa_onnx.SpeakerEmbeddingExtractor({
            model: MODEL_PATH,
            numThreads: 1,
            debug: false,
        });
        console.log('Speaker Embedding Extractor initialized successfully');
    }
    return extractor;
}

// ─────────────────────────────────────────────
// Helper — compute embedding from a WAV file
// ─────────────────────────────────────────────
function computeEmbedding(ext, filePath) {
    const wave = sherpa_onnx.readWave(filePath);
    const stream = ext.createStream();
    stream.acceptWaveform({ sampleRate: wave.sampleRate, samples: wave.samples });
    return ext.compute(stream);
}

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
router.get('/', (req, res) => {
    res.send('Voice API working fine');
});

// ─────────────────────────────────────────────
// POST /voice/enroll
// ─────────────────────────────────────────────
router.post('/enroll', upload.single('audioFile'), async (req, res) => {
    let uploadedFilePath = null;

    try {
        // ── 1. Validate request ────────────────────
        const { userId, speakerName } = req.body;

        if (!userId || !speakerName) {
            // clean up file if multer already saved it
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'userId and speakerName are required fields'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'audioFile is required (WAV format, 16 kHz, mono)'
            });
        }

        uploadedFilePath = req.file.path;
        console.log(`Enrollment request — userId: ${userId}, speaker: ${speakerName}, file: ${req.file.originalname}`);

        // ── 2. Extract speaker embedding ───────────
        const ext = getExtractor();
        const embedding = computeEmbedding(ext, uploadedFilePath);

        // Convert Float32Array → plain JS array for JSON storage
        const embeddingArray = Array.from(embedding);

        console.log(`Embedding extracted — dimension: ${embeddingArray.length}`);

        // ── 3. Upsert into Supabase ────────────────
        const REQUIRED_SAMPLES = 3; // user is "enrolled" after 3 voice samples

        // Check if a profile already exists for this user
        const { data: existing, error: fetchError } = await supabase
            .from('voice_profiles')
            .select('id, embedding, enrollment_count')
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return res.status(500).json({ error: 'Database error while checking existing profile' });
        }

        let result;

        if (existing) {
            // ── UPDATE existing profile ──
            const newCount = (existing.enrollment_count || 0) + 1;
            const isEnrolled = newCount >= REQUIRED_SAMPLES;

            // Average the new embedding with the stored one for better accuracy
            let mergedEmbedding = embeddingArray;
            if (existing.embedding && Array.isArray(existing.embedding)) {
                const oldEmb = existing.embedding;
                const oldWeight = existing.enrollment_count || 1;
                // Running weighted average: ((old * oldWeight) + new) / newCount
                mergedEmbedding = embeddingArray.map((val, i) => {
                    return ((oldEmb[i] * oldWeight) + val) / (oldWeight + 1);
                });
            }

            const { data, error } = await supabase
                .from('voice_profiles')
                .update({
                    speaker_name: speakerName,
                    embedding: mergedEmbedding,
                    enrollment_count: newCount,
                    is_enrolled: isEnrolled,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select();

            if (error) {
                console.error('Supabase update error:', error);
                return res.status(500).json({ error: 'Failed to update voice profile' });
            }
            result = { action: 'updated', profile: data[0] };
        } else {
            // ── INSERT new profile (first sample) ──
            const { data, error } = await supabase
                .from('voice_profiles')
                .insert({
                    user_id: userId,
                    speaker_name: speakerName,
                    embedding: embeddingArray,
                    enrollment_count: 1,
                    is_enrolled: false    // not enrolled until 3 samples
                })
                .select();

            if (error) {
                console.error('Supabase insert error:', error);
                return res.status(500).json({ error: 'Failed to create voice profile' });
            }
            result = { action: 'created', profile: data[0] };
        }

        // ── 4. Clean up uploaded file ──────────────
        if (fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }

        // ── 5. Respond ────────────────────────────
        const samplesRemaining = Math.max(0, REQUIRED_SAMPLES - result.profile.enrollment_count);
        console.log(`Voice profile ${result.action} for userId: ${userId} | samples: ${result.profile.enrollment_count}/${REQUIRED_SAMPLES}`);

        res.status(201).json({
            msg: `Voice profile ${result.action} successfully`,
            data: {
                userId: result.profile.user_id,
                speakerName: result.profile.speaker_name,
                enrollmentCount: result.profile.enrollment_count,
                isEnrolled: result.profile.is_enrolled,
                samplesRemaining: samplesRemaining,
                embeddingDimension: embeddingArray.length,
                createdAt: result.profile.created_at,
                updatedAt: result.profile.updated_at
            }
        });

    } catch (err) {
        // Clean up on error
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }
        console.error('Enrollment error:', err);
        res.status(500).json({
            error: 'Voice enrollment failed',
            details: err.message
        });
    }
});

// ─────────────────────────────────────────────
// Helper — cosine similarity between two vectors
// ─────────────────────────────────────────────
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
}

// ─────────────────────────────────────────────
// POST /voice/verify
// ─────────────────────────────────────────────
const VOICE_MATCH_THRESHOLD = 0.85;

router.post('/verify', upload.single('audioFile'), async (req, res) => {
    let uploadedFilePath = null;

    try {
        // ── 1. Validate request ────────────────────
        const { userId } = req.body;

        if (!userId) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'userId is required' });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'audioFile is required (WAV format, 16 kHz, mono)'
            });
        }

        uploadedFilePath = req.file.path;
        console.log(`Verify request — userId: ${userId}, file: ${req.file.originalname}`);

        // ── 2. Load stored profile from Supabase ───
        const { data: profile, error: fetchError } = await supabase
            .from('voice_profiles')
            .select('embedding, is_enrolled, speaker_name')
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!profile) {
            return res.status(404).json({ error: 'No voice profile found for this userId. Please enroll first.' });
        }

        if (!profile.is_enrolled) {
            return res.status(400).json({
                error: 'Voice enrollment is not complete. Please submit more voice samples.',
                isEnrolled: false
            });
        }

        if (!profile.embedding || !Array.isArray(profile.embedding)) {
            return res.status(500).json({ error: 'Stored voice embedding is invalid' });
        }

        // ── 3. Extract embedding from uploaded audio ─
        const ext = getExtractor();
        const inputEmbedding = computeEmbedding(ext, uploadedFilePath);
        const inputArray = Array.from(inputEmbedding);

        // ── 4. Compute cosine similarity ───────────
        const score = cosineSimilarity(inputArray, profile.embedding);
        const verified = score >= VOICE_MATCH_THRESHOLD;

        console.log(`Verify result — userId: ${userId}, score: ${score.toFixed(4)}, verified: ${verified}`);

        // ── 5. Clean up uploaded file ──────────────
        if (fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }

        // ── 6. Respond ────────────────────────────
        res.status(200).json({
            verified,
            score: parseFloat(score.toFixed(4)),
            threshold: VOICE_MATCH_THRESHOLD,
            speakerName: profile.speaker_name,
            userId
        });

    } catch (err) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }
        console.error('Verification error:', err);
        res.status(500).json({
            error: 'Voice verification failed',
            details: err.message
        });
    }
});

module.exports = router;