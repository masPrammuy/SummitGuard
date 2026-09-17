import os
import re
import unittest

class TestAssets(unittest.TestCase):
    def setUp(self):
        self.css_path = "css/style.css"
        self.js_path = "js/navbar.js"

    def test_css_and_navbar_exist(self):
        self.assertTrue(os.path.exists(self.css_path), "css/style.css must exist")
        self.assertTrue(os.path.exists(self.js_path), "js/navbar.js must exist")

    def test_css_content_and_rules(self):
        if not os.path.exists(self.css_path):
            self.fail(f"{self.css_path} does not exist")

        with open(self.css_path, "r", encoding="utf-8") as f:
            css = f.read()

        # Ticket visual styling (perforated cutout borders, ticket rip line)
        self.assertTrue(
            "ticket" in css.lower(),
            "css/style.css must include ticket styles"
        )
        self.assertTrue(
            "ticket-rip" in css or "ticket-perforated" in css or "ticket-cutout" in css or "ticket-notch" in css,
            "css/style.css must include ticket cutout or perforation or rip line styling"
        )

        # Weather alert pulsing badge and glow animations
        self.assertIn("@keyframes", css, "css/style.css must include @keyframes animations")
        self.assertTrue(
            "pulse" in css.lower() or "glow" in css.lower(),
            "css/style.css must include pulse or glow animation for weather warnings"
        )
        self.assertTrue(
            "badge-pulse" in css or "alert-pulse" in css or "weather-pulse" in css or "animate-pulse-glow" in css,
            "css/style.css must include a pulse/glow animation class for badai/weather alerts"
        )

        # Clean print styles (@media print)
        self.assertIn("@media print", css, "css/style.css must include @media print query")
        self.assertTrue(
            "no-print" in css or "display: none" in css,
            "Print styles must hide non-printable elements"
        )

        # No mojibake
        with open(self.css_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake in css/style.css")

    def test_navbar_js_content_and_functions(self):
        if not os.path.exists(self.js_path):
            self.fail(f"{self.js_path} does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            js = f.read()

        # Check required function names
        required_functions = [
            "renderNavbar",
            "renderFooter",
            "renderBMKGWeatherBanner"
        ]
        for fn in required_functions:
            self.assertIn(fn, js, f"Function '{fn}' must be defined in js/navbar.js")

        # Check navigation destinations
        required_links = [
            "index.html",
            "booking.html",
            "ticket.html",
            "admin.html"
        ]
        for link in required_links:
            self.assertIn(link, js, f"Link '{link}' must be present in navbar")

        # Check mobile menu toggle logic
        self.assertTrue(
            "hamburger" in js.lower() or "mobile" in js.lower() or "toggle" in js.lower(),
            "Navbar must support mobile menu toggle functionality"
        )

        # Check standardized footer contents (conservation ethics & academic disclaimer)
        self.assertTrue(
            "konservasi" in js.lower() or "lestari" in js.lower() or "footprint" in js.lower() or "sampah" in js.lower() or "sop" in js.lower(),
            "Footer must include mountaineering conservation ethics"
        )
        self.assertTrue(
            "akademik" in js.lower() or "prototipe" in js.lower() or "simulasi" in js.lower() or "disclaimer" in js.lower(),
            "Footer must include academic disclaimer"
        )

        # Check weather banner elements
        self.assertTrue(
            "bmkg" in js.lower(),
            "Weather banner must reference BMKG"
        )
        self.assertTrue(
            "warning" in js.lower() or "peringatan" in js.lower() or "badai" in js.lower(),
            "Weather banner must display warning information"
        )

        # Check JS bracket integrity
        self._verify_bracket_integrity(js)

        # Check no mojibake
        with open(self.js_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake in js/navbar.js")

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
