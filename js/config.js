// ==========================================
// PANJRAPOLE - Supabase Configuration
// ==========================================

const SUPABASE_URL = 'https://vijevnaudlpyzxizhzuc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mJzREXrgM6dmnO1KO9Idlg_-oTEegLx';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
