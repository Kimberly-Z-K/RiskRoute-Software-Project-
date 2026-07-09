import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://pyqftjxfbjecjdhdzyor.supabase.co';
const supabaseAnonKey = 'sb_publishable_iFcMrb7-9eJ86p0KU2PWyg_UZ77LRFF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey,{
  auth:{
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
});

