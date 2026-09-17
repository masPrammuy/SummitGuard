import os
import unittest

class TestAdmin(unittest.TestCase):
    def setUp(self):
        self.html_path = "admin.html"
        self.js_path = "js/admin.js"

    def test_files_exist(self):
        self.assertTrue(os.path.exists(self.html_path), "admin.html must exist")
        self.assertTrue(os.path.exists(self.js_path), "js/admin.js must exist")

    def test_admin_html_elements(self):
        if not os.path.exists(self.html_path):
            self.fail("admin.html does not exist")

        with open(self.html_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Task brief requirements
        self.assertTrue(
            "Panel Kontrol Simulasi BMKG" in content or "Panel Simulasi BMKG" in content,
            "admin.html must include BMKG Simulation title or badge"
        )
        self.assertTrue(
            "Toggle Status Cuaca" in content or "Simulasi Cuaca" in content or "Status Cuaca" in content,
            "admin.html must have weather status toggle section"
        )
        self.assertTrue(
            "Reset Data Demo" in content or "Reset Data Awal Demo" in content,
            "admin.html must have Reset Demo Data button"
        )

        # Asset inclusions
        self.assertIn("css/style.css", content)
        self.assertIn("js/store.js", content)
        self.assertIn("js/navbar.js", content)
        self.assertIn("js/admin.js", content)
        self.assertTrue(
            "tailwindcss" in content or "cdn.tailwindcss.com" in content,
            "admin.html must include Tailwind CDN"
        )

        # Containers for navbar & footer
        self.assertIn("navbar-container", content)
        self.assertIn("footer-container", content)

        # Academic & Demo Badge
        self.assertIn("Panel Simulasi BMKG & Manajemen Operasional Basecamp", content)

        # Section 1: BMKG Weather Simulator per Mountain
        self.assertIn("weather-cards-container", content)

        # Section 2: Live Booking & Mitigation Monitor Table
        self.assertIn("bookings-table-container", content)
        self.assertIn("bookings-table-body", content)

        # Section 3: Demo Management Controls
        self.assertIn("btn-reset-demo", content)
        self.assertIn("SMK-20260920-0482", content)

        # Toast notification container
        self.assertIn("toast-container", content)

        # No mojibake
        with open(self.html_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake Â° in admin.html")

    def test_admin_js_logic(self):
        if not os.path.exists(self.js_path):
            self.fail("js/admin.js does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            js = f.read()

        # Consumes SummitStore methods
        self.assertIn("SummitStore", js, "js/admin.js must use SummitStore")
        self.assertIn("getMountains", js, "js/admin.js must call SummitStore.getMountains")
        self.assertIn("updateMountainWeather", js, "js/admin.js must call SummitStore.updateMountainWeather")
        self.assertIn("getBookings", js, "js/admin.js must call SummitStore.getBookings")
        self.assertIn("resetDemoData", js, "js/admin.js must call SummitStore.resetDemoData")

        # Navbar and Footer rendering
        self.assertIn("renderNavbar('admin'", js, "js/admin.js must invoke renderNavbar('admin')")
        self.assertIn("renderFooter('footer-container')", js, "js/admin.js must invoke renderFooter")

        # AdminController structure
        self.assertIn("AdminController", js, "js/admin.js must define AdminController")
        self.assertIn("renderWeatherCards", js, "js/admin.js must define renderWeatherCards")
        self.assertIn("setWeatherCondition", js, "js/admin.js must define setWeatherCondition")
        self.assertIn("renderBookingsTable", js, "js/admin.js must define renderBookingsTable")
        self.assertIn("handleResetDemo", js, "js/admin.js must define handleResetDemo")
        self.assertIn("showToast", js, "js/admin.js must define showToast")
        self.assertIn("escapeHtml", js, "js/admin.js must define escapeHtml helper")

        # Status Badges
        self.assertIn("CONFIRMED", js)
        self.assertIn("WEATHER_WARNING", js)
        self.assertIn("HIGH_RISK_APPROVED", js)
        self.assertIn("RESCHEDULED", js)
        self.assertIn("CANCELLED_REFUNDED", js)

        # Weather Presets
        self.assertIn("Badai Hujan & Angin Kencang", js)
        self.assertIn("Cerah Berawan", js)
        self.assertIn("48 knot", js)
        self.assertIn("12 knot", js)

        # Action Link to ticket.html
        self.assertIn("ticket.html?id=", js, "js/admin.js must provide link to ticket.html with id")

        # Bracket integrity check
        self._verify_bracket_integrity(js)

        # No mojibake
        with open(self.js_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake Â° in js/admin.js")

    def _verify_bracket_integrity(self, content):
        cleaned = []
        i = 0
        n = len(content)
        in_single_quote = False
        in_double_quote = False
        in_backtick = False
        in_line_comment = False
        in_block_comment = False

        while i < n:
            c = content[i]
            nxt = content[i+1] if i+1 < n else ''

            if in_line_comment:
                if c == '\n':
                    in_line_comment = False
                    cleaned.append(c)
            elif in_block_comment:
                if c == '*' and nxt == '/':
                    in_block_comment = False
                    i += 1
            elif in_single_quote:
                if c == '\\':
                    i += 1
                elif c == '\'':
                    in_single_quote = False
            elif in_double_quote:
                if c == '\\':
                    i += 1
                elif c == '\"':
                    in_double_quote = False
            elif in_backtick:
                if c == '\\':
                    i += 1
                elif c == '`':
                    in_backtick = False
            else:
                if c == '/' and nxt == '/':
                    in_line_comment = True
                    i += 1
                elif c == '/' and nxt == '*':
                    in_block_comment = True
                    i += 1
                elif c == '\'':
                    in_single_quote = True
                elif c == '\"':
                    in_double_quote = True
                elif c == '`':
                    in_backtick = True
                else:
                    cleaned.append(c)
            i += 1

        stripped_code = ''.join(cleaned)
        stack = []
        pairs = {')': '(', '}': '{', ']': '['}
        for idx, ch in enumerate(stripped_code):
            if ch in '({[':
                stack.append((ch, idx))
            elif ch in ')}]':
                self.assertTrue(len(stack) > 0, f"Unmatched closing '{ch}' at character index {idx}")
                last_ch, _ = stack.pop()
                self.assertEqual(last_ch, pairs[ch], f"Mismatched bracket '{last_ch}' with '{ch}' at index {idx}")
        self.assertEqual(len(stack), 0, f"Unclosed brackets remaining: {stack}")

if __name__ == '__main__':
    unittest.main()
