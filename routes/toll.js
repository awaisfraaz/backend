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
        const { email, vehicle_reg, auto_pay, vehicle_class, country } = req.body;

        if (!email || !vehicle_reg || !auto_pay || !vehicle_class || !country) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const { data, error } = await supabase
            .from('voice_user_toll_links')
            .insert({
                email: email,
                vehicle_reg: vehicle_reg,
                auto_pay: auto_pay,
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
});
router.post("/paytoll", async function (req, res) {
    try {
        const { email, command } = req.body;

        if (!email || !command) {
            return res.status(400).json({ error: "Missing required fields (email, command)" });
        }

        // Normalize command to both lowercase and uppercase beacuse db contain mixed cases
        const lowerCommand = command.toLowerCase().trim();
        const upperCommand = command.toUpperCase().trim();

        //   Toll intent extraction with intent maping table 
        const { data: intentData, error: intentError } = await supabase
            .from('voice_intent_mappings')
            .select('*')
            .eq('category', 'toll');

        if (intentError) {
            return res.status(400).json({ error: intentError.message });
        }

        // Match command against toll keywords (check both lower and upper)
        let intentMatched = false;
        let matchedIntent = null;

        if (intentData && intentData.length > 0) {
            for (const intent of intentData) {
                const keywords = intent.keywords || [];
                for (const keyword of keywords) {
                    if (lowerCommand.includes(keyword.toLowerCase()) || upperCommand.includes(keyword.toUpperCase())) {
                        intentMatched = true;
                        matchedIntent = intent;
                        break;
                    }
                }
                if (intentMatched) break;
            }
        }

        if (!intentMatched) {
            return res.status(400).json({
                error: "Could not identify toll intent",
                message: "I didn't understand your toll request. Please try again."
            });
        }

        // Get user's vehicle 
        const { data: vehicles, error: vehicleError } = await supabase
            .from('voice_user_toll_links')
            .select('*')
            .eq('email', email);

        if (vehicleError) {
            return res.status(400).json({ error: vehicleError.message });
        }

        if (!vehicles || vehicles.length === 0) {
            return res.status(400).json({
                error: "No vehicle linked",
                message: "You don't have any vehicle linked to your account. Please add a vehicle first."
            });
        }

        // Pick the user's vehicle for a time picking first registerred in our db 
        const userVehicle = vehicles[0];
        const userVehicleClass = (userVehicle.vehicle_class || '').toLowerCase().trim();

        // Find the toll bridge name from the command
        const { data: tollBridges, error: tollError } = await supabase
            .from('voice_toll_bridge')
            .select('*');

        if (tollError) {
            return res.status(400).json({ error: tollError.message });
        }

        let matchedTollName = null;

        // Match canonical_name or short_code (check both lower and upper)
        for (const toll of tollBridges) {
            const name = (toll.canonical_name || '').trim();
            const code = (toll.short_code || '').trim();

            if (name && (lowerCommand.includes(name.toLowerCase()) || upperCommand.includes(name.toUpperCase()))) {
                matchedTollName = name;
                break;
            }
            if (code && (lowerCommand.includes(code.toLowerCase()) || upperCommand.includes(code.toUpperCase()))) {
                matchedTollName = name;
                break;
            }
        }

        // Ivoice_aliases from voice_toll_authorities
        if (!matchedTollName) {
            const { data: authorities, error: authError } = await supabase
                .from('voice_toll_authorities')
                .select('*');

            if (!authError && authorities) {
                for (const auth of authorities) {
                    const aliases = auth.voice_aliases || [];
                    for (const alias of aliases) {
                        if (lowerCommand.includes(alias.toLowerCase()) || upperCommand.includes(alias.toUpperCase())) {
                            matchedTollName = auth.canonical_name;
                            break;
                        }
                    }
                    if (matchedTollName) break;
                }
            }
        }

        if (!matchedTollName) {
            return res.status(400).json({
                error: "Could not identify toll",
                message: "I couldn't find which toll you want to pay. Please specify the toll name."
            });
        }


        const matchedToll = tollBridges.find(
            t => t.canonical_name.toLowerCase().trim() === matchedTollName.toLowerCase().trim()
                && t.vehicle_class.toLowerCase().trim() === userVehicleClass
        );


        const finalToll = matchedToll || tollBridges.find(
            t => t.canonical_name.toLowerCase().trim() === matchedTollName.toLowerCase().trim()
        );

        if (!finalToll) {
            return res.status(400).json({
                error: "Could not find toll price",
                message: `Could not find pricing for ${matchedTollName}.`
            });
        }

        // Return toll details + vehicle info + ask for payment medium
        return res.status(200).json({
            status: "pending_medium",
            intent: matchedIntent.intent_type,
            message: `${finalToll.canonical_name} toll for your ${userVehicle.vehicle_class} (${userVehicle.vehicle_reg}) is ${finalToll.currency} ${finalToll.amount}. How would you like to pay?`,
            toll: {
                name: finalToll.canonical_name,
                amount: finalToll.amount,
                currency: finalToll.currency,
                vehicle_class: finalToll.vehicle_class
            },
            vehicle: {
                vehicle_reg: userVehicle.vehicle_reg,
                vehicle_class: userVehicle.vehicle_class,
                country: userVehicle.country
            },
            all_vehicles: vehicles,
        });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;

