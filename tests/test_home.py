import os
import unittest

class TestHome(unittest.TestCase):
    def setUp(self):
        self.html_path = "index.html"
        self.js_path = "js/home.js"

    def test_files_exist(self):
        self.assertTrue(os.path.exists(self.html_path), "index.html must exist")
        self.assertTrue(os.path.exists(self.js_path), "js/home.js must exist")

    def test_index_html_contains_elements(self):
        if not os.path.exists(self.html_path):
            self.fail("index.html does not exist")

        with open(self.html_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Core brand and navigation
        self.assertIn("SummitGuard", content)
        self.assertIn("Katalog Gunung", content)
        self.assertIn("Cek E-Tiket", content)

        # Asset inclusions
        self.assertIn("css/style.css", content)
        self.assertIn("js/store.js", content)
        self.assertIn("js/navbar.js", content)
        self.assertIn("js/home.js", content)
        self.assertTrue(
            "tailwindcss" in content or "cdn.tailwindcss.com" in content or "tailwind" in content.lower(),
            "index.html must include Tailwind CDN"
        )

        # Hero section elements
        self.assertTrue(
            "Daftar SIMAKSI" in content or "Daftar Sekarang" in content,
            "Hero section must include CTA button"
        )

        # Quick ticket search card / form
        self.assertTrue(
            "SMK-" in content or "ticket.html" in content or "search" in content.lower(),
            "Quick ticket search card must be present"
        )

        # Container for dynamic mountain catalog
        self.assertTrue(
            "mountain" in content.lower() or "katalog" in content.lower(),
            "Container for mountain catalog cards must be present"
        )

        # Value proposition section (3 key pillars: BMKG Early Warning, Quota Protection, Local Porter Support)
        content_lower = content.lower()
        self.assertTrue(
            "bmkg" in content_lower or "cuaca" in content_lower,
            "Must feature BMKG weather warning pillar"
        )
        self.assertTrue(
            "kuota" in content_lower or "quota" in content_lower,
            "Must feature Quota protection pillar"
        )
        self.assertTrue(
            "porter" in content_lower or "warga" in content_lower,
            "Must feature Local porter support pillar"
        )

        # No mojibake in index.html
        with open(self.html_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake in index.html")

    def test_home_js_logic_and_rendering(self):
        if not os.path.exists(self.js_path):
            self.fail("js/home.js does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            js = f.read()

        # Consumes SummitStore.getMountains()
        self.assertIn("SummitStore", js, "js/home.js must use SummitStore")
        self.assertIn("getMountains", js, "js/home.js must call SummitStore.getMountains()")

        # Renders mountain card details: elevation, basecamps, quota percentage, weather status
        self.assertTrue(
            "elevation" in js or "mdpl" in js,
            "js/home.js must display mountain elevation"
        )
        self.assertTrue(
            "basecamp" in js.lower(),
            "js/home.js must display mountain basecamps"
        )
        self.assertTrue(
            "quota" in js.lower() or "kuota" in js.lower() or "remainingquota" in js.lower(),
            "js/home.js must calculate or display remaining quota and progress"
        )

        # Reactive BMKG weather pill (warning vs normal/safe)
        self.assertTrue(
            "warning" in js.lower() or "badai" in js.lower() or "weather" in js.lower(),
            "js/home.js must handle BMKG weather warning status"
        )

        # CTA linking to booking.html with mountain ID parameter
        self.assertTrue(
            "booking.html?mountain=" in js or "booking.html" in js,
            "js/home.js must link CTA to booking.html with mountain query parameter"
        )

        # Ticket quick search handling redirecting to ticket.html
        self.assertTrue(
            "ticket.html" in js,
            "js/home.js must handle quick search redirecting to ticket.html"
        )

        # Syntax / bracket check
        self._verify_bracket_integrity(js)

        # No mojibake
        with open(self.js_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake in js/home.js")

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
