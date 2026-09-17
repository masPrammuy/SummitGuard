import os
import unittest

class TestBooking(unittest.TestCase):
    def setUp(self):
        self.html_path = "booking.html"
        self.js_path = "js/booking.js"

    def test_files_exist(self):
        self.assertTrue(os.path.exists(self.html_path), "booking.html must exist")
        self.assertTrue(os.path.exists(self.js_path), "js/booking.js must exist")

    def test_booking_html_elements(self):
        if not os.path.exists(self.html_path):
            self.fail("booking.html does not exist")

        with open(self.html_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Core headings and section titles
        self.assertIn("Formulir Reservasi SIMAKSI", content)
        self.assertIn("Data Ketua Rombongan", content)
        self.assertIn("Jasa Porter Lokal", content)

        # Asset inclusions
        self.assertIn("css/style.css", content)
        self.assertIn("js/store.js", content)
        self.assertIn("js/navbar.js", content)
        self.assertIn("js/booking.js", content)
        self.assertTrue(
            "tailwindcss" in content or "cdn.tailwindcss.com" in content or "tailwind" in content.lower(),
            "booking.html must include Tailwind CDN"
        )

        # Container for navbar and footer injection
        self.assertTrue(
            "navbar-container" in content or "main-navbar" in content,
            "booking.html must have navbar container"
        )
        self.assertTrue(
            "footer-container" in content or "main-footer" in content,
            "booking.html must have footer container"
        )

        # Step 1: Mountain, basecamp, climb date, duration, and live weather/quota preview
        self.assertIn("mountain-select", content)
        self.assertIn("basecamp-select", content)
        self.assertIn("climb-date", content)
        self.assertIn("climb-duration", content)
        self.assertTrue(
            "quota" in content.lower() or "kuota" in content.lower(),
            "booking.html must contain quota status element"
        )
        self.assertTrue(
            "bmkg" in content.lower() or "cuaca" in content.lower(),
            "booking.html must contain weather forecast element"
        )

        # Step 2: Leader & Member details
        self.assertIn("leader-name", content)
        self.assertIn("leader-nik", content)
        self.assertIn("leader-phone", content)
        self.assertIn("leader-emergency", content)
        self.assertIn("members-count", content)
        self.assertIn("members-container", content)

        # Step 3: Equipment and Health Screening
        content_lower = content.lower()
        self.assertTrue(
            "tenda" in content_lower or "sleeping bag" in content_lower,
            "booking.html must include mandatory equipment checklist items"
        )
        self.assertTrue(
            "sehat" in content_lower or "fisik" in content_lower,
            "booking.html must include health confirmation"
        )

        # Step 4: Local Porter Addon
        self.assertIn("porter-addon", content)

        # Step 5: Price Breakdown & Payment methods
        self.assertIn("payment-summary", content)
        self.assertTrue(
            "qris" in content_lower or "bca" in content_lower or "gopay" in content_lower,
            "booking.html must offer payment method options"
        )
        self.assertTrue(
            "submit-booking-btn" in content or "btn-submit" in content or "bayar" in content_lower,
            "booking.html must have submit/checkout button"
        )

        # Success modal / notification container
        self.assertTrue(
            "success-modal" in content or "modal-success" in content or "booking-success" in content,
            "booking.html must have a success modal/dialog container"
        )

        # No mojibake in booking.html
        with open(self.html_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake in booking.html")

    def test_booking_js_logic(self):
        if not os.path.exists(self.js_path):
            self.fail("js/booking.js does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            js = f.read()

        # Consumes SummitStore
        self.assertIn("SummitStore", js, "js/booking.js must use SummitStore")
        self.assertTrue(
            "getMountains" in js or "getMountain" in js,
            "js/booking.js must retrieve mountains from SummitStore"
        )
        self.assertIn("createBooking", js, "js/booking.js must call SummitStore.createBooking")

        # URL Query param support for ?mountain=
        self.assertTrue(
            "URLSearchParams" in js or "location.search" in js,
            "js/booking.js must parse query params for mountain selection"
        )

        # Dynamic Basecamp and quota/weather preview update
        self.assertTrue(
            "basecamp" in js.lower(),
            "js/booking.js must handle basecamp options dynamically"
        )

        # Dynamic Member Row Generation
        self.assertTrue(
            "members-container" in js or "member" in js.lower(),
            "js/booking.js must dynamically render member rows"
        )

        # Validation rules: NIK 16 digits, min 2 people
        self.assertTrue(
            "16" in js or "nik" in js.lower(),
            "js/booking.js must validate 16 digit NIK"
        )

        # Reactive price calculation
        self.assertTrue(
            "total" in js.lower() or "price" in js.lower() or "calculate" in js.lower(),
            "js/booking.js must calculate payment totals dynamically"
        )

        # Porter local fee calculation (Rp 350.000)
        self.assertTrue(
            "350000" in js or "350" in js,
            "js/booking.js must account for Rp 350.000 porter fee"
        )

        # Redirects or links to ticket.html
        self.assertTrue(
            "ticket.html" in js,
            "js/booking.js must redirect or link to ticket.html"
        )

        # Explicit interface invocation for shared navigation and footer
        self.assertIn("renderNavbar('booking'", js, "js/booking.js must explicitly invoke renderNavbar('booking')")
        self.assertIn("renderFooter('footer-container')", js, "js/booking.js must explicitly invoke renderFooter")

        # Quota sufficiency validation
        self.assertTrue(
          "remainingQuota < totalMembers" in js or "remainingQuota <" in js,
          "js/booking.js must validate quota sufficiency before checkout"
        )
        self.assertIn("Kuota pendakian tidak mencukupi", js, "js/booking.js must display quota insufficiency error")

        # Form Enter-key submission and prevent reload
        self.assertIn("addEventListener('submit'", js, "js/booking.js must handle form submit event")
        self.assertIn("preventDefault()", js, "js/booking.js must prevent default on submit to avoid reload")

        # Visual selection styling for payment method radios
        self.assertIn("updatePaymentMethodVisuals", js, "js/booking.js must manage visual styling for payment methods")

        # Bracket integrity / syntax check
        self._verify_bracket_integrity(js)

        # No mojibake
        with open(self.js_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake in js/booking.js")

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
