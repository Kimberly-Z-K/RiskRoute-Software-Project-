// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyqftjxfbjecjdhdzyor.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_iFcMrb7-9eJ86p0KU2PWyg_UZ77LRFF'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);