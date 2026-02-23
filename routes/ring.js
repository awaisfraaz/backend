const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const upload = multer({ dest: '/tmp/' });


router.get("/", function (req, res) {
    res.json({
        msg: "Ring route is working"
    });
});


router.post('/upload', upload.single('csvfile'), function (req, res) {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const results = [];
    const filePath = req.file.path;
    // console.log('filePath: ',filePath);


    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', function (data) {
            results.push(data);
        })
        .on('end', async function () {
            try {

                const { error } = await supabase
                    .from('ring_transaction')
                    .insert(results);


                fs.unlinkSync(filePath);

                if (error) {
                    console.error('Supabase error:', error);
                    return res.status(500).json({
                        error: 'Failed to insert data',
                        details: error.message
                    });
                }
                //    console.log(results)
                res.json({
                    msg: "CSV data uploaded successfully",
                    rowsInserted: results.length
                });
            } catch (err) {
                console.error('Server error:', err);
                fs.unlinkSync(filePath);
                res.status(500).json({ msg: "Server error" });
            }
        })
        .on('error', function (err) {
            console.error('CSV parsing error:', err);
            fs.unlinkSync(filePath);
            res.status(400).json({ error: 'Failed to parse CSV file' });
        });
});

module.exports = router;