# Spesifikasi Desain: Supabase Auth, Google OAuth, Cloud Database & Vercel Hosting untuk SummitGuard

- **Tanggal Dokumen:** 18 September 2026
- **Status:** Validated Design Spec (Siap Masuk Tahap Implementation Plan)
- **Konteks Proyek:** Objek Skripsi / Tugas Akhir Informatika & Sistem Informasi
- **Arsitektur:** Multi-Page Web App dengan Supabase Cloud Auth/DB & Vercel Static Hosting

---

## 1. Latar Belakang & Tujuan Fitur

### 1.1 Kebutuhan Baru
1. **Otentikasi Pengguna & Strict Auth Gate:**
   - Sebelum pengguna dapat mengakses halaman utama (katalog gunung, formulir SIMAKSI, e-tiket, atau panel admin), sistem mewajibkan login terlebih dahulu.
   - Pengguna dapat masuk menggunakan akun yang sudah terdaftar (*Sign In*), membuat akun baru (*Sign Up*), atau masuk menggunakan akun Google (*Google OAuth*).
   - **Catatan Desain Khusus:** Tombol demo login ditiadakan sepenuhnya sesuai permintaan pengguna (murni menggunakan alur login nyata).
2. **Koneksi Database Cloud (Supabase):**
   - Menggantikan penyimpanan yang sebelumnya hanya di `localStorage` menjadi tersimpan langsung di database PostgreSQL Supabase di cloud.
   - Menyediakan skema database lengkap (`supabase-setup.sql`): tabel `profiles`, tabel `mountains`, dan tabel `bookings` dengan Row Level Security (RLS).
3. **Deployment Hosting Vercel:**
   - Menyediakan konfigurasi `vercel.json` agar website siap di-hosting langsung di Vercel dengan URL bersih (*clean URLs*), responsif, dan dapat diakses publik dari mana saja.

---

## 2. Arsitektur Berkas & Komponen Baru

```
wise-davinci/
├── login.html              # [BARU] Halaman Login, Register & Google OAuth
├── supabase-setup.sql      # [BARU] Skrip skema database Supabase PostgreSQL & RLS
├── vercel.json             # [BARU] Konfigurasi routing & deployment Vercel
├── js/
│   ├── auth-guard.js       # [BARU] Pelindung akses halaman (Strict Auth Gate)
│   ├── supabase-client.js  # [BARU] Client connector Supabase Auth & Database
│   ├── navbar.js           # [MODIFIKASI] Render profil user aktif & tombol Logout
│   └── store.js            # [MODIFIKASI] Sinkronisasi data ke Supabase Cloud
└── ... (halaman existing: index.html, booking.html, ticket.html, admin.html)
```

---

## 3. Rincian Antarmuka & Alur Otentikasi

### 3.1 Halaman Login & Registrasi (`login.html`)
- **Visual Design:** Tema alam pegunungan Indonesia modern berbasis Tailwind CSS, logo SummitGuard, dan ilustrasi latar belakang.
- **Tab 1: Masuk (Sign In):**
  - Input: Email & Kata Sandi.
  - Tombol: *"Masuk ke Sistem"*.
  - Validasi: Format email dan kata sandi tidak boleh kosong.
- **Tab 2: Daftar Akun Baru (Sign Up):**
  - Input: Nama Lengkap, Alamat Email, Kata Sandi (min 6 karakter), Konfirmasi Kata Sandi.
  - Tombol: *"Daftar Akun Baru"*.
  - Alur: Memanggil `supabase.auth.signUp()`, otomatis membuat profil di tabel `profiles`.
- **Integrasi Google OAuth:**
  - Tombol resmi ber-ikon Google: *"Lanjutkan dengan Google"*.
  - Memanggil `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })`.
- **Alert & Notifikasi:** Banner status interaktif untuk pesan sukses pendaftaran atau peringatan error jika kredensial tidak cocok.
- **Modal Konfigurasi Supabase (Opsional):** Tombol gear/pengaturan di sudut kanan atas untuk memasukkan URL & Anon Key Supabase jika belum terkonfigurasi di file.

### 3.2 Strict Auth Gate (`js/auth-guard.js`)
- Dipanggil di bagian `<head>` pada `index.html`, `booking.html`, `ticket.html`, dan `admin.html`.
- Logika eksekusi:
  1. Periksa sesi pengguna melalui `SummitSupabase.getSession()`.
  2. Jika tidak ada sesi aktif: Simpan URL tujuan (`redirect`) dan lakukan redirect langsung: `window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href)`.
  3. Jika sesi aktif: Lanjutkan pemuatan halaman, ekstrak data profil pengguna (`name`, `email`, `avatar_url`), dan sematkan ke navbar.
- Menyediakan fungsi `SummitSupabase.logout()`: Menghapus sesi Supabase dan mengarahkan kembali ke `login.html`.

### 3.3 Penyesuaian Top Navbar (`js/navbar.js`)
- Menampilkan widget pengguna terotentikasi di sebelah kanan navbar:
  - Avatar Google (atau lingkaran inisial nama jika registrasi email).
  - Nama panggilan pengguna.
  - Tombol *"Keluar"* ber-ikon logout.

---

## 4. Skema Database Supabase PostgreSQL (`supabase-setup.sql`)

### 4.1 Tabel `profiles`
```sql
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text default 'Pendaki',
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```
- **Trigger Otomatis:**
  Fungsi `public.handle_new_user()` dipicu setelah insert di `auth.users` untuk menyalin `full_name`, `email`, dan `avatar_url` secara otomatis ke `public.profiles`.

### 4.2 Tabel `mountains`
```sql
create table if not exists public.mountains (
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
```

### 4.3 Tabel `bookings`
```sql
create table if not exists public.bookings (
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

### 4.4 Row Level Security (RLS)
- `profiles`: Semua pengguna terotentikasi dapat membaca; pengguna hanya dapat mengubah profil miliknya sendiri (`auth.uid() = id`).
- `mountains`: Dapat dibaca oleh semua pengguna (`select`); update diizinkan untuk admin atau pembaruan status cuaca.
- `bookings`: Pengguna dapat membaca & menulis data booking miliknya (`auth.uid() = user_id`), serta membaca booking jika mengetahui booking ID resmi.

---

## 5. Konfigurasi Deployment Vercel (`vercel.json`)

File `vercel.json` yang akan ditempatkan di root proyek:
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

## 6. Rencana Pengujian & Verifikasi

1. **Uji Auth Gate:** Mengakses `index.html`, `booking.html`, `ticket.html`, atau `admin.html` tanpa sesi aktif memastikan browser langsung dialihkan ke `login.html`.
2. **Uji Registrasi Akun:** Mendaftar akun baru dengan email dan kata sandi valid, memastikan akun tercatat dan otomatis login.
3. **Uji Login Google OAuth:** Memastikan tombol Google memanggil SDK Supabase OAuth dengan parameter redirect yang tepat.
4. **Uji Sinkronisasi Database:** Memastikan reservasi SIMAKSI dan perubahan cuaca BMKG terhubung dengan skema Supabase.
5. **Uji Logout:** Memastikan tombol logout menghapus sesi dan mengembalikan pengguna ke `login.html`.
6. **Uji Konfigurasi Vercel:** Memvalidasi format JSON `vercel.json` dan rute statis.
