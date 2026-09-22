import json
import http.server
import os
import threading
import urllib.request
import unittest


class TestVercelE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        cls.vercel_json_path = os.path.join(cls.root_dir, "vercel.json")

    def test_vercel_json_exists_and_valid_json(self):
        """Verify vercel.json exists and is valid JSON with expected top-level properties."""
        self.assertTrue(os.path.exists(self.vercel_json_path), "vercel.json must exist in project root")
        with open(self.vercel_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(data.get("version"), 2, "vercel.json version must be 2")
        self.assertIs(data.get("cleanUrls"), True, "cleanUrls must be True")
        self.assertIs(data.get("trailingSlash"), False, "trailingSlash must be False")
        self.assertIn("routes", data, "vercel.json must define routes")
        self.assertIsInstance(data["routes"], list, "routes must be a list")

    def test_vercel_routes_and_target_files(self):
        """Verify routes map cleanly to html files, target files exist, and filesystem handle is configured."""
        self.assertTrue(os.path.exists(self.vercel_json_path), "vercel.json must exist in project root")
        with open(self.vercel_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        routes = data.get("routes", [])
        expected_route_mappings = {
            "/login": "/login.html",
            "/booking": "/booking.html",
            "/ticket": "/ticket.html",
            "/admin": "/admin.html",
            "/": "/index.html",
        }

        # Check expected route definitions
        actual_mappings = {}
        has_filesystem_handle = False

        for r in routes:
            if "handle" in r and r["handle"] == "filesystem":
                has_filesystem_handle = True
            elif "src" in r and "dest" in r:
                actual_mappings[r["src"]] = r["dest"]

        for src, expected_dest in expected_route_mappings.items():
            self.assertIn(src, actual_mappings, f"Route src '{src}' must be configured in vercel.json")
            self.assertEqual(actual_mappings[src], expected_dest, f"Route '{src}' must point to '{expected_dest}'")

            # Check destination file exists on disk
            rel_file = expected_dest.lstrip("/")
            full_path = os.path.join(self.root_dir, rel_file)
            self.assertTrue(os.path.exists(full_path), f"Destination file '{rel_file}' for route '{src}' must exist on disk")

        self.assertTrue(has_filesystem_handle, "vercel.json routes must include handle: 'filesystem'")

    def test_static_http_server_serving_pages_and_assets(self):
        """Spin up a static HTTP server to verify all pages and core assets return HTTP 200."""
        # SimpleHTTPRequestHandler serves from current working directory or directory argument
        handler_class = http.server.SimpleHTTPRequestHandler
        server = http.server.HTTPServer(("127.0.0.1", 0), handler_class)
        port = server.server_address[1]

        server_thread = threading.Thread(target=server.serve_forever, daemon=True)
        server_thread.start()

        base_url = f"http://127.0.0.1:{port}"

        endpoints = [
            ("/index.html", 200, "SummitGuard"),
            ("/login.html", 200, "SummitGuard"),
            ("/booking.html", 200, "Formulir Reservasi SIMAKSI"),
            ("/ticket.html", 200, "E-Tiket Resmi SIMAKSI"),
            ("/admin.html", 200, "Panel Simulasi BMKG"),
            ("/css/style.css", 200, "ticket"),
            ("/js/store.js", 200, "SummitStore"),
            ("/js/auth-guard.js", 200, "SummitAuthGuard"),
            ("/js/supabase-client.js", 200, "SummitSupabase"),
            ("/js/navbar.js", 200, "renderNavbar"),
            ("/js/login.js", 200, "SummitLogin"),
        ]

        try:
            for path, expected_status, expected_text in endpoints:
                url = base_url + path
                req = urllib.request.Request(url, headers={"User-Agent": "SummitGuardVercelE2E/1.0"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    self.assertEqual(
                        response.status,
                        expected_status,
                        f"Expected status {expected_status} for {url}, got {response.status}"
                    )
                    content = response.read().decode("utf-8", errors="replace")
                    self.assertIn(
                        expected_text,
                        content,
                        f"Expected snippet '{expected_text}' not found in response from {url}"
                    )
        finally:
            server.shutdown()
            server.server_close()

    def test_no_demo_login_buttons_across_html_files(self):
        """Verify no demo login buttons or guest bypass triggers exist across any HTML file."""
        html_files = ["login.html", "booking.html", "ticket.html", "admin.html", "index.html"]
        disallowed_patterns = [
            "demo-login",
            "demologin",
            "demo_login",
            "demo-btn",
            "btn-demo-login",
            "tombol demo",
            "masuk sebagai demo",
            "login sebagai demo",
            "masuk akun demo",
            "akun demo",
            "guest bypass",
            "quick-demo",
        ]

        for filename in html_files:
            file_path = os.path.join(self.root_dir, filename)
            self.assertTrue(os.path.exists(file_path), f"HTML file {filename} must exist")

            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read().lower()

            for pattern in disallowed_patterns:
                self.assertNotIn(
                    pattern,
                    content,
                    f"Disallowed demo login pattern '{pattern}' found in {filename}"
                )


if __name__ == "__main__":
    unittest.main()
