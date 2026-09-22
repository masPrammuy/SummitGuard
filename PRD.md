# Product Requirements Document (PRD)
# SummitGuard: Sistem Manajemen SIMAKSI Terintegrasi Peringatan Dini Cuaca BMKG & Mitigasi Risiko Badai

---

| Informasi Dokumen | Detail |
|---|---|
| **Nama Produk** | **SummitGuard** |
| **Versi Dokumen** | 2.0 (Production & Academic Ready) |
| **Status** | Approved & Fully Implemented |
| **Konteks Proyek** | Tugas Akhir / Skripsi Sarjana Informatika & Sistem Informasi |
| **Arsitektur Sistem** | Multi-Page Web Application, Supabase Cloud PostgreSQL, Vercel Static Hosting |
| **Terakhir Diperbarui** | 22 September 2026 |

---

## 1. Pendahuluan & Latar Belakang

### 1.1 Latar Belakang Masalah
Kawasan gunung api dan taman nasional di Indonesia (seperti Gunung Merbabu, Gunung Prau, dan Gunung Gede Pangrango) merupakan destinasi pendakian populer dengan ribuan pengunjung setiap pekannya. Namun, pengelolaan pendakian saat ini menghadapi tiga tantangan kritis:
1. **Tingginya Risiko Kecelakaan Akibat Cuaca Ekstrem:** Kondisi mikroklimat pegunungan dapat berubah drastis dalam hitungan jam. Cuaca ekstrem (angin kencang >45 knot, hujan badai lebat, badai petir, dan suhu mendekati titik beku) sering kali memicu insiden hipotermia parah, disorientasi jalur, hingga korban jiwa.
2. **Ketiadaan Protokol Mitigasi Terstruktur pada Tiket:** Ketika peringatan dini cuaca buruk dirilis oleh Badan Meteorologi, Klimatologi, dan Geofisika (BMKG), pendaki kerap dihadapkan pada dilema: memaksakan pendakian berbahaya demi menghindari kerugian finansial, atau membatalkan perjalanan dengan risiko kehilangan tiket dan uang yang telah dibayarkan.
3. **Fragmentasi Data Perizinan & Pembatasan Daya Dukung Lingkungan:** Sistem reservasi konvensional kerap belum terintegrasi dengan pembatasan kuota daya dukung lingkungan (*carrying capacity*), skrining perlengkapan standar operasional (SOP), pemberdayaan masyarakat lokal (jasa porter), serta otentikasi identitas pendaki yang aman dan terpusat di cloud database.

### 1.2 Tujuan Produk
**SummitGuard** hadir sebagai platform web percontohan komprehensif yang mengintegrasikan:
- Pendaftaran Surat Izin Masuk Kawasan Konservasi (**SIMAKSI**) digital secara multi-tahap.
- Pemantauan prakiraan cuaca **BMKG real-time** dengan deteksi status siaga badai.
- **3 Opsi Mitigasi Risiko Berbasis Kebijakan (*Disaster Risk Mitigation Protocol*):**
  1. *Proceed with Caution:* Tetap naik dengan pakta integritas dan surat pernyataan risiko tinggi (*liability waiver*).
  2. *Free Reschedule:* Pemindahan jadwal bebas denda/biaya penalti dalam 30 hari karena faktor alam (*force majeure*).
  3. *Full Refund Guarantee:* Pembatalan dan pengembalian dana 100% penuh beserta pemulihan kuota konservasi otomatis.
- **Otentikasi Aman Cloud Database:** Supabase Authentication (Email/Password & Google OAuth), otorisasi Row Level Security (RLS) PostgreSQL, dan hosting terdistribusi di Vercel.

---

## 2. Pengguna Sasaran (*User Personas*)

### Persona 1: Ketua Rombongan Pendaki (*Primary User*)
- **Peran:** Pendaki yang bertanggung jawab mendaftarkan diri dan anggota rombongannya.
- **Kebutuhan:** Memilih jalur basecamp resmi, mengecek sisa kuota, memvalidasi kelayakan cuaca sebelum berangkat, mengurus perizinan SIMAKSI, memesan jasa porter, dan mengambil keputusan mitigasi darurat jika terjadi cuaca buruk.

### Persona 2: Ranger / Pengelola Basecamp Taman Nasional (*Operational Admin*)
- **Peran:** Petugas pos perizinan dan SAR balai taman nasional.
- **Kebutuhan:** Memverifikasi legalitas e-tiket via QR Code, memantau manifest rombongan pendaki yang sedang berada di gunung, menginput/mensimulasikan peringatan badai BMKG, serta memantau opsi mitigasi yang diambil oleh pendaki secara live.

### Persona 3: Dosen Penguji / Reviewer Akademik (*Evaluator*)
- **Peran:** Penguji sidang skripsi atau pengembang sistem.
- **Kebutuhan:** Menguji kelayakan arsitektur sistem, integritas alur bisnis, mekanisme simulasi cuaca (Normal vs Badai), ketahanan data offline (*resilience fallback*), dan keandalan kode otomatis.

---

## 3. Arsitektur Informasi & Alur Halaman (*Sitemap*)

```
[Pengunjung Publik] 
         │
         ▼
 ┌──────────────┐
 │  login.html  │ ◄── [Strict Auth Gate Interceptor]
 └──────┬───────┘
        │ (Otentikasi Berhasil via Email atau Google OAuth)
        ▼
 ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
 │  index.html  │ ───► │ booking.html │ ───► │ ticket.html  │ ◄──► │  admin.html  │
 │ (Katalog &   │      │ (Formulir    │      │ (E-Tiket &   │      │ (Panel BMKG  │
 │ Kuota Jalur) │      │ Registrasi)  │      │ 3 Mitigasi)  │      │ & Monitor)   │
 └──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
```

---

## 4. Spesifikasi Fungsional Terperinci

### 4.1 Modul Otentikasi & Strict Auth Gate (`login.html`, `js/auth-guard.js`)
* **Strict Authentication Gate:**
  - Setiap akses langsung ke halaman `index.html`, `booking.html`, `ticket.html`, atau `admin.html` tanpa sesi aktif akan dicegat di `<head>` dan dialihkan ke `login.html?redirect=<encodedURL>`.
  - Setelah berhasil login, pengguna secara otomatis diarahkan kembali ke URL tujuan semula.
* **Form Masuk (*Sign In*):**
  - Input: Email & Password.
  - Validasi: Format email valid, kata sandi terenkripsi via Supabase Auth API.
* **Form Pendaftaran Akun (*Sign Up*):**
  - Input: Nama Lengkap, Email, Password (minimal 6 karakter), Konfirmasi Password.
  - Trigger Otomatis: Saat user terdaftar di `auth.users`, trigger PostgreSQL `handle_new_user()` menyalin profil ke tabel `public.profiles`.
* **Google OAuth (Masuk dengan Google):**
  - Tombol resmi ber-ikon Google: *"Lanjutkan dengan Google"*.
  - Terintegrasi dengan Google Cloud Console OAuth 2.0 Client ID dan Callback URL Supabase.
* **Keamanan & Desain:**
  - **Murni Tanpa Demo Login Button:** Tidak ada jalan pintas bypass sesuai standar keamanan sistem nyata.
  - Proteksi DOM XSS pada banner alert error dan sanitasi URL pengalihan anti-open-redirect.

### 4.2 Modul Katalog Gunung & Daya Dukung Lingkungan (`index.html`, `js/home.js`)
* **Katalog 3 Destinasi Gunung Konservasi:**
  - **Gunung Merbabu:** 3.142 mdpl (Jalur Selo, Suwanting, Thekelan, Wekas) — Kuota harian: 400.
  - **Gunung Prau:** 2.565 mdpl (Jalur Dieng, Patakbanteng, Kalilembu, Dwarawati, Wates, Igirmranak) — Kuota harian: 500.
  - **Gunung Gede:** 2.958 mdpl (Jalur Cibodas, Gunung Putri, Selabintana) — Kuota harian: 300.
* **Metrik & Indikator Interaktif:**
  - Visualisasi kuota tersisa dengan *progress bar* persentase dinamis.
  - *Pill status cuaca BMKG live*: Warna hijau (Aman / Normal) vs merah berkedip (Siaga Badai BMKG disertai kecepatan angin dan suhu puncak).
  - Fitur pencarian cepat tiket (*Quick Ticket Lookup*) via kode registrasi SIMAKSI.

### 4.3 Modul Registrasi SIMAKSI 5-Tahap (`booking.html`, `js/booking.js`)
1. **Tahap 1 — Jalur & Jadwal Pendakian:**
   - Dropdown pemilihan gunung (auto-select dari query URL `?mountain=id`).
   - Dropdown dinamis basecamp resmi sesuai gunung yang dipilih.
   - Pemilihan tanggal pendakian (min: hari ini, max: 60 hari ke depan) dan durasi pendakian.
   - Pengecekan kecukupan kuota harian secara otomatis.
2. **Tahap 2 — Identitas Rombongan:**
   - Data Ketua: Nama lengkap, NIK (16 digit), No. WhatsApp aktif, Nomor Kontak Darurat & Hubungan Keluarga.
   - Data Anggota: Jumlah anggota rombongan (minimal 2 orang sesuai regulasi keselamatan Taman Nasional) dengan input dinamis nama dan NIK tiap pendaki.
3. **Tahap 3 — Skrining Standar Kelayakan Alat & Kesehatan (SOP Screening):**
   - Checklist wajib: Tenda standar badai (dobel layer), sleeping bag per orang, jas hujan/raincoat, matras isolator, dan perlengkapan P3K esensial.
   - Pernyataan kondisi fisik sehat bebas komorbid membahayakan.
4. **Tahap 4 — Pemberdayaan Masyarakat (Add-On Porter Lokal):**
   - Opsi tambahan jasa porter resmi paguyuban warga lokal lingkar gunung (Rp 350.000 / porter).
5. **Tahap 5 — Ringkasan Biaya & Checkout:**
   - Kalkulasi otomatis: Tiket Masuk + Asuransi Jiwa + Jasa Porter = Total Pembayaran.
   - Pilihan simulasi metode pembayaran instan (QRIS Dinamis, Transfer Virtual Account BCA/Mandiri, E-Wallet).
   - Penerbitan instan kode booking resmi (format: `SMK-YYYYMMDD-XXXX`) dan auto-redirect ke halaman e-tiket.

### 4.4 Modul E-Tiket Digital & Validasi Ranger (`ticket.html`, `js/ticket.js`)
* **Struktur Tiket Resmi:**
  - Tampilan *ticket pass perforated* (desain bergerigi samping yang dapat dicetak rapi via `@media print`).
  - Barcode & SVG QR Code offline yang membawa payload tanda tangan digital tiket.
  - Manifest lengkap anggota rombongan, jalur basecamp, dan tanggal pendakian.
  - Badge status verifikasi tiket (`CONFIRMED`, `WEATHER_WARNING`, `HIGH_RISK_APPROVED`, `RESCHEDULED`, `CANCELLED_REFUNDED`).

### 4.5 Modul Protokol 3 Aksi Mitigasi Risiko Cuaca BMKG (`ticket.html`)
Ketika kondisi cuaca gunung berstatus `warning` (Peringatan Badai BMKG), tiket memunculkan banner siaga darurat merah dan mengaktifkan 3 kartu aksi mitigasi:

| Opsi Mitigasi | Mekanisme & Alur Bisnis | Konsekuensi & Status Tiket |
|---|---|---|
| **Opsi 1: Tetap Naik (*Proceed with Caution*)** | Menampilkan modal **Pakta Integritas & Pernyataan Tanggung Jawab Digital**. Ketua rombongan wajib mencentang 4 syarat SOP ekstrem (tenda dobel layer badai, logistik cadangan 24 jam, kesiapan dievakuasi ranger) dan menandatangani secara digital. | Status tiket diperbarui menjadi **`HIGH_RISK_APPROVED`**. Sistem menampilkan nomor darurat SAR Posko Ranger Basecamp 24 jam. |
| **Opsi 2: Reschedule Tanggal (*Free Reschedule*)** | Membuka modal **Kalender Pemindahan Tanggal 30 Hari**. Sistem hanya mengizinkan pemilihan tanggal yang berstatus kuota aman dan cuaca kondusif. **Bebas biaya administrasi (Rp 0)** karena faktor bencana alam (*force majeure*). | Status tiket menjadi **`RESCHEDULED`**. Tanggal tiket langsung diperbarui dan QR Code diperbarui. |
| **Opsi 3: Refund Dana 100% (*Full Refund Guarantee*)** | Membuka modal pengembalian dana 100% penuh (mencakup tiket SIMAKSI, asuransi, dan porter). Pengguna memasukkan rekening bank tujuan atau akun e-wallet. | Status tiket menjadi **`CANCELLED_REFUNDED`**. Kuota otomatis dikembalikan ke sistem gunung (*quota restoration*) dan diterbitkan bukti voucher refund digital. |

### 4.6 Modul Panel Simulasi BMKG & Monitoring Admin (`admin.html`, `js/admin.js`)
* **Simulasi Cuaca Interaktif:** Tombol toggle per gunung (*"Set Cuaca Normal"* vs *"Set Badai Ekstrem"*).
* **Tabel Pemantauan Real-Time:** Menampilkan daftar seluruh rombongan pendaki yang terdaftar beserta status mitigasi yang mereka pilih.
* **Tombol Reset Data Demo:** Mengembalikan kondisi database ke skenario bawaan presentasi kapan saja.

---

## 5. Arsitektur Teknis & Skema Basis Data

### 5.1 Tech Stack
- **Frontend Presentation:** HTML5 Semantic, Tailwind CSS (via CDN), CSS3 Custom Variables & Keyframes.
- **Client Logic:** Vanilla JavaScript (ES6+) dengan pola Universal Module Definition (UMD) mandiri tanpa build-step npm.
- **Cloud Backend & Database:** Supabase Cloud (PostgreSQL 15+, Auth Service, GoTrue).
- **Hosting & Edge Delivery:** Vercel Edge Network dengan `vercel.json` clean routing.
- **Automated Testing:** Python 3.13 `unittest` suite (84 automated tests across 13 modules).

### 5.2 Skema Database PostgreSQL (`supabase-setup.sql`)

```sql
-- 1. TABEL PROFILES (Data Pengguna)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text default 'Pendaki',
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TABEL MOUNTAINS (Data Gunung & Cuaca BMKG)
create table public.mountains (
  id text primary key,
  name text not null,
  elevation text not null,
  province text not null,
  basecamps jsonb not null,
  daily_quota int not null,
  remaining_quota int not null,
  ticket_price int not null,
  weather jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABEL BOOKINGS (Transaksi Reservasi & Mitigasi)
create table public.bookings (
  id text primary key,
  user_id uuid references auth.users on delete set null,
  mountain_id text references public.mountains(id),
  mountain_name text not null,
  basecamp text not null,
  climb_date date not null,
  duration_days int default 2,
  leader jsonb not null,
  members_count int not null,
  members jsonb not null,
  addons jsonb not null,
  total_payment int not null,
  status text not null,
  mitigation_choice text,
  high_risk_waiver_signed boolean default false,
  rescheduled_from date,
  refund_details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 5.3 Row Level Security (RLS) & Keamanan Data
- **`profiles`:** Pengguna terotentikasi dapat membaca data publik; perubahan data profil hanya dapat dilakukan oleh pemilik akun (`auth.uid() = id`).
- **`mountains`:** Dapat dibaca publik (`select`); pembaruan data cuaca diizinkan untuk admin operasional.
- **`bookings`:** Pengguna hanya dapat membaca dan memodifikasi data pemesanan miliknya sendiri (`auth.uid() = user_id`).
- **Sanitasi UUID RFC 4122:** Mencegah terjadinya SQL/type error `22P02` saat bekerja dalam mode fallback akun lokal.

---

## 6. Konfigurasi Deployment Vercel (`vercel.json`)

```json
{
  "version": 2,
  "cleanUrls": true,
  "trailingSlash": false,
  "routes": [
    { "src": "/login", "dest": "/login.html" },
    { "src": "/booking", "dest": "/booking.html" },
    { "src": "/ticket", "dest": "/ticket.html" },
    { "src": "/admin", "dest": "/admin.html" },
    { "src": "/", "dest": "/index.html" },
    { "handle": "filesystem" }
  ]
}
```

---

## 7. Metrik Keberhasilan & Jaminan Mutu (*Quality Assurance*)

Aplikasi telah divalidasi dengan rangkaian uji otomatis mencakup **84 pengujian** di 13 berkas pengujian dengan status kelulusan **100% PASS**:

| Modul Uji | Target Verifikasi | Hasil |
|---|---|---|
| `test_store.py` | Logika tarif, persistensi state, pemulihan kuota saat refund | 10/10 PASS |
| `test_assets.py` | Standar styling UI, komponen perforated tiket, print rules | 6/6 PASS |
| `test_home.py` | Katalog gunung, live weather pill, quick lookup tiket | 6/6 PASS |
| `test_booking.py` | Validasi 5 tahap SIMAKSI, proteksi DOM XSS, kalkulasi porter | 6/6 PASS |
| `test_ticket.py` | Struktur e-tiket, offline SVG QR Code, 3 modal aksi mitigasi | 6/6 PASS |
| `test_admin.py` | Simulasi toggle BMKG, status monitoring tiket, reset data | 6/6 PASS |
| `test_e2e_integration.py` | Integritas tautan navigasi antar halaman, HTTP 200 server response | 2/2 PASS |
| `test_bmkg_service.py` | Format payload BMKG weather service | 4/4 PASS |
| `test_supabase_client.py` | Client connector, auth methods, offline fallback resilience | 12/12 PASS |
| `test_auth_guard.py` | Strict Auth Gate, sanitasi XSS navbar, Promise init | 9/9 PASS |
| `test_login.py` | UI tab login/register, Google OAuth, anti-open-redirect | 9/9 PASS |
| `test_store_supabase.py` | Sinkronisasi database cloud, sanitasi UUID, ISO timestamp | 11/11 PASS |
| `test_vercel_e2e.py` | Validitas skema Vercel v2, routing bersih tanpa .html | 3/3 PASS |
| **TOTAL KESELURUHAN** | **13 Test Suites** | **84/84 PASS (100%)** |

---

## 8. Panduan Penggunaan untuk Sidang Skripsi / Demonstrasi

1. **Skenario 1: Demonstrasi Strict Auth Gate & Google OAuth**
   - Buka website tanpa login $\rightarrow$ sistem otomatis mengalihkan ke `/login`.
   - Klik **"Lanjutkan dengan Google"** atau daftar akun baru $\rightarrow$ sistem mencatat akun ke database Supabase dan membuka dashboard utama dengan widget profil di navbar.
2. **Skenario 2: Simulasi Bencana Badai BMKG & 3 Opsi Mitigasi**
   - Di halaman `/admin`, klik **"Set Badai Ekstrem"** pada Gunung Merbabu.
   - Di halaman `/ticket`, tunjukkan **Banner Merah Peringatan Badai BMKG** yang aktif.
   - Tunjukkan eksekusi masing-masing opsi mitigasi:
     - **Tetap Naik:** Menandatangani pakta integritas dan nomor darurat SAR aktif.
     - **Reschedule:** Memindahkan tanggal pendakian bebas biaya Rp 0.
     - **Refund:** Membatalkan tiket dengan pengembalian dana 100% dan kuota gunung otomatis bertambah kembali.
3. **Skenario 3: Verifikasi Data Cloud Supabase**
   - Buka Supabase Table Editor untuk membuktikan data pendaftaran dan status mitigasi tersimpan secara persisten di cloud database PostgreSQL.
