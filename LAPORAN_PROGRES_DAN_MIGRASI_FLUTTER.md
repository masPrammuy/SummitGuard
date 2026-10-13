# LAPORAN KEMAJUAN TUGAS AKHIR / SKRIPSI
## PENGEMBANGAN SISTEM MANAJEMEN SIMAKSI TERINTEGRASI PERINGATAN DINI CUACA BMKG DAN PROTOKOL MITIGASI RISIKO BENCANA (SUMMITGUARD)
### Serta Rencana Strategis Migrasi Aplikasi ke Platform Mobile Flutter

---

| Informasi Dokumen | Keterangan |
|---|---|
| **Topik Penelitian / Proyek** | Sistem Informasi Manajemen Pendakian Gunung & Mitigasi Bencana Berbasis Cloud |
| **Nama Sistem** | **SummitGuard** |
| **Penyusun / Mahasiswa** | masPrammuy |
| **Repositori Sumber Kode** | [https://github.com/masPrammuy/SummitGuard](https://github.com/masPrammuy/SummitGuard) |
| **Status Sistem Saat Ini** | **Tahap I (Web Prototype & Cloud Backend) Telah Selesai 100% dan Terverifikasi** |
| **Target Pengembangan Berikutnya** | **Tahap II (Migrasi ke Mobile Multiplatform Flutter & Pengujian Usabilitas)** |
| **Tanggal Laporan** | Oktober 2026 |

---

## RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

Laporan ini disusun sebagai bentuk pertanggungjawaban kemajuan (*progress report*) kepada Dosen Pembimbing mengenai pengembangan sistem **SummitGuard**. 

Sistem ini dirancang untuk menjawab permasalahan tingginya angka kecelakaan pendaki di kawasan konservasi Indonesia (studi kasus: Gn. Merbabu, Gn. Prau, Gn. Gede Pangrango) akibat anomali cuaca ekstrem pegunungan dan ketiadaan mekanisme mitigasi perizinan yang fleksibel.

Hingga saat ini, sistem **Tahap I (Arsitektur Web & Cloud Database Supabase)** telah berhasil diselesaikan secara utuh, mencakup:
1. **Otentikasi Pengguna & Keamanan Terpadu:** Integrasi Supabase Auth dengan **Google OAuth 2.0** (dilengkapi pemaksa pemilih akun `prompt: 'select_account'`) dan sistem sandi terenkripsi, dilindungi oleh *Strict Auth Gate* di seluruh halaman.
2. **Katalog Gunung & Kuota Terintegrasi BMKG:** Monitoring daya dukung lingkungan (*carrying capacity*), kuota harian, serta indikator cuaca *real-time*.
3. **Pendaftaran SIMAKSI 5-Tahap:** Form perizinan multi-tahap dengan validasi keselamatan ketat (manifest rombongan minimal 2 orang, skrining SOP peralatan badai gunung, dan pemberdayaan porter lokal).
4. **E-Tiket Digital & Offline SVG QR Code:** Tiket elektronik dengan QR code berbasis vektor yang dapat divalidasi oleh petugas lapangan secara *offline* tanpa memerlukan koneksi internet.
5. **Protokol Mitigasi 3 Opsi Peringatan Dini BMKG (*Novelty Feature*):** Ketika BMKG merilis peringatan badai, pendaki diberikan 3 opsi berkeadilan:
   - *Opsi 1 (Proceed High-Risk):* Tetap mendaki dengan menandatangani surat pernyataan risiko tinggi (*digital liability waiver*) dan aktivasi koordinat SAR.
   - *Opsi 2 (Free Reschedule):* Pindah tanggal pendakian dalam 30 hari ke depan bebas denda (Rp 0).
   - *Opsi 3 (Full Refund 100%):* Pengembalian dana penuh disertai pemulihan kuota harian konservasi secara otomatis di basis data.
6. **Panel Ranger & Simulasi Bencana BMKG:** Dasbor petugas pengelola untuk memantau status tiket pendaki dan menyimulasikan cuaca darurat.
7. **Jaminan Kualitas Sistem:** Telah divalidasi dengan **84 automated unit & integration test suites (100% Pass, 0 Failure, 0 Error)**, aman dari celah DOM XSS, open-redirect, dan kebocoran data dengan *PostgreSQL Row Level Security (RLS)*.

Sebagai rencana ke depan yang disetujui dalam lingkup skripsi, aplikasi ini direncanakan untuk **dimigrasikan ke platform mobile Flutter (Android/iOS)**. Backend Supabase yang telah dibangun saat ini akan langsung digunakan kembali (*reusable cloud backend*) tanpa perlu merombak basis data.

---

## BAB I: CAPAIAN DAN STATUS PROGRES SISTEM SAAT INI

### 1.1 Arsitektur Sistem Tahap I (Web & Cloud Architecture)

Sistem Tahap I dibangun menggunakan pendekatan modern yang ringan, cepat, dan tangguh:
- **Frontend Layer:** Multi-Page Application (MPA) berbasis HTML5 Semantik, Tailwind CSS (Design System bernuansa *Alpine Emerald* dan *Slate Forest*), dan Vanilla JavaScript (Modular UMD Pattern).
- **Backend & Database Layer:** **Supabase Cloud PostgreSQL Database**, terkelola secara relasional dengan *Row Level Security* (RLS) dan *Automated Triggers*.
- **Authentication Service:** Supabase Auth terintegrasi dengan Google Cloud Console (OAuth 2.0 Client ID) dan Email-Password Authentication.
- **Offline Fallback Architecture:** *Resilience Layer* pada `js/store.js` yang memungkinkan aplikasi tetap berjalan normal menggunakan `localStorage` jika jaringan internet terputus di area pegunungan, serta menyinkronkan data secara otomatis saat koneksi pulih (*optimistic synchronization*).
- **Hosting & Distribusi:** Vercel Global Edge Network dengan *clean routing* via `vercel.json`.

```
                    ┌──────────────────────────────────────────────┐
                    │               SUMMITGUARD WEB                │
                    │   index.html | booking.html | ticket.html    │
                    │        admin.html | login.html               │
                    └──────────────────────┬───────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
             ┌─────────────────────┐               ┌─────────────────────┐
             │   js/auth-guard.js  │               │     js/store.js     │
             │   (Strict Security) │               │   (Dual Sync Store) │
             └──────────┬──────────┘               └──────────┬──────────┘
                        │                                     │
                        ▼                                     ▼
             ┌─────────────────────────────────────────────────────────┐
             │                   js/supabase-client.js                 │
             └────────────────────────────┬────────────────────────────┘
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
         ┌─────────────────────────┐               ┌─────────────────────────┐
         │     Supabase Auth       │               │   PostgreSQL Database   │
         │ (Google OAuth & Email)  │               │ (profiles, mountains,   │
         │                         │               │  bookings, RLS Policies)│
         └─────────────────────────┘               └─────────────────────────┘
```

---

### 1.2 Rincian Modul yang Telah Selesai 100%

#### A. Modul Otentikasi & Gerbang Keamanan (`login.html`, `js/login.js`, `js/auth-guard.js`)
1. **Strict Auth Gate:** Mencegah akses ilegal ke halaman utama, booking, tiket, maupun admin. Pengguna yang belum terautentikasi langsung dicegat dan dialihkan ke `/login?redirect=<url_tujuan>`.
2. **Google OAuth 2.0:** Integrasi dengan Google Identity API menggunakan parameter `prompt: 'select_account'`. Fitur ini memastikan pemilih akun (*account chooser*) selalu muncul di peramban, memungkinkan pendaki berganti akun dengan mudah.
3. **Keamanan Ekstra:** Sanitasi input pencegah serangan DOM XSS, pencegah Open Redirect Vulnerability, serta pembersihan elemen-elemen simulasi sesuai kaidah aplikasi produksi (tidak ada tombol *bypass/demo login*).

#### B. Modul Katalog Wisata Gunung & Monitoring Kuota (`index.html`, `js/home.js`)
1. Informasi komprehensif gunung konservasi: Gunung Merbabu (3.145 mdpl), Gunung Prau (2.565 mdpl), dan Gunung Gede Pangrango (2.958 mdpl).
2. Tampilan sisa kuota dengan indikator visual persentase kapasitas daya dukung lingkungan (*carrying capacity*).
3. Status cuaca BMKG terintegrasi (*Normal* vs *Siaga Badai Ekstrem*).
4. Pencarian instan riwayat e-tiket berdasarkan Kode Booking (*Quick Ticket Lookup*).

#### C. Modul Reservasi SIMAKSI 5-Tahap (`booking.html`, `js/booking.js`)
1. **Langkah 1 (Jalur & Tanggal):** Pemilihan basecamp resmi dan tanggal pendakian dengan kalkulasi durasi otomatis.
2. **Langkah 2 (Data Ketua Rombongan):** Pengisian data identitas penanggung jawab rombongan (Nama Lengkap, NIK/Paspor, No HP, Kontak Darurat).
3. **Langkah 3 (Manifest Anggota):** Validasi keselamatan wajib minimal rombongan 2 orang (sesuai SOP Taman Nasional untuk menghindari pendakian solo yang berbahaya).
4. **Langkah 4 (Skrining SOP Peralatan Badai & Porter):** Checklist kelayakan peralatan wajib (Tenda tahan angin, Sleeping Bag suhu ekstrem, Jas hujan waterproof, Kompor & logistik darurat) serta opsi penambahan jasa porter lokal lereng gunung.
5. **Langkah 5 (Konfirmasi & Pembayaran):** Rincian biaya transparan (tiket masuk, asuransi pendakian, porter) dan penerbitan kode reservasi otomatis format `SG-[GUNUNG]-[TANGGAL]-[KODE]`.

#### D. Modul E-Tiket Digital & Protokol 3 Mitigasi Bencana (`ticket.html`, `js/ticket.js`)
1. **Digital Boarding Pass:** Menampilkan status legalitas SIMAKSI, data manifest pendaki, dan rincian basecamp.
2. **Offline SVG QR Code:** QR Code dibuat langsung secara dinamis menggunakan modul aljabar matriks SVG lokal tanpa bergantung pada API pihak ketiga, sehingga tiket dapat divalidasi oleh petugas ranger di tengah hutan walau tanpa sinyal.
3. **Peringatan Siaga Badai BMKG & 3 Opsi Mitigasi:**
   - **Opsi 1 (Proceed High-Risk):** Digunakan jika pendaki memiliki kesiapan teknis tinggi. Pendaki diwajibkan menyetujui *Liability Waiver* digital, mencatat nomor darurat SAR, dan tiket diberi status khusus `HIGH_RISK_APPROVED`.
   - **Opsi 2 (Free Reschedule):** Pendaki dapat memilih tanggal baru dalam kurun waktu 30 hari ke depan dengan biaya Rp 0 (tiket diperbarui dengan status `RESCHEDULED`).
   - **Opsi 3 (Full Refund 100%):** Pembatalan resmi dengan pengembalian dana 100% tanpa potongan administrasi. Sistem secara otomatis memulihkan sisa kuota gunung pada tanggal terkait (`remaining_quota + members_count`) di database.

#### E. Modul Pengelola Basecamp / Ranger (`admin.html`, `js/admin.js`)
1. **Panel Kontrol Simulasi BMKG:** Pengelola dapat mengubah status cuaca gunung (Normal vs Badai Ekstrem) untuk menguji respons sistem dan keselamatan jalur.
2. **Monitoring Status Tiket Real-Time:** Menampilkan daftar pendaki yang sedang mendaki, yang memilih tetap naik dengan resiko tinggi, serta pendaki yang melakukan penjadwalan ulang atau *refund*.

---

## BAB II: HASIL VERIFIKASI DAN JAMINAN KUALITAS SISTEM (TESTING EVIDENCE)

Untuk menjamin keandalan sistem sebelum dipresentasikan dan diuji dalam sidang, telah dilakukan pengujian otomatis (*Automated Unit & Integration Testing*) menggunakan pustaka `unittest` Python.

### 2.1 Ringkasan Hasil Pengujian Otomatis (84/84 Tests PASS)

```
Test Execution Command : python -m unittest discover -s tests -p "test_*.py"
Execution Duration     : 1.622 detik
Total Test Suites      : 13 Berkas Uji
Total Assertions       : 84 Kasus Uji
Status Akhir           : 100% PASS (0 Failures, 0 Errors)
```

| No | Berkas Test Suite | Cakupan Komponen yang Diuji | Jumlah Tes | Hasil |
|:---:|---|---|:---:|:---:|
| 1 | `test_store.py` | State management, kalkulasi tarif, pemulihan kuota saat mitigasi refund | 10 | **PASS** |
| 2 | `test_assets.py` | Validasi CSS Tailwind, layout e-tiket perforated, media query cetak | 6 | **PASS** |
| 3 | `test_home.py` | Render katalog gunung, badge status BMKG, form quick ticket lookup | 6 | **PASS** |
| 4 | `test_booking.py` | 5-step form SIMAKSI, validasi manifest rombongan, sanitasi anti-XSS | 6 | **PASS** |
| 5 | `test_ticket.py` | Render e-tiket, SVG QR Code generator, 3 modal aksi mitigasi badai | 6 | **PASS** |
| 6 | `test_admin.py` | Simulasi toggle BMKG (Normal vs Badai), live monitor status tiket | 6 | **PASS** |
| 7 | `test_e2e_integration.py` | Navigasi antar-halaman web, HTTP 200 server response static | 2 | **PASS** |
| 8 | `test_bmkg_service.py` | Format payload BMKG weather service, threshold kecepatan angin | 4 | **PASS** |
| 9 | `test_supabase_client.py` | Multi-target UMD SDK wrapper, Google OAuth prompt, local fallback | 12 | **PASS** |
| 10 | `test_auth_guard.py` | Intersepsi akses tanpa login, sanitasi widget profil, Promise handling | 9 | **PASS** |
| 11 | `test_login.py` | Tab Masuk vs Daftar, validasi sandi, proteksi open redirect | 9 | **PASS** |
| 12 | `test_store_supabase.py` | Sinkronisasi data ke PostgreSQL Supabase, sanitasi UUID RFC-4122 | 11 | **PASS** |
| 13 | `test_vercel_e2e.py` | Validasi rute bersih (`cleanUrls`) Vercel tanpa ekstensi `.html` | 3 | **PASS** |
| **TOTAL** | **13 Berkas Test Suite** | **Pengujian Komprehensif Seluruh Fitur Sistem** | **84** | **100% PASS** |

### 2.2 Uji Keamanan dan Integritas Basis Data
1. **Pencegahan Cross-Site Scripting (DOM XSS):** Semua data input pendaki (nama anggota, NIK, alamat) disanitasi secara ketat menggunakan fungsi `escapeHtml()` sebelum di-render ke antarmuka DOM.
2. **Proteksi Open-Redirect:** URL pengalihan pasca-login divalidasi hanya boleh mengarah ke domain aplikasi yang sah (*same origin validation*).
3. **Row Level Security (RLS) PostgreSQL:** Pada tabel `bookings`, pengguna hanya memiliki hak akses baca dan ubah terhadap data reservasi miliknya sendiri (`auth.uid() = user_id`), sehingga privasi data pendaki terjamin secara kriptografis di tingkat basis data.
4. **Validasi Tipe Data UUID:** Sinkronisasi cloud dilengkapi filter format regex RFC 4122 untuk mencegah galat PostgreSQL `22P02 (invalid input syntax for type uuid)`.

---

## BAB III: BLUEPRINT DAN RENCANA STRATEGIS MIGRASI KE FLUTTER

### 3.1 Urgensi & Alasan Akademis Migrasi ke Mobile Flutter
1. **Karakteristik Lapangan (Outdoor & Offline-First):**
   Pendaki gunung dan ranger balai taman nasional beroperasi di wilayah dengan sinyal seluler terbatas. Aplikasi mobile berbasis Flutter memungkinkan arsitektur *local-first persistence* yang jauh lebih tangguh (menggunakan Isar/Hive/SQLite) dibanding browser web mobile.
2. **Akses Perangkat Keras Asli (Native Hardware Capabilities):**
   - **Kamera Petugas Basecamp:** Ranger memerlukan pemindai kamera instan (*Camera QR Scanner*) untuk validasi tiket di pos pemeriksaan tanpa perlu membuka browser.
   - **Background Geolocation & Push Notification:** Memungkinkan pengiriman peringatan dini badai BMKG seketika (*instant alert*) melalui notifikasi ponsel bahkan saat aplikasi tidak sedang dibuka di latar depan.
3. **Single Codebase & Konsistensi UI:**
   Flutter memungkinkan pengembangan satu basis kode (Dart) untuk langsung menghasilkan aplikasi Android (.apk/.aab) dan iOS (.ipa) dengan performa grafis tinggi (*60/120 FPS Impeller Engine*).
4. **Efisiensi Pengembangan:**
   Backend Supabase yang telah dibangun (Auth, PostgreSQL DB, Trigger, RLS) **100% kompatibel dan langsung siap pakai** dengan pustaka resmi `supabase_flutter`. Tidak ada restrukturisasi backend yang diperlukan.

---

### 3.2 Arsitektur Target Aplikasi Mobile (Clean Architecture / Feature-First)

Aplikasi Flutter SummitGuard akan mengadopsi arsitektur terstruktur standar industri:

```
lib/
├── core/
│   ├── constants/             # Warna (Alpine Emerald), Dimensi, Asset Paths
│   ├── network/               # Supabase Client Provider & Network Checker
│   ├── theme/                 # Tema Material 3 Light & Dark Mode
│   └── utils/                 # QR Code Generator, Format Tanggal ID, Format Rupiah
├── features/
│   ├── auth/                  # Otentikasi Email & Google Sign-In Native
│   │   ├── data/              # AuthRepositoryImpl, SupabaseAuthDataSource
│   │   ├── domain/            # UserEntity, LoginUseCase, RegisterUseCase
│   │   └── presentation/      # LoginScreen, RegisterScreen, AuthBloc
│   ├── home/                  # Katalog Gunung & Status Cuaca BMKG
│   │   ├── data/              # MountainRepositoryImpl
│   │   ├── domain/            # MountainEntity, WeatherEntity
│   │   └── presentation/      # HomeScreen, MountainCardWidget, WeatherBadgeWidget
│   ├── booking/               # Form Pendaftaran SIMAKSI 5-Tahap
│   │   ├── data/              # BookingRepositoryImpl
│   │   ├── domain/            # BookingEntity, CreateBookingUseCase
│   │   └── presentation/      # BookingStepperScreen, MemberFormWidget, SOPChecklistWidget
│   ├── ticket/                # E-Tiket Digital & Modal 3 Mitigasi BMKG
│   │   ├── data/              # MitigationRepositoryImpl
│   │   ├── domain/            # RescheduleUseCase, RefundUseCase, WaiverUseCase
│   │   └── presentation/      # TicketScreen, OfflineQrWidget, MitigationDialogs
│   └── ranger/                # Panel Ranger & QR Scanner Lapangan
│       └── presentation/      # RangerDashboardScreen, QrScannerScreen
└── main.dart                  # Entry Point & Inisialisasi Supabase
```

---

### 3.3 Spesifikasi Dependensi Flutter (`pubspec.yaml`)

Berikut adalah pustaka utama yang akan digunakan pada proyek Flutter SummitGuard:

```yaml
name: summitguard
description: Sistem Manajemen SIMAKSI Terintegrasi BMKG & Mitigasi Risiko Badai
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # Backend & Cloud Integration (Supabase Resmi)
  supabase_flutter: ^2.5.6
  
  # State Management
  flutter_bloc: ^8.1.6
  equatable: ^2.0.5
  
  # Routing & Navigasi
  go_router: ^14.2.0
  
  # Local Storage & Offline Cache
  shared_preferences: ^2.2.3
  hive_flutter: ^1.1.0
  
  # UI & Media
  google_fonts: ^6.2.1
  flutter_svg: ^2.0.10+1
  cached_network_image: ^3.3.1
  intl: ^0.19.0
  
  # Tiket & Hardware Lapangan
  qr_flutter: ^4.1.0            # Generate QR Code Tiket Offline
  mobile_scanner: ^5.1.1        # Scanner Kamera Ranger Basecamp
  
  # Notifikasi Peringatan Dini BMKG
  flutter_local_notifications: ^17.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  mocktail: ^1.0.4
  bloc_test: ^9.1.7
```

---

### 3.4 Pemetaan Model Data Dart (Sesuai Skema Supabase Saat Ini)

Model data Dart dirancang agar presisi dengan kolom PostgreSQL Supabase:

#### A. Model Gunung (`MountainModel`)
```dart
class MountainModel {
  final String id;
  final String name;
  final String elevation;
  final String province;
  final List<String> basecamps;
  final int dailyQuota;
  final int remainingQuota;
  final int ticketPrice;
  final Map<String, dynamic> weather;

  MountainModel({
    required this.id,
    required this.name,
    required this.elevation,
    required this.province,
    required this.basecamps,
    required this.dailyQuota,
    required this.remainingQuota,
    required this.ticketPrice,
    required this.weather,
  });

  factory MountainModel.fromJson(Map<String, dynamic> json) {
    return MountainModel(
      id: json['id'] as String,
      name: json['name'] as String,
      elevation: json['elevation'] as String,
      province: json['province'] as String,
      basecamps: List<String>.from(json['basecamps'] ?? []),
      dailyQuota: json['daily_quota'] as int? ?? 400,
      remainingQuota: json['remaining_quota'] as int? ?? 400,
      ticketPrice: json['ticket_price'] as int? ?? 25000,
      weather: json['weather'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'elevation': elevation,
    'province': province,
    'basecamps': basecamps,
    'daily_quota': dailyQuota,
    'remaining_quota': remainingQuota,
    'ticket_price': ticketPrice,
    'weather': weather,
  };
}
```

#### B. Model Tiket SIMAKSI (`BookingModel`)
```dart
class BookingModel {
  final String id;
  final String? userId;
  final String mountainId;
  final String mountainName;
  final String basecamp;
  final String climbDate;
  final int durationDays;
  final Map<String, dynamic> leader;
  final int membersCount;
  final List<dynamic> members;
  final Map<String, dynamic> addons;
  final int totalPayment;
  final String status;
  final String? mitigationChoice;
  final bool highRiskWaiverSigned;
  final String? rescheduledFrom;
  final Map<String, dynamic>? refundDetails;
  final String createdAt;

  BookingModel({
    required this.id,
    this.userId,
    required this.mountainId,
    required this.mountainName,
    required this.basecamp,
    required this.climbDate,
    this.durationDays = 2,
    required this.leader,
    required this.membersCount,
    required this.members,
    required this.addons,
    required this.totalPayment,
    required this.status,
    this.mitigationChoice,
    this.highRiskWaiverSigned = false,
    this.rescheduledFrom,
    this.refundDetails,
    required this.createdAt,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] as String,
      userId: json['user_id'] as String?,
      mountainId: json['mountain_id'] as String,
      mountainName: json['mountain_name'] as String,
      basecamp: json['basecamp'] as String,
      climbDate: json['climb_date'] as String,
      durationDays: json['duration_days'] as int? ?? 2,
      leader: json['leader'] as Map<String, dynamic>? ?? {},
      membersCount: json['members_count'] as int? ?? 1,
      members: json['members'] as List<dynamic>? ?? [],
      addons: json['addons'] as Map<String, dynamic>? ?? {},
      totalPayment: json['total_payment'] as int? ?? 0,
      status: json['status'] as String? ?? 'CONFIRMED',
      mitigationChoice: json['mitigation_choice'] as String?,
      highRiskWaiverSigned: json['high_risk_waiver_signed'] as bool? ?? false,
      rescheduledFrom: json['rescheduled_from'] as String?,
      refundDetails: json['refund_details'] as Map<String, dynamic>?,
      createdAt: json['created_at'] as String? ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'user_id': userId,
    'mountain_id': mountainId,
    'mountain_name': mountainName,
    'basecamp': basecamp,
    'climb_date': climbDate,
    'duration_days': durationDays,
    'leader': leader,
    'members_count': membersCount,
    'members': members,
    'addons': addons,
    'total_payment': totalPayment,
    'status': status,
    'mitigation_choice': mitigationChoice,
    'high_risk_waiver_signed': highRiskWaiverSigned,
    'rescheduled_from': rescheduledFrom,
    'refund_details': refundDetails,
  };
}
```

---

### 3.5 Roadmap Tahapan Migrasi ke Flutter (Sprint Breakdown)

Rencana migrasi dirancang dalam 5 Sprint terstruktur:

```
[Sprint 1: Fondasi & Auth] ──► [Sprint 2: Katalog & SIMAKSI] ──► [Sprint 3: Tiket & Mitigasi] ──► [Sprint 4: Fitur Native] ──► [Sprint 5: Evaluasi]
      (2 Minggu)                     (2 Minggu)                     (2 Minggu)                    (2 Minggu)                 (1 Minggu)
```

| Sprint | Fokus Pengembangan | Rincian Deliverable | Estimasi |
|:---:|---|---|:---:|
| **Sprint 1** | Setup Proyek & Otentikasi Supabase | - Inisialisasi struktur Clean Architecture di Flutter.<br>- Integrasi `supabase_flutter` dengan kredensial aktif.<br>- Implementasi layar Login & Register.<br>- Google Sign-In native menggunakan OAuth redirect. | 2 Minggu |
| **Sprint 2** | Katalog Gunung & SIMAKSI Stepper | - Tampilan Katalog Gunung & Status Cuaca BMKG.<br>- Validasi kuota harian & kapasitas carrying capacity.<br>- Form multi-langkah SIMAKSI (Rombongan min 2 orang).<br>- Skrining SOP badai & pemesanan jasa porter lokal. | 2 Minggu |
| **Sprint 3** | E-Tiket & 3 Alur Mitigasi Badai | - Generate QR Code offline menggunakan `qr_flutter`.<br>- Tampilan boarding pass perforated.<br>- Banner Siaga Badai BMKG.<br>- 3 Modal Aksi Mitigasi: Proceed High-Risk (Waiver), Reschedule (Rp 0), Refund 100% (Pemulihan kuota). | 2 Minggu |
| **Sprint 4** | Fitur Native Hardware & Petugas | - Scanner Kamera QR Code untuk Ranger Basecamp (`mobile_scanner`).<br>- Offline persistence caching tiket menggunakan `Hive`.<br>- Notifikasi peringatan badai BMKG lokal (`flutter_local_notifications`). | 2 Minggu |
| **Sprint 5** | Pengujian & Penyusunan Skripsi | - Pengujian Unit & Widget Test di Flutter.<br>- Uji Usabilitas (*System Usability Scale / SUS*) kepada calon pendaki dan ranger.<br>- Penyusunan Bab IV & Bab V Laporan Skripsi. | 1 Minggu |

---

## BAB IV: REKOMENDASI TOPIK KONSULTASI DENGAN DOSEN PEMBIMBING

Untuk sesi bimbingan berikutnya, berikut adalah agenda dan poin diskusi strategis yang dapat dikonsultasikan:

1. **Konfirmasi Ruang Lingkup Skripsi (*Scope Confirmation*):**
   - Melaporkan bahwa prototipe web dan basis data cloud Supabase telah 100% tuntas dan lulus 84 pengujian.
   - Mengonfirmasi apakah dosen menyetujui tahap berikutnya adalah pembangunan aplikasi mobile Flutter untuk pendaki dan petugas basecamp.
2. **Metodologi Pengujian Usabilitas (*Usability Testing*):**
   - Mengusulkan penggunaan kuesioner **System Usability Scale (SUS)** kepada minimal 20-30 responden (anggota organisasi pecinta alam / Mapala dan pendaki umum) untuk mengukur tingkat kemudahan penggunaan 3 opsi mitigasi badai.
3. **Mekanisme Uji Simulasi BMKG saat Sidang:**
   - Meminta arahan mengenai presentasi saat sidang: Apakah demonstrasi cukup menggunakan panel simulasi pengelola (`admin.html` / panel ranger) untuk memperagakan transisi status Normal $\rightarrow$ Badai Ekstrem $\rightarrow$ Pilihan Mitigasi Tiket.
4. **Validasi Surat Pernyataan Risiko (*Liability Waiver*):**
   - Mendiskusikan aspek legalitas digital pada Opsi 1 (*Proceed High Risk*): pakta integritas dan rekam jejak digital nomor darurat sebagai kontribusi keilmuan manajemen risiko pendakian.

---

## LAMPIRAN: PANDUAN RUNNING & DEMO SISTEM WEB SAAT INI

Jika Dosen Pembimbing ingin langsung melihat demo sistem web yang telah berjalan:

1. **Akses Langsung Melalui Browser:**
   - Jalankan server lokal: `python -m http.server 8000`
   - Buka: `http://localhost:8000/login.html` (atau versi Vercel yang telah di-deploy).
2. **Skenario Demo Praktis untuk Bimbingan:**
   - **Step 1:** Buka `login.html`, klik **"Lanjutkan dengan Google"** (pilih akun Google Anda).
   - **Step 2:** Masuk ke Dashboard `index.html`, pilih Gunung Merbabu $\rightarrow$ klik **"Daftar SIMAKSI"**.
   - **Step 3:** Lengkapi pendaftaran 5 tahap (minimal 2 anggota, checklist SOP badai) $\rightarrow$ klik **"Konfirmasi & Bayar"**.
   - **Step 4:** Buka e-tiket di `ticket.html`. Tunjukkan QR Code offline yang telah terbentuk.
   - **Step 5:** Buka tab baru ke `admin.html`, klik tombol **"Set Badai Ekstrem"** pada Gunung Merbabu.
   - **Step 6:** Kembali ke tab `ticket.html` dan refresh $\rightarrow$ Tunjukkan Banner Siaga Merah BMKG serta demonstrasikan 3 opsi mitigasi (*Proceed Waiver*, *Reschedule Rp 0*, atau *Refund 100%*).

---
*Dokumen ini disusun secara otomatis berdasarkan basis kode SummitGuard yang telah terverifikasi penuh (84/84 Tests Passed).*
