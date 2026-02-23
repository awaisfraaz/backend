const createClient = require('@supabase/supabase-js').createClient
require('dotenv').config();
// import { createClient } from '@supabase/supabase-js'



const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey);
// .then(() => console.log('Supabase connected successfully'))
// .catch(err => console.error('Supabase connection error:', err));

module.exports = supabase;