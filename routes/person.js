const express = require('express');
const router = express.Router();
// const person=require('../models/person');
const supabase = require('../supabaseClient');



router.get("/", (req, res) => {
    res.json({
        name: "Awais",
        age: 20,
        city: "Sargodha"
    })

})



// with supabase db
// router.get
// router.post("/addPerson", async (req, res) => {

//     try {

//         const { userId, name } = req.body;


//         if (!name || !userId) {

//             return res.status(400).json({ error: 'Name and UserId are required' }

//             )
//         }
//         const { data, error } = await supabase
//             .from('person')
//             .insert({ userId: userId, name: name })
//             .select();
//         if (error) {
//             console.error('supabase error', error)
//             return res.status(500).json
//                 ({ error: 'Internal server error' })
//         }
//         res.status(201).json({ msg: "person added sucessfuly in db ", data })

//     }

//     catch (err) {
//         console.error('Server error:', err);
//         res.status(500).json({ msg: "Server error" });
//     }



// });
// // for gettting all persons 
// router.get("/getPerson", async (req, res) => {
//     try {
//         const { data, error } = await supabase
//             .from('person')
//             .select('*')

//         if (error) {
//             console.error('supabase error', error)
//             return res.status(500).json
//                 ({ error: 'Internal server error' })
//         }
//         res.json(data)

//     } catch (err) {
//         console.error('Server error:', err);
//         res.status(500).json({ msg: "Server error" });
//     }
// })

// router.get("/getPerson/:userId", async (req, res) => {
//     try {
//         const { userId } = req.params;
//         const { data, error } = await supabase
//             .from('person')
//             .select('*')
//             .eq('userId', userId)

//         if (error) {
//             console.error('supabase error', error)
//             return res.status(500).json
//                 ({ error: 'Internal server error' })
//         }
//         res.json(data)

//     } catch (err) {
//         console.error('Server error:', err);
//         res.status(500).json({ msg: "Server error" });
//     }
// })
// router.put("/updatePerson/:userId", async (req, res) => {
//     try {
//         const { userId } = req.params;
//         const { name } = req.body;

//         const { data, error } = await supabase
//             .from('person')
//             .update({ name: name, userId: userId })
//             .eq('userId', userId)
//             .select();

//         if (error) {
//             console.error('supabase error', error)
//             return res.status(500).json
//                 ({ error: 'Internal server error' })
//         }
//         res.json({ msg: "person updated sucessfuly in db ", data })

//     } catch (err) {
//         console.error('Server error:', err);
//         res.status(500).json({ msg: "Server error" });
//     }
// });
// router.delete("/deletePerson/:userId", async (req, res) => {

//     try {
//         const { userId } = req.params;

//         const { data, error } = await supabase
//             .from('person')
//             .delete()
//             .eq('userId', userId)
//             .select();

//         if (error) {
//             console.error('supabase error', error)
//             return res.status(500).json
//                 ({ error: 'Internal server error' })
//         }
//         res.json({ msg: "person deleted sucessfuly in db ", data })

//     } catch (err) {
//         console.error('Server error:', err);
//         res.status(500).json({ msg: "Server error" });
//     }
// });
// router.post("/addPerson",(req,res)=>{

//     const newPerson=new person({
//         name:req.body.name,
//         userId:req.body.userId
//     });
//     newPerson.save()
//     .then(person=>{
//         res.json(person);
//     })
//     .catch(err=>{
//         res.status(400).json({msg:"Error in adding person"})
//     })
// });
// if i want to get person by userid 
// router.get("/getPerson/:userId",(req, res)=>{

//     person.find({userId:req.params.userId})
//     .then(person=>{
//         res.json(person);
//     })
//     .catch(err=>{
//         res.status(400).json({msg:"Error in getting person"})
//     })
// });
// router.put("/updatePerson/:id",(req, res)=>{

//     person.findByIdAndUpdate(req.params.id,{
//         name:req.body.name,
//         userId:req.body.userId
//     },{new:true})
//     .then(person=>{
//         res.json(person);
//     })
//     .catch(err=>{
//         res.status(400).json({msg:"Error in updating person"})
//     })
// });
// router.delete("/deletePerson/:id",(req, res)=>{

//     person.findByIdAndDelete(req.params.id)
//     .then(person=>{
//         res.json({msg:"Person deleted successfully"});
//     })
//     .catch(err=>{
//         res.status(400).json({msg:"Error in deleting person"})
//     })
// });
router.patch("/updatevoicestatus/:user_id", async (req, res) => {
    try {
       
        
        const { user_id } = req.params;
    

        const { voice_enabled, has_voice_signature } = req.body;

        const {  error } = await supabase
            .from('profiles')
            .update({ voice_enabled, has_voice_signature })
            .eq('user_id', user_id)
            .select();


        if (error) {
        
            return res.status(500).json({ error: 'Internal server error' });
        }
       res.json({ msg: "person voice status updated sucessfuly in db "});

    } catch (err) {
      
        res.status(500).json({ msg: "Server error" });
    }

})

module.exports = router;