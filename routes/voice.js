const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

router.get('/', async (req, res) => {
    res.send('api is working ')
});


// for User contacts 
router.get("/usercontacts", async function (req, res) {
    try {
        const email = req.query.email;

        if (!email) {
            return res.status(400).json({ error: "Missing email" });
        }
        const { data, error } = await supabase
            .from('voice_user_contacts')
            .select('contact_email, alias')
            .eq('user_email', email)

        if (error) {
            return res.status(400).json({ error: error.message })
        }
        return res.status(200).json(data);



    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ msg: "Server error" });
    }
});
router.post("/addcontact", async function (req, res) {
    try {
        const { user_email, contact_email, alias } = req.body;

        if (!user_email || !contact_email || !alias) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // checking
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', contact_email);

        if (profileError) {
            return res.status(400).json({ error: profileError.message });
        }

        if (!profileData || profileData.length === 0) {
            return res.status(400).json({ error: "Contact email not found in profiles table" });
        }


        const { data, error } = await supabase
            .from('voice_user_contacts')
            .insert({ user_email, contact_email, alias });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({ msg: "contact added successfully" });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ msg: "Server error" });
    }
})
router.delete("/deletecontact", async function (req, res) {
    try {
        const user_email = req.query.user_email;
        const contact_email = req.query.contact_email;
        const { data, error } = await supabase
            .from('voice_user_contacts')
            .delete()
            .eq('user_email', user_email)
            .eq('contact_email', contact_email)

        if (error) {
            return res.status(400).json({ error: error.message })
        }
        return res.status(200).json({ msg: "contact deleted successfully" });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ msg: "Server error" });
    }
})
module.exports = router;

