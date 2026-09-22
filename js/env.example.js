/**
 * SummitGuard - Konfigurasi Kredensial Supabase
 *
 * PANDUAN PENGGUNAAN:
 * 1. Salin berkas ini dan beri nama `js/env.js`
 * 2. Masukkan Project URL dan Anon Key dari Dashboard Supabase Anda
 * 3. File ini akan dibaca secara otomatis oleh SummitGuard
 */

window.__ENV__ = {
  // Ganti dengan URL Project Supabase Anda (Settings -> Data API -> Project URL)
  SUPABASE_URL: "https://your-project-id.supabase.co",

  // Ganti dengan Project API anon public key (Settings -> Data API -> Project API keys -> anon public)
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
