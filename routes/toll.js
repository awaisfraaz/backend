const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

router.get('/', async (req, res) => {
    res.send('api is working ')
});

// for tolls 
router.get("/getvehicle", async function (req, res) {
    try {
        const email = req.query.email;

        if (!email) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const { data, error } = await supabase
            .from('voice_user_toll_links')
            .select('*')
            .eq('email', email);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ msg: "Server error" });
    }
})
router.post("/addvehicle", async function (req, res) {
    try {
        const { email, vehicle_reg, auto_pay, auto_pay_limit, vehicle_class, country } = req.body;

        if (!email || !vehicle_reg || !auto_pay || !auto_pay_limit || !vehicle_class || !country) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const { data, error } = await supabase
            .from('voice_user_toll_links')
            .insert({
                email: email,
                vehicle_reg: vehicle_reg,
                auto_pay: auto_pay,
                auto_pay_limit: auto_pay_limit,
                vehicle_class: vehicle_class,
                country: country
            });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({ msg: "Vehicle added successfully" });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ msg: "Server error" });
    }
})
router.delete("/deletevehicle", async function (req, res) {
    try {
        const email = req.query.email;
        const vehicle_reg = req.query.vehicle_reg;

        if (!email || !vehicle_reg) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const { data, error } = await supabase
            .from('voice_user_toll_links')
            .delete()
            .eq('email', email)
            .eq('vehicle_reg', vehicle_reg)

        if (error) {
            return res.status(400).json({ error: error.message })
        }
        return res.status(200).json({ msg: "Vehicle deleted successfully" });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ msg: "Server error" });
    }
})
module.exports = router;
