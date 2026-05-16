const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');


router.get("/", function (req, res) {
    res.json({
        msg: "Card route is working"
    });
});

router.get('/getcard', async (req, res) => {
    const { user_email } = req.query;

    if (!user_email) {
        return res.status(400).json({ error: 'user_email query parameter is required' });
    }

    const { data, error } = await supabase
        .from('virtual_card')
        .select('*')
        .eq('user_email', user_email);
        
    if (error) {
        console.error('supabase error', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.json({ msg: "data is fetched", data });
});
router.post('/addcard', async (req, res) => {
    try {
        const { user_email, card_no, expiry, cvv, card_type, user_id } = req.body;
        
       
        
        const { data, error } = await supabase
            .from('virtual_card')
            .insert({ user_email, card_no,expiry, cvv, card_type, user_id })
            .select();
            
        if (error) {
            console.error('supabase error', error);
            return res.status(500).json({ error: 'Internal server error', details: error.message });
        }
        
        res.json({ msg: "card added sucessfuly in db", data });
    } catch (err) {
        console.error('Validation error:', err.message);
        return res.status(400).json({ error: 'Validation error', details: err.message });
    }
});
router.delete('/deletecard', async (req, res) => {
    const { user_email } = req.body;
    const {  error } = await supabase
        .from('virtual_card')
        .delete()
        .eq('user_email', user_email)
        .select();
    if (error) {
        console.error('supabase error', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
    res.json({ msg: "card deleted sucessfuly in db ",});
});
router.patch('/updatecard', async (req, res) => {
    try {
        const { user_email, card_no, expiry, cvv, card_type } = req.body;
        
      
        
        const { data, error } = await supabase
            .from('virtual_card')
            .update({ card_no, expiry, cvv, card_type })
            .eq('user_email', user_email)
            .select();
            
        if (error) {
            console.error('supabase error', error);
            return res.status(500).json({ error: 'Internal server error', details: error.message });
        }
        
        res.json({ msg: "card updated sucessfuly in db", data});
    } catch (err) {
        console.error('Validation error:', err.message);
        return res.status(400).json({ error: 'Validation error', details: err.message });
    }
});



module.exports = router;