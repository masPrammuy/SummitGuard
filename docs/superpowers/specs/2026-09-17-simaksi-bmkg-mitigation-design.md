# Spesifikasi Desain: SummitGuard (Sistem Reservasi SIMAKSI & Mitigasi Risiko Cuaca BMKG)

- **Tanggal Dokumen:** 17 September 2026
- **Status:** Validated Design Spec (Siap Masuk Tahap Implementation Plan)
- **Konteks Proyek:** Objek Skripsi / Tugas Akhir Informatika & Sistem Informasi
- **Arsitektur Antarmuka:** Multi-Page Web Application (HTML5, Tailwind CSS, Vanilla JavaScript Modern)

---

## 1. Latar Belakang & Pernyataan Masalah

### 1.1 Permasalahan Domain Lapangan
Pemesanan tiket pendakian gunung (SIMAKSI) konvensional umumnya hanya berfungsi sebagai loket digital statis. Ketika cuaca ekstrem (seperti badai tropis, curah hujan lebat, atau angin kencang berkecepatan tinggi) diprediksi oleh Badan Meteorologi, Klimatologi, dan Geofisika (BMKG), sering kali muncul dilema besar:
1. **Pendaki nekat mendaki:** Banyak pendaki tetap memaksa naik meski badai karena tiket non-refundable dan tidak ada mekanisme penyesuaian izin resmi, yang berujung pada kecelakaan fatal seperti hipotermia dan evakuasi darurat.
2. **Ketiadaan fleksibilitas sistem:** Sistem SIMAKSI yang ada tidak menyediakan mekanisme tanggap bencana otomatis (*automated force majeure protocol*), seperti opsi penundaan tanggal tanpa denda atau pengembalian uang 100%.
3. **Pemberdayaan masyarakat lokal:** Kebutuhan logistik darurat dan pemandu/porter lokal di basecamp belum terhubung secara resmi dalam siklus pemesanan tiket.

### 1.2 Tujuan Sistem
Membangun aplikasi web **SummitGuard** berbasis multi-halaman yang tidak hanya memfasilitasi pemesanan tiket SIMAKSI secara online dan transparan, tetapi juga memiliki modul kecerdasan mitigasi risiko berbasis data BMKG:
- Mengidentifikasi status cuaca buruk pada tanggal pendakian sebelum Hari-H.
- Memberikan peringatan dini (*Early Warning System*) langsung pada e-tiket pendaki.
- Menyediakan 3 opsi solusi komprehensif: **Tetap Naik** (dengan pakta integritas & verifikasi alat ekstra), **Reschedule Tanggal** (bebas biaya), dan **Refund Duit 100%** (klaim cepat).

---

## 2. Arsitektur Berkas & Pembagian Halaman

Aplikasi menggunakan arsitektur **Multi-Page Web Flow** murni berbasis standar web modern (HTML5, Tailwind CSS via CDN, Vanilla JavaScript modular) tanpa dependensi runtime kompleks, sehingga mudah dieksekusi, diuji coba, dan dilampirkan dalam laporan skripsi.

```
wise-davinci/
├── index.html              # Beranda, Katalog Gunung, Status Kuota & Weather Widget BMKG
├── booking.html            # Formulir SIMAKSI, Validasi Anggota, Addon Porter, Pembayaran
├── ticket.html             # E-Tiket Digital, Deteksi Badai BMKG, 3 Modal Aksi Mitigasi
├── admin.html              # Panel Simulasi BMKG & Manajemen Pengelola Basecamp
├── js/
│   ├── app.js              # State Manager (localStorage), Data Mock Gunung, Utilitas
│   ├── booking.js          # Logika Validasi Form SIMAKSI, Kalkulasi Biaya, Checkout
│   ├── ticket.js           # Logika Rendering Tiket, Integrasi Alert Badai, 3 Aksi
│   └── admin.js            # Controller Cuaca Live BMKG, Reset Data, Override Status
└── css/
    └── style.css           # Styling kustom (animasi badge, layout tiket, cetak/print)
```

---

## 3. Skema Data & Penyimpanan Klien (`localStorage`)

Seluruh pertukaran data antar halaman menggunakan *client-side storage* yang persisten:

### 3.1 `summit_mountains` (Katalog Gunung & Cuaca BMKG)
Array objek gunung dengan struktur:
```json
[
  {
    "id": "merbabu",
    "name": "Gunung Merbabu",
    "elevation": "3.142 mdpl",
    "province": "Jawa Tengah",
    "basecamps": ["Selo", "Suwanting", "Thekelan", "Wekas"],
    "dailyQuota": 400,
    "remainingQuota": 128,
    "ticketPrice": 25000,
    "weather": {
      "status": "warning",
      "condition": "Badai Hujan & Angin Kencang",
      "temp": "8°C",
      "windSpeed": "48 knot",
      "warningActive": true,
      "warningMessage": "BMKG mengeluarkan peringatan dini badai petir dan angin kencang di ketinggian >2.000 mdpl."
    }
  }
]
```

### 3.2 `summit_bookings` (Riwayat Pemesanan SIMAKSI)
Array pemesanan tiket dengan status dinamis:
```json
[
  {
    "bookingId": "SMK-20260920-0482",
    "mountainId": "merbabu",
    "mountainName": "Gunung Merbabu",
    "basecamp": "Jalur Selo",
    "climbDate": "2026-09-20",
    "durationDays": 2,
    "leader": {
      "name": "Andi Pratama",
      "nik": "3302198701020003",
      "phone": "081234567890",
      "emergencyContact": "081987654321 (Ayah)"
    },
    "membersCount": 3,
    "members": [
      { "name": "Budi Santoso", "nik": "3302198701020004" },
      { "name": "Citra Lestari", "nik": "3302198701020005" }
    ],
    "addons": {
      "porterLocal": true,
      "porterCount": 1,
      "porterFee": 350000
    },
    "totalPayment": 450000,
    "status": "WEATHER_WARNING",
    "mitigationChoice": null,
    "highRiskWaiverSigned": false,
    "rescheduledFrom": null,
    "refundDetails": null,
    "createdAt": "2026-09-17T10:00:00Z"
  }
]
```

### 3.3 Nilai Status Tiket (`status`)
1. `CONFIRMED`: Pemesanan terverifikasi normal, cuaca BMKG terpantau aman.
2. `WEATHER_WARNING`: BMKG mendeteksi cuaca buruk/badai pada tanggal pendakian, memerlukan tindakan mitigasi pengguna.
3. `HIGH_RISK_APPROVED`: Pengguna memilih opsi **Tetap Naik** dengan menandatangani pakta risiko dan mencukupi checklist perlengkapan badai.
4. `RESCHEDULED`: Pengguna memilih opsi **Reschedule Tanggal**, tanggal baru telah diterbitkan tanpa denda.
5. `CANCELLED_REFUNDED`: Pengguna memilih opsi **Refund Dana 100%**, klaim telah diproses dan kuota dikembalikan.

---

## 4. Rincian Antarmuka & Alur Halaman

### 4.1 Halaman Beranda (`index.html`)
- **Top Navigation Bar:** Logo SummitGuard, Tautan Beranda, Katalog Gunung, Cek E-Tiket, dan Tombol Pintas ke "Panel Simulasi BMKG".
- **Hero Section:** Slogan *"Platform Resmi SIMAKSI Terpadu dengan Mitigasi Cuaca Real-Time BMKG"*.
- **Katalog Gunung:** Kartu interaktif menampilkan foto, ketinggian, kuota tersisa, dan badge cuaca BMKG. Dilengkapi tombol *"Daftar SIMAKSI Sekarang"*.
- **Pencarian Tiket Cepat:** Input nomor booking untuk langsung melompat ke halaman `ticket.html`.

### 4.2 Halaman Pendaftaran SIMAKSI (`booking.html`)
- **Step 1: Pilihan Jalur & Tanggal:** Pilih pos basecamp resmi dan tanggal pendakian (dengan indikator status kuota).
- **Step 2: Identitas Rombongan:** Form NIK valid, nama lengkap, kontak darurat, serta jumlah rombongan (minimal 2-3 orang sesuai regulasi keselamatan).
- **Step 3: Skrining Kesiapan:** Checklist perlengkapan dasar (tenda, kantong tidur, P3K, matras).
- **Step 4: Jasa Porter Lokal Warga (Add-On):** Opsi menambahkan porter lokal berlisensi basecamp untuk mendukung ekonomi desa.
- **Step 5: Checkout & Simulasi Bayar:** Ringkasan biaya tiket masuk PNBP + asuransi + porter, dengan tombol bayar simulasi instan yang langsung mengarahkan ke `ticket.html`.

### 4.3 Halaman E-Tiket & Pusat Mitigasi Cuaca (`ticket.html`)
- **Tampilan Tiket Resmi:**
  - Header berlogo resmi Taman Nasional & SummitGuard.
  * Barcode & QR Code digital unik dengan format token yang dapat diverifikasi offline di pos atas.
  * Kartu status: Hijau (*Siap Naik*), Merah (*Peringatan Badai BMKG*), Oranye (*Risiko Tinggi Disetujui*), Biru (*Jadwal Ulang Berhasil*), Abu-abu (*Dibatalkan & Direfund*).
- **Banner Peringatan Dini Cuaca BMKG (Jika Terjadi Badai):**
  - Tampilan visual peringatan darurat dengan parameter angin, curah hujan, dan pesan imbauan resmi basecamp.
  - Kartu 3 Opsi Mitigasi dengan tombol pemicu masing-masing modal.
- **Modal 1: Tetap Naik (*High-Risk Proceed*)**
  - Pernyataan pelepasan tanggung jawab (*Liability Waiver*).
  - Verifikasi checklist alat badai ekstra (storm tent, ponco ganda, logistik cadangan 24 jam).
  - Submit: Update status tiket menjadi `HIGH_RISK_APPROVED`, tambahkan nomor hotline evakuasi ranger.
- **Modal 2: Reschedule Tanggal (*Free Reschedule*)**
  - Kalender dinamis 30 hari ke depan, menandai tanggal yang aman dan kuotanya tersedia.
  - Bebas biaya penalti (Rp 0).
  - Submit: Perbarui tanggal tiket, generate ulang QR Code, status menjadi `RESCHEDULED`.
- **Modal 3: Refund Dana 100% (*Full Refund*)**
  - Informasi jaminan pengembalian dana 100% karena faktor cuaca buruk alam (*force majeure*).
  - Pilihan bank tujuan atau e-wallet beserta nomor rekening.
  - Submit: Terbitkan nomor voucher pengembalian dana, ubah status tiket menjadi `CANCELLED_REFUNDED`.

### 4.4 Panel Pengontrol Simulasi BMKG (`admin.html`)
- Disediakan khusus untuk keperluan demonstrasi dosen/penguji:
  - Tombol Toggle Status Cuaca BMKG: **Cuaca Normal (Aman)** vs **Cuaca Buruk / Badai Tropis Ekstrem**.
  - Dropdown untuk memilih gunung mana yang terkena dampak cuaca buruk.
  - Tombol **"Reset Data Demo"** untuk mengembalikan data pemesanan ke kondisi awal sewaktu-waktu.
  - Tombol cepat untuk langsung beralih melihat dampak perubahan di `ticket.html`.

---

## 5. Rencana Pengujian & Verifikasi

1. **Uji Reservasi Normal:** Melakukan booking dari `booking.html`, memastikan data tersimpan di `localStorage` dan e-tiket berhasil terbit di `ticket.html` dengan status `CONFIRMED`.
2. **Uji Simulasi Peringatan BMKG:** Mengubah cuaca di `admin.html` menjadi "Badai Ekstrem", membuka `ticket.html`, dan memastikan banner waspada merah serta 3 tombol opsi muncul.
3. **Uji Opsi 1 (Tetap Naik):** Menyelesaikan modal pakta integritas dan memeriksa perubahan status tiket menjadi `HIGH_RISK_APPROVED`.
4. **Uji Opsi 2 (Reschedule):** Memilih tanggal baru, memastikan tanggal tiket terbarui tanpa biaya dan status menjadi `RESCHEDULED`.
5. **Uji Opsi 3 (Refund):** Mengisi data pengembalian dana, memastikan kalkulasi 100% tepat dan status tiket berubah menjadi `CANCELLED_REFUNDED`.
6. **Uji Responsivitas & Cetak:** Memastikan tampilan rapi baik di layar desktop maupun layar ponsel pintar (*mobile friendly*), serta fitur Cetak PDF Tiket berjalan optimal.
