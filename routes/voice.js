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
});
function extractNumberFromWords(text) {
    if (!text) return null;

  
    const converted = wordsToNumbers(text.toLowerCase());

    if (typeof converted === 'number') {
        return converted > 0 ? converted : null;
    }


    if (typeof converted === 'string') {
        // Matches integers and decimals (e.g., 250, 250.50, .5)
        const match = converted.match(/\d+(?:\.\d+)?/);
        if (match) {
            const num = parseFloat(match[0]);
            return num > 0 ? num : null;
        }
    }

    return null;
}
router.post("/paycontact", async function (req, res) {
    try {
        const { email, command } = req.body;

        if (!email || !command) {
            return res.status(400).json({ error: "Missing required fields (email, command)" });
        }

        // Normalize 
        const lowerCommand = command.toLowerCase().trim();
        const upperCommand = command.toUpperCase().trim();

        // payment intent from voice_intent_mappings
        const { data: intentData, error: intentError } = await supabase
            .from('voice_intent_mappings')
            .select('*')
            .eq('category', 'ACTION');

        if (intentError) {
            return res.status(400).json({ error: intentError.message });
        }

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
                error: "Could not identify payment intent",
                message: "I didn't understand your payment request. Please try again."
            });
        }


        // Fetch slang dictionary 
        const { data: slangData } = await supabase
            .from('voice_slang_dictionary')
            .select('*');

        let parsedAmount = null;

        if (slangData && slangData.length > 0) {
            // Sort slang by term length (longest first) to avoid partial matches
            const sortedSlang = [...slangData].sort((a, b) => b.slang_term.length - a.slang_term.length);
            const slangTerms = sortedSlang.map(s => s.slang_term.toLowerCase());
            const escapedTerms = slangTerms.map(term => term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

            // Normalize command to convert word numbers to digits first (e.g. "fifty" -> "50")
            const normalizedCommand = wordsToNumbers(lowerCommand).toString();

            // Match dynamic regex with word boundary check
            // Group 1 & 2: Number followed by slang term (e.g., "50 k", "2.5 grand")
            // Group 3: Standalone slang term (e.g., "a grand", "bucks")
            const slangRegex = new RegExp(
                `(?:\\b(\\d+(?:\\.\\d+)?)\\s*(${escapedTerms.join('|')})\\b)|(?:\\b(${escapedTerms.join('|')})\\b)`,
                'i'
            );

            const match = normalizedCommand.match(slangRegex);

            if (match) {
                const matchedSlangTerm = match[2] || match[3];
                const multiplier = match[1] ? parseFloat(match[1]) : 1;

                const slangRecord = sortedSlang.find(s => s.slang_term.toLowerCase() === matchedSlangTerm);
                if (slangRecord) {
                    const slangValue = parseFloat(slangRecord.numerical_value.replace(/,/g, ''));
                    parsedAmount = (multiplier * slangValue).toString();
                }
            }
        }

        // Try word-to-number conversion (e.g., "fifty" → 50, "two hundred" → 200)
        if (!parsedAmount) {
            const wordNumber = extractNumberFromWords(lowerCommand);
            if (wordNumber !== null) {
                parsedAmount = wordNumber.toString();
            }
        }


        // extract number from the command
        if (!parsedAmount) {
            const amountMatch = lowerCommand.match(/(\d+\.?\d*)/);
            if (amountMatch) {
                parsedAmount = amountMatch[1];
            }
        }

        if (!parsedAmount) {
            return res.status(400).json({
                error: "Could not extract amount",
                message: "I couldn't figure out how much to send. Please specify an amount."
            });
        }

        // Extract 
        const currencyKeywords = {
            // Major currencies
            "dollar": "USD", "dollars": "USD", "usd": "USD", "$": "USD",
            "pound": "GBP", "pounds": "GBP", "gbp": "GBP", "£": "GBP", "quid": "GBP",
            "euro": "EUR", "euros": "EUR", "eur": "EUR", "€": "EUR",
            "monc": "MONC", "monesave": "MONC",

            // European currencies (non-Eurozone)
            "swiss franc": "CHF", "franc": "CHF", "chf": "CHF",                // Switzerland
            "swedish krona": "SEK", "sek": "SEK",                              // Sweden
            "norwegian krone": "NOK", "nok": "NOK",                            // Norway
            "danish krone": "DKK", "dkk": "DKK",                               // Denmark
            "krone": "NOK", "krona": "SEK",                                     // Generic (defaults)
            "polish zloty": "PLN", "zloty": "PLN", "pln": "PLN", "zł": "PLN", // Poland
            "czech koruna": "CZK", "koruna": "CZK", "czk": "CZK",            // Czech Republic
            "hungarian forint": "HUF", "forint": "HUF", "huf": "HUF",        // Hungary
            "romanian leu": "RON", "leu": "RON", "lei": "RON", "ron": "RON", // Romania
            "bulgarian lev": "BGN", "lev": "BGN", "leva": "BGN", "bgn": "BGN", // Bulgaria
            "croatian kuna": "HRK", "kuna": "HRK", "hrk": "HRK",             // Croatia
            "turkish lira": "TRY", "lira": "TRY", "try": "TRY", "₺": "TRY",  // Turkey
            "serbian dinar": "RSD", "rsd": "RSD",                              // Serbia
            "ukrainian hryvnia": "UAH", "hryvnia": "UAH", "uah": "UAH", "₴": "UAH", // Ukraine
            "icelandic krona": "ISK", "isk": "ISK",                            // Iceland
            "georgian lari": "GEL", "lari": "GEL", "gel": "GEL",             // Georgia
            "albanian lek": "ALL", "lek": "ALL", "all": "ALL",                // Albania
            "moldovan leu": "MDL", "mdl": "MDL",                               // Moldova
            "bosnian mark": "BAM", "bam": "BAM",                               // Bosnia
            "north macedonian denar": "MKD", "denar": "MKD", "mkd": "MKD",   // North Macedonia
            "russian ruble": "RUB", "ruble": "RUB", "rubles": "RUB", "rub": "RUB", "₽": "RUB", // Russia
            "belarusian ruble": "BYN", "byn": "BYN",                           // Belarus

            // African currencies
            "naira": "NGN", "ngn": "NGN", "₦": "NGN",                          // Nigeria
            "rand": "ZAR", "rands": "ZAR", "zar": "ZAR",                       // South Africa
            "cedi": "GHS", "cedis": "GHS", "ghs": "GHS", "ghc": "GHS",        // Ghana
            "shilling": "KES", "shillings": "KES", "kes": "KES",              // Kenya
            "egyptian pound": "EGP", "egp": "EGP",                             // Egypt
            "tanzanian shilling": "TZS", "tzs": "TZS",                         // Tanzania
            "birr": "ETB", "etb": "ETB",                                        // Ethiopia
            "cfa": "XOF", "xof": "XOF", "fcfa": "XOF",                        // West Africa CFA
            "dirham": "MAD", "mad": "MAD",                                      // Morocco
            "dinar": "TND", "tnd": "TND",                                       // Tunisia
            "kwacha": "ZMW", "zmw": "ZMW",                                     // Zambia
            "ugandan shilling": "UGX", "ugx": "UGX",                           // Uganda

            // South Asian currencies
            "rupee": "PKR", "rupees": "PKR", "pkr": "PKR", "₨": "PKR",        // Pakistan
            "indian rupee": "INR", "inr": "INR", "₹": "INR",                  // India
            "taka": "BDT", "bdt": "BDT", "৳": "BDT",                          // Bangladesh
            "sri lankan rupee": "LKR", "lkr": "LKR",                           // Sri Lanka
            "nepalese rupee": "NPR", "npr": "NPR",                             // Nepal
            "afghani": "AFN", "afn": "AFN",                                     // Afghanistan

            // North American currencies
            "canadian dollar": "CAD", "cad": "CAD", "c$": "CAD", "loonie": "CAD", // Canada
            "mexican peso": "MXN", "mxn": "MXN", "peso": "MXN",               // Mexico
            "jamaican dollar": "JMD", "jmd": "JMD",                            // Jamaica
            "trinidadian dollar": "TTD", "ttd": "TTD",                         // Trinidad & Tobago
            "barbadian dollar": "BBD", "bbd": "BBD",                           // Barbados
            "bahamian dollar": "BSD", "bsd": "BSD",                            // Bahamas
            "bermudian dollar": "BMD", "bmd": "BMD",                           // Bermuda
            "east caribbean dollar": "XCD", "xcd": "XCD", "ec dollar": "XCD", // East Caribbean
            "haitian gourde": "HTG", "gourde": "HTG", "htg": "HTG",           // Haiti
            "guatemalan quetzal": "GTQ", "quetzal": "GTQ", "gtq": "GTQ",     // Guatemala
            "honduran lempira": "HNL", "lempira": "HNL", "hnl": "HNL",       // Honduras
            "costa rican colon": "CRC", "colon": "CRC", "crc": "CRC",        // Costa Rica
            "panamanian balboa": "PAB", "balboa": "PAB", "pab": "PAB",        // Panama
            "belizean dollar": "BZD", "bzd": "BZD",                            // Belize
            "nicaraguan cordoba": "NIO", "cordoba": "NIO", "nio": "NIO",     // Nicaragua
            "dominican peso": "DOP", "dop": "DOP",                             // Dominican Republic
            "cuban peso": "CUP", "cup": "CUP",                                 // Cuba

            // South American currencies
            "brazilian real": "BRL", "real": "BRL", "reais": "BRL", "brl": "BRL", "r$": "BRL", // Brazil
            "argentine peso": "ARS", "ars": "ARS",                             // Argentina
            "chilean peso": "CLP", "clp": "CLP",                               // Chile
            "colombian peso": "COP", "cop": "COP",                             // Colombia
            "peruvian sol": "PEN", "sol": "PEN", "soles": "PEN", "pen": "PEN", // Peru
            "uruguayan peso": "UYU", "uyu": "UYU",                             // Uruguay
            "paraguayan guarani": "PYG", "guarani": "PYG", "pyg": "PYG",     // Paraguay
            "boliviano": "BOB", "bob": "BOB",                                   // Bolivia
            "venezuelan bolivar": "VES", "bolivar": "VES", "ves": "VES",     // Venezuela
            "guyanese dollar": "GYD", "gyd": "GYD",                            // Guyana
            "surinamese dollar": "SRD", "srd": "SRD",                          // Suriname
            "falkland pound": "FKP", "fkp": "FKP",                             // Falkland Islands
        };

        let parsedCurrency = null;
        for (const [keyword, currency] of Object.entries(currencyKeywords)) {
            if (lowerCommand.includes(keyword) || upperCommand.includes(keyword.toUpperCase())) {
                parsedCurrency = currency;
                break;
            }
        }

        //  Match contact from voice_user_contacts alias
        const { data: voicecontactData, error: voicecontactError } = await supabase
            .from('voice_user_contacts')
            .select('*')
            .eq('user_email', email);

        if (voicecontactError) {
            return res.status(400).json({ error: voicecontactError.message });
        }

        let matchedContact = null;

        if (voicecontactData && voicecontactData.length > 0) {
            for (const contact of voicecontactData) {
                const aliases = contact.alias || [];
                for (const alias of aliases) {
                    if (lowerCommand.includes(alias.toLowerCase()) || upperCommand.includes(alias.toUpperCase())) {
                        matchedContact = contact;
                        break;
                    }
                }
                if (matchedContact) break;
            }
        }

        if (!matchedContact) {
            return res.status(400).json({
                error: "Could not identify contact",
                message: "I couldn't find that contact. Please check your voice contacts."
            });
        }


        return res.status(200).json({
            status: "pending_confirmation",
            intent: matchedIntent.intent_type,
            message: `Send ${parsedCurrency || ''} ${parsedAmount} to ${matchedContact.alias[0]} please confirm this transaction`,
            payment: {
                amount: parsedAmount,
                currency: parsedCurrency || null,
                contact_name: matchedContact.alias[0],
                contact_email: matchedContact.contact_email,
            }
        });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ msg: "Server error" });
    }
});
module.exports = router;

