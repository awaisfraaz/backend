const createClient = require('@supabase/supabase-js').createClient
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Validate environment variables
if (!supabaseUrl) {
    console.error('ERROR: SUPABASE_URL is not set in environment variables');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseKey) {
    console.error('ERROR: SUPABASE_KEY is not set in environment variables');
    throw new Error('SUPABASE_KEY environment variable is required');
}

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;