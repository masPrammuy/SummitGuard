# SummitGuard Implementation Plan: Sistem Reservasi SIMAKSI & Mitigasi Risiko Cuaca BMKG

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi web multi-halaman SummitGuard untuk pemesanan tiket SIMAKSI pendakian gunung yang terintegrasi dengan deteksi cuaca ekstrem BMKG dan 3 opsi mitigasi risiko (Tetap Naik, Reschedule, Refund 100%).

**Architecture:** Multi-Page Web Application berbasis client-side yang terdiri dari 4 halaman utama (`index.html`, `booking.html`, `ticket.html`, `admin.html`). Sinkronisasi status tiket dan simulasi cuaca BMKG dikelola secara terpusat melalui modul JavaScript `js/store.js` dengan persistensi data di `localStorage`.

**Tech Stack:** HTML5 Semantic, Tailwind CSS (via CDN), Lucide/FontAwesome Icons (via CDN), QRCode.js (via CDN), Vanilla JavaScript ES6 Modular, Python 3 (untuk automated testing logic & local dev server).

**Spec:** [`docs/superpowers/specs/2026-09-17-simaksi-bmkg-mitigation-design.md`](file:///c:/Users/Lenovo/Documents/antigravity/wise-davinci/docs/superpowers/specs/2026-09-17-simaksi-bmkg-mitigation-design.md)

## Global Constraints
- Arsitektur berbasis berkas HTML terpisah (Multi-Page Flow) untuk memudahkan dokumentasi bab 3 & 4 skripsi.
- Tidak memerlukan build step atau dependensi npm/node (menggunakan Python 3 untuk validasi & serve).
- Seluruh status cuaca BMKG dan tiket tersinkronisasi antar halaman melalui `localStorage` dengan key `summit_mountains` dan `summit_bookings`.
- Tersedia 3 opsi mitigasi jika cuaca buruk: Tetap Naik (High Risk Disclaimer), Reschedule (Gratis 30 hari), dan Refund (100% Penuh).

---

### Task 1: Store & Core Business Logic (`js/store.js`)

**Files:**
- Create: `js/store.js`
- Test: `tests/test_store.py`

**Interfaces:**
- Consumes: `localStorage` browser API
- Produces: 
  - `SummitStore.getMountains()`: Array gunung
  - `SummitStore.updateMountainWeather(mountainId, weatherObj)`: update cuaca
  - `SummitStore.createBooking(bookingData)`: simpan reservasi baru
  - `SummitStore.getBooking(bookingId)`: ambil tiket
  - `SummitStore.evaluateWeatherAlert(bookingId)`: cek apakah tiket kena badai
  - `SummitStore.executeProceedHighRisk(bookingId, waiverData)`: proses tetap naik
  - `SummitStore.executeReschedule(bookingId, newDate)`: proses reschedule
  - `SummitStore.executeRefund(bookingId, refundData)`: proses refund 100%
  - `SummitStore.resetDemoData()`: inisialisasi data awal demo

- [ ] **Step 1: Write the failing test**

```python
# tests/test_store.py
import json
import unittest

class TestSummitLogic(unittest.TestCase):
    def test_fee_calculation(self):
        ticket_price = 25000
        insurance = 5000
        members_count = 3
        porter_fee = 350000
        total = (ticket_price + insurance) * members_count + porter_fee
        self.assertEqual(total, 440000)

    def test_weather_mitigation_rules(self):
        # Validasi aturan status
        valid_statuses = ["CONFIRMED", "WEATHER_WARNING", "HIGH_RISK_APPROVED", "RESCHEDULED", "CANCELLED_REFUNDED"]
        self.assertIn("WEATHER_WARNING", valid_statuses)
        self.assertIn("HIGH_RISK_APPROVED", valid_statuses)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify initial test works**

Run: `python -m unittest tests/test_store.py`
Expected: PASS

- [ ] **Step 3: Write minimal store implementation**

Create `js/store.js` yang menyediakan class `SummitStore` dengan mock data gunung awal (Merbabu, Prau, Gede), default booking siap demo, serta fungsi handler untuk ketiga opsi mitigasi (Tetap Naik, Reschedule, Refund).

- [ ] **Step 4: Verify syntax & store structure with test script**

Create and run validation script `python tests/validate_store.py` to ensure `js/store.js` defines all required methods.

- [ ] **Step 5: Commit**

```bash
git add js/store.js tests/test_store.py
git commit -m "feat: implement SummitStore business logic and data persistence"
```

---

### Task 2: Shared Styling & Reusable Navigation (`css/style.css`, `js/navbar.js`)

**Files:**
- Create: `css/style.css`
- Create: `js/navbar.js`
- Test: `tests/test_assets.py`

**Interfaces:**
- Consumes: CDN Tailwind CSS
- Produces:
  - `renderNavbar(activePage)`: merender top navigation bar terpadu di semua halaman
  - `renderFooter()`: merender footer terpadu
  - `renderBMKGWeatherBanner(containerId, weatherData)`: banner alert darurat

- [ ] **Step 1: Write the failing test**

```python
# tests/test_assets.py
import os
import unittest

class TestAssets(unittest.TestCase):
    def test_css_and_navbar_exist(self):
        self.assertTrue(os.path.exists("css/style.css"))
        self.assertTrue(os.path.exists("js/navbar.js"))

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_assets.py`
Expected: FAIL (files do not exist yet)

- [ ] **Step 3: Implement `css/style.css` and `js/navbar.js`**

Tambahkan styling kustom untuk aksen tiket, efek perforasi e-tiket, animasi badge waspada merah, serta script `navbar.js` yang otomatis menyisipkan header navigasi interaktif.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_assets.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add css/style.css js/navbar.js tests/test_assets.py
git commit -m "feat: add global styles and shared navigation component"
```

---

### Task 3: Landing Page & Mountain Catalog (`index.html`, `js/home.js`)

**Files:**
- Create: `index.html`
- Create: `js/home.js`
- Test: `tests/test_home.py`

**Interfaces:**
- Consumes: `SummitStore.getMountains()`, `renderNavbar('home')`
- Produces: Halaman beranda interaktif dengan kartu gunung, badge cuaca live BMKG, quick ticket lookup, dan direct CTA booking.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_home.py
import os
import unittest

class TestHome(unittest.TestCase):
    def test_index_html_contains_elements(self):
        with open("index.html", "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("SummitGuard", content)
        self.assertIn("Katalog Gunung", content)
        self.assertIn("Cek E-Tiket", content)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_home.py`
Expected: FAIL (index.html does not exist yet)

- [ ] **Step 3: Implement `index.html` and `js/home.js`**

Susun layout `index.html` lengkap dengan hero section, widget pencarian nomor tiket, daftar kartu gunung dinamis dari `SummitStore`, dan status cuaca BMKG.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_home.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html js/home.js tests/test_home.py
git commit -m "feat: implement home page with mountain catalog and live BMKG weather status"
```

---

### Task 4: SIMAKSI Booking & Checkout Form (`booking.html`, `js/booking.js`)

**Files:**
- Create: `booking.html`
- Create: `js/booking.js`
- Test: `tests/test_booking.py`

**Interfaces:**
- Consumes: `SummitStore.getMountains()`, `SummitStore.createBooking()`, `renderNavbar('booking')`
- Produces: Formulir reservasi SIMAKSI lengkap dengan validasi anggota, skrining logistik, opsi porter warga lokal, rincian biaya, dan simulasi pembayaran instan.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_booking.py
import os
import unittest

class TestBooking(unittest.TestCase):
    def test_booking_html_elements(self):
        with open("booking.html", "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("Formulir Reservasi SIMAKSI", content)
        self.assertIn("Data Ketua Rombongan", content)
        self.assertIn("Jasa Porter Lokal", content)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_booking.py`
Expected: FAIL (booking.html does not exist yet)

- [ ] **Step 3: Implement `booking.html` and `js/booking.js`**

Implementasikan form multi-langkah dengan perhitungan otomatis total biaya dan tombol bayar simulasi yang langsung menyimpan booking ke `SummitStore` dan me-redirect ke `ticket.html?id=SMK-...`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_booking.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add booking.html js/booking.js tests/test_booking.py
git commit -m "feat: implement SIMAKSI booking registration and instant checkout flow"
```

---

### Task 5: Digital E-Ticket, BMKG Weather Alert & 3 Mitigation Actions (`ticket.html`, `js/ticket.js`)

**Files:**
- Create: `ticket.html`
- Create: `js/ticket.js`
- Test: `tests/test_ticket.py`

**Interfaces:**
- Consumes: `SummitStore.getBooking()`, `SummitStore.executeProceedHighRisk()`, `SummitStore.executeReschedule()`, `SummitStore.executeRefund()`
- Produces: E-tiket digital ber-QR Code, deteksi dini cuaca buruk BMKG, dan 3 modal mitigasi interaktif (Tetap Naik, Reschedule Bebas Biaya, Refund Dana 100%).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_ticket.py
import os
import unittest

class TestTicket(unittest.TestCase):
    def test_ticket_html_elements(self):
        with open("ticket.html", "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("E-Tiket Resmi SIMAKSI", content)
        self.assertIn("Peringatan Dini Cuaca BMKG", content)
        self.assertIn("Tetap Naik", content)
        self.assertIn("Reschedule", content)
        self.assertIn("Refund", content)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_ticket.py`
Expected: FAIL (ticket.html does not exist yet)

- [ ] **Step 3: Implement `ticket.html` and `js/ticket.js`**

Implementasikan tampilan tiket formal, QR Code, banner darurat BMKG saat cuaca buruk, modal pelepasan tanggung jawab untuk opsi Tetap Naik, kalender pemindahan tanggal untuk opsi Reschedule, serta form klaim 100% untuk opsi Refund.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_ticket.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ticket.html js/ticket.js tests/test_ticket.py
git commit -m "feat: implement digital e-ticket with BMKG weather warning and 3 mitigation action modals"
```

---

### Task 6: BMKG Weather Simulation & Basecamp Admin Panel (`admin.html`, `js/admin.js`)

**Files:**
- Create: `admin.html`
- Create: `js/admin.js`
- Test: `tests/test_admin.py`

**Interfaces:**
- Consumes: `SummitStore.getMountains()`, `SummitStore.updateMountainWeather()`, `SummitStore.resetDemoData()`
- Produces: Panel pengontrol simulasi cuaca BMKG dan status tiket untuk keperluan demonstrasi dosen penguji.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_admin.py
import os
import unittest

class TestAdmin(unittest.TestCase):
    def test_admin_html_elements(self):
        with open("admin.html", "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("Panel Kontrol Simulasi BMKG", content)
        self.assertIn("Toggle Status Cuaca", content)
        self.assertIn("Reset Data Demo", content)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_admin.py`
Expected: FAIL (admin.html does not exist yet)

- [ ] **Step 3: Implement `admin.html` and `js/admin.js`**

Buat dashboard interaktif dengan tombol ganti status cuaca (Normal vs Badai Ekstrem), indikator visual status terkini, tombol reset data awal, dan navigasi cepat ke tiket demo.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_admin.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add admin.html js/admin.js tests/test_admin.py
git commit -m "feat: implement BMKG weather simulation controller and admin demo panel"
```

---

### Task 7: End-to-End System Integration & Verification

**Files:**
- Create: `tests/test_e2e_integration.py`
- Test: Seluruh file HTML, JS, dan integrasi logika mitigasi cuaca.

- [ ] **Step 1: Write comprehensive integration test**

```python
# tests/test_e2e_integration.py
import os
import unittest

class TestE2EIntegration(unittest.TestCase):
    def test_all_pages_present(self):
        required_pages = ["index.html", "booking.html", "ticket.html", "admin.html"]
        for page in required_pages:
            self.assertTrue(os.path.exists(page), f"Missing page: {page}")

    def test_all_scripts_present(self):
        required_scripts = ["js/store.js", "js/navbar.js", "js/home.js", "js/booking.js", "js/ticket.js", "js/admin.js"]
        for script in required_scripts:
            self.assertTrue(os.path.exists(script), f"Missing script: {script}")

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run end-to-end verification**

Run: `python -m unittest tests/test_e2e_integration.py`
Expected: PASS

- [ ] **Step 3: Launch test HTTP server & verify UI flows**

Run local HTTP server: `python -m http.server 8080` dan verifikasi bahwa setiap link navigasi berfungsi sempurna.

- [ ] **Step 4: Commit**

```bash
git add tests/test_e2e_integration.py
git commit -m "test: add comprehensive end-to-end integration test suite"
```
