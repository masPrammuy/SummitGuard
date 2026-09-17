# Implementation Plan: Supabase Auth, Google OAuth, Cloud Database & Vercel Hosting

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan sistem otentikasi pengguna (Login, Register, Google OAuth) dengan Strict Auth Gate sebelum masuk ke dashboard/aplikasi utama, menghubungkan data ke database Supabase (PostgreSQL + RLS), dan menyiapkan konfigurasi hosting Vercel.

**Architecture:** Frontend Multi-Page yang terintegrasi dengan Supabase JavaScript Client SDK via CDN. Strict Auth Gate diimplementasikan via `js/auth-guard.js` pada semua halaman utama. Skema database PostgreSQL di cloud diatur melalui `supabase-setup.sql`. Routing dan deployment diatur melalui `vercel.json`.

**Tech Stack:** HTML5, Tailwind CSS, Supabase JS SDK v2 (via CDN), Google OAuth (Supabase Auth), PostgreSQL, Vercel Static Hosting, Python 3 (Unit Testing & local verification).

**Spec:** [`docs/superpowers/specs/2026-09-18-supabase-auth-db-vercel-design.md`](file:///c:/Users/Lenovo/Documents/antigravity/wise-davinci/docs/superpowers/specs/2026-09-18-supabase-auth-db-vercel-design.md)

## Global Constraints
- Strict Auth Gate: Halaman `index.html`, `booking.html`, `ticket.html`, dan `admin.html` wajib dicegat jika pengguna belum login, dan dialihkan ke `login.html?redirect=...`.
- Tombol demo login ditiadakan sepenuhnya di `login.html` (hanya email/password login, register, dan tombol Google OAuth).
- Supabase Client mendukung konfigurasi kredensial `SUPABASE_URL` dan `SUPABASE_ANON_KEY` dengan fallback lokal yang aman agar tidak crash jika offline.
- File `supabase-setup.sql` harus valid PostgreSQL dengan tabel `profiles`, `mountains`, `bookings`, trigger registrasi, dan RLS policies.
- File `vercel.json` harus valid JSON dan mendukung *clean URLs* dan *routes*.

---

### Task 1: Supabase Database Schema Script & Client Connector (`supabase-setup.sql`, `js/supabase-client.js`)

**Files:**
- Create: `supabase-setup.sql`
- Create: `js/supabase-client.js`
- Test: `tests/test_supabase_client.py`

**Interfaces:**
- Consumes: `@supabase/supabase-js` CDN
- Produces:
  - `SummitSupabase.initSupabase(url, key)`
  - `SummitSupabase.isConfigured()`
  - `SummitSupabase.register(email, password, metadata)`
  - `SummitSupabase.login(email, password)`
  - `SummitSupabase.loginWithGoogle()`
  - `SummitSupabase.logout()`
  - `SummitSupabase.getSession()`
  - `SummitSupabase.getUser()`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_supabase_client.py
import os
import unittest

class TestSupabaseClient(unittest.TestCase):
    def test_sql_and_client_exist(self):
        self.assertTrue(os.path.exists("supabase-setup.sql"))
        self.assertTrue(os.path.exists("js/supabase-client.js"))

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_supabase_client.py`
Expected: FAIL (files do not exist yet)

- [ ] **Step 3: Implement `supabase-setup.sql` and `js/supabase-client.js`**

Tulis skrip SQL PostgreSQL lengkap (`profiles`, `mountains`, `bookings`, trigger `handle_new_user()`, RLS policies) dan modul `js/supabase-client.js` yang mengekspos API autentikasi dan database helper.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_supabase_client.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase-setup.sql js/supabase-client.js tests/test_supabase_client.py
git commit -m "feat: add Supabase database schema and client auth connector"
```

---

### Task 2: Strict Auth Gate & Top Navbar Profile Widget (`js/auth-guard.js`, `js/navbar.js`)

**Files:**
- Create: `js/auth-guard.js`
- Modify: `js/navbar.js`
- Test: `tests/test_auth_guard.py`

**Interfaces:**
- Consumes: `SummitSupabase.getSession()`, `SummitSupabase.getUser()`, `SummitSupabase.logout()`
- Produces:
  - `checkAuthAndRedirect()`: cegat jika belum login
  - Updated `renderNavbar()`: tampilkan profil user aktif & tombol Keluar

- [ ] **Step 1: Write the failing test**

```python
# tests/test_auth_guard.py
import os
import unittest

class TestAuthGuard(unittest.TestCase):
    def test_auth_guard_file_exists(self):
        self.assertTrue(os.path.exists("js/auth-guard.js"))

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_auth_guard.py`
Expected: FAIL

- [ ] **Step 3: Implement `js/auth-guard.js` and modify `js/navbar.js`**

Buat proteksi akses halaman di `js/auth-guard.js` dan perbarui `js/navbar.js` untuk menyematkan kartu info profil user aktif dan trigger tombol logout.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_auth_guard.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/auth-guard.js js/navbar.js tests/test_auth_guard.py
git commit -m "feat: implement strict auth guard and user profile navbar widget"
```

---

### Task 3: Dedicated Login, Register & Google OAuth Page (`login.html`, `js/login.js`)

**Files:**
- Create: `login.html`
- Create: `js/login.js`
- Test: `tests/test_login.py`

**Interfaces:**
- Consumes: `SummitSupabase.login()`, `SummitSupabase.register()`, `SummitSupabase.loginWithGoogle()`
- Produces: Halaman login interaktif (Sign In tab, Sign Up tab, Google OAuth button, tanpa tombol demo login).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_login.py
import os
import unittest

class TestLogin(unittest.TestCase):
    def test_login_files_exist(self):
        self.assertTrue(os.path.exists("login.html"))
        self.assertTrue(os.path.exists("js/login.js"))

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_login.py`
Expected: FAIL

- [ ] **Step 3: Implement `login.html` and `js/login.js`**

Bangun tampilan login dengan tema alam, tab switcher Masuk / Daftar Akun, tombol resmi Masuk dengan Google, form validation, dan penanganan redirect setelah login berhasil. Pastikan tidak ada tombol demo login.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_login.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add login.html js/login.js tests/test_login.py
git commit -m "feat: implement login and registration page with Google OAuth"
```

---

### Task 4: Store Synchronization with Supabase Database (`js/store.js`)

**Files:**
- Modify: `js/store.js`
- Test: `tests/test_store_supabase.py`

**Interfaces:**
- Consumes: `SummitSupabase.getSupabase()`
- Produces: Sinkronisasi data booking dan perubahan cuaca ke Supabase database jika terhubung, dengan fallback lokal.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_store_supabase.py
import unittest

class TestStoreSupabase(unittest.TestCase):
    def test_store_has_supabase_sync_methods(self):
        with open("js/store.js", "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("syncToSupabase", content)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_store_supabase.py`
Expected: FAIL

- [ ] **Step 3: Update `js/store.js` with Supabase sync handlers**

Tambahkan fungsi sinkronisasi cloud untuk `createBooking`, `updateMountainWeather`, dan eksekusi mitigasi badai.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_store_supabase.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/store.js tests/test_store_supabase.py
git commit -m "feat: synchronize SummitStore bookings and weather with Supabase cloud database"
```

---

### Task 5: Protect All Existing Pages with Auth Guard (`index.html`, `booking.html`, `ticket.html`, `admin.html`)

**Files:**
- Modify: `index.html`
- Modify: `booking.html`
- Modify: `ticket.html`
- Modify: `admin.html`
- Test: `tests/test_pages_auth_guard.py`

**Interfaces:**
- Consumes: `js/auth-guard.js`, `js/supabase-client.js`
- Produces: Semua halaman terlindungi dari akses tanpa login.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_pages_auth_guard.py
import unittest

class TestPagesAuthGuard(unittest.TestCase):
    def test_pages_contain_auth_guard(self):
        for p in ["index.html", "booking.html", "ticket.html", "admin.html"]:
            with open(p, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertIn("auth-guard.js", content, f"{p} must include auth-guard.js")

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_pages_auth_guard.py`
Expected: FAIL

- [ ] **Step 3: Add `auth-guard.js` and `supabase-client.js` to all 4 pages**

Sematkan skrip pelindung di bagian `<head>` pada `index.html`, `booking.html`, `ticket.html`, dan `admin.html`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests/test_pages_auth_guard.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html booking.html ticket.html admin.html tests/test_pages_auth_guard.py
git commit -m "feat: secure all dashboard pages with strict authentication guard"
```

---

### Task 6: Vercel Deployment Configuration & Full Integration Suite (`vercel.json`, `tests/test_vercel_e2e.py`)

**Files:**
- Create: `vercel.json`
- Create: `tests/test_vercel_e2e.py`
- Test: Full suite verification across all tests.

**Interfaces:**
- Consumes: All project files
- Produces: Vercel ready-to-deploy configuration with clean routing and test verification.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_vercel_e2e.py
import os
import json
import unittest

class TestVercelE2E(unittest.TestCase):
    def test_vercel_json_valid(self):
        self.assertTrue(os.path.exists("vercel.json"))
        with open("vercel.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertIn("cleanUrls", data)
        self.assertIn("routes", data)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests/test_vercel_e2e.py`
Expected: FAIL

- [ ] **Step 3: Implement `vercel.json` and full test suite**

Buat file `vercel.json` dan lengkapi test suite integrasi menyeluruh.

- [ ] **Step 4: Run full test suite**

Run: `python -m unittest discover -s tests -p "test_*.py"`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add vercel.json tests/test_vercel_e2e.py
git commit -m "feat: add Vercel hosting deployment config and full integration verification"
```
