import os
import unittest

class TestTicket(unittest.TestCase):
    def setUp(self):
        self.html_path = "ticket.html"
        self.js_path = "js/ticket.js"

    def test_files_exist(self):
        self.assertTrue(os.path.exists(self.html_path), "ticket.html must exist")
        self.assertTrue(os.path.exists(self.js_path), "js/ticket.js must exist")

    def test_ticket_html_elements(self):
        if not os.path.exists(self.html_path):
            self.fail("ticket.html does not exist")

        with open(self.html_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Core requirements from task brief & spec
        self.assertIn("E-Tiket Resmi SIMAKSI", content)
        self.assertIn("Peringatan Dini Cuaca BMKG", content)
        self.assertIn("Tetap Naik", content)
        self.assertIn("Reschedule", content)
        self.assertIn("Refund", content)

        # Asset inclusions
        self.assertIn("css/style.css", content)
        self.assertIn("js/store.js", content)
        self.assertIn("js/navbar.js", content)
        self.assertIn("js/ticket.js", content)
        self.assertTrue(
            "tailwindcss" in content or "cdn.tailwindcss.com" in content or "tailwind" in content.lower(),
            "ticket.html must include Tailwind CDN"
        )

        # Container for navbar and footer injection
        self.assertTrue(
            "navbar-container" in content or "main-navbar" in content,
            "ticket.html must have navbar container"
        )
        self.assertTrue(
            "footer-container" in content or "main-footer" in content,
            "ticket.html must have footer container"
        )

        # Ticket lookup search bar & demo switcher
        self.assertIn("ticket-search-form", content)
        self.assertIn("ticket-search-input", content)
        self.assertIn("search-ticket-btn", content)
        self.assertIn("btn-demo-ticket", content)
        self.assertIn("booking-chips-container", content)

        # Authentic E-Tiket Elements
        self.assertIn("ticket-printable-card", content)
        self.assertIn("ticket-booking-id", content)
        self.assertIn("btn-copy-code", content)
        self.assertIn("ticket-status-badge", content)
        self.assertIn("ticket-mountain-name", content)
        self.assertIn("ticket-elevation", content)
        self.assertIn("ticket-basecamp", content)
        self.assertIn("ticket-climb-date", content)
        self.assertIn("ticket-duration", content)

        # Leader & Manifest Roster
        self.assertIn("ticket-leader-name", content)
        self.assertIn("ticket-leader-nik", content)
        self.assertIn("ticket-leader-phone", content)
        self.assertIn("ticket-emergency-contact", content)
        self.assertIn("ticket-members-count", content)
        self.assertIn("ticket-members-list", content)

        # Porter Addon & Payment
        self.assertIn("ticket-porter-status", content)
        self.assertIn("ticket-porter-badge", content)
        self.assertIn("ticket-payment-status", content)
        self.assertIn("ticket-total-payment", content)

        # QR Code & Offline verification stub
        self.assertIn("ticket-qr-container", content)
        self.assertIn("ticket-qr-token", content)
        self.assertIn("ticket-barcode-text", content)
        self.assertIn("btn-print-ticket", content)

        # Weather Alert Section & 3 Mitigation Triggers
        self.assertIn("weather-alert-section", content)
        self.assertIn("alert-mountain-badge", content)
        self.assertIn("alert-condition-title", content)
        self.assertIn("alert-wind-speed", content)
        self.assertIn("alert-temp", content)
        self.assertIn("btn-open-modal-high-risk", content)
        self.assertIn("btn-open-modal-reschedule", content)
        self.assertIn("btn-open-modal-refund", content)

        # Modal 1: Tetap Naik
        self.assertIn("modal-proceed-highrisk", content)
        self.assertIn("check-highrisk-1", content)
        self.assertIn("check-highrisk-2", content)
        self.assertIn("check-highrisk-3", content)
        self.assertIn("check-highrisk-4", content)
        self.assertIn("highrisk-signer-name", content)
        self.assertIn("highrisk-signer-nik", content)
        self.assertIn("highrisk-confirmation-text", content)
        self.assertIn("btn-submit-highrisk", content)

        # Modal 2: Reschedule
        self.assertIn("modal-reschedule", content)
        self.assertIn("reschedule-date-input", content)
        self.assertIn("quick-reschedule-dates", content)
        self.assertIn("btn-submit-reschedule", content)

        # Modal 3: Refund
        self.assertIn("modal-refund", content)
        self.assertIn("refund-total-amount", content)
        self.assertIn("refund-bank", content)
        self.assertIn("refund-account-number", content)
        self.assertIn("refund-account-name", content)
        self.assertIn("btn-submit-refund", content)

        # No mojibake in ticket.html
        with open(self.html_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake in ticket.html")

    def test_ticket_js_logic(self):
        if not os.path.exists(self.js_path):
            self.fail("js/ticket.js does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            js = f.read()

        # Consumes SummitStore methods
        self.assertIn("SummitStore", js, "js/ticket.js must use SummitStore")
        self.assertIn("getBooking", js, "js/ticket.js must call SummitStore.getBooking")
        self.assertIn("executeProceedHighRisk", js, "js/ticket.js must call executeProceedHighRisk")
        self.assertIn("executeReschedule", js, "js/ticket.js must call executeReschedule")
        self.assertIn("executeRefund", js, "js/ticket.js must call executeRefund")

        # Navbar and Footer explicit rendering
        self.assertIn("renderNavbar('ticket'", js, "js/ticket.js must invoke renderNavbar('ticket')")
        self.assertIn("renderFooter('footer-container')", js, "js/ticket.js must invoke renderFooter")

        # URL param parsing for ?id=
        self.assertTrue(
            "URLSearchParams" in js or "location.search" in js,
            "js/ticket.js must parse query params for ticket ID"
        )
        self.assertIn("SMK-20260920-0482", js, "js/ticket.js must have fallback to default demo booking")

        # Status handling for all 5 statuses
        self.assertIn("CONFIRMED", js)
        self.assertIn("WEATHER_WARNING", js)
        self.assertIn("HIGH_RISK_APPROVED", js)
        self.assertIn("RESCHEDULED", js)
        self.assertIn("CANCELLED_REFUNDED", js)

        # SVG QR Code generator
        self.assertIn("generateQRCodeSVG", js, "js/ticket.js must include QR code generator")
        self.assertIn("<svg", js, "QR code must generate SVG vector")

        # Controller methods
        self.assertIn("TicketController", js)
        self.assertIn("loadBooking", js)
        self.assertIn("renderTicketDetails", js)
        self.assertIn("renderStatusBadge", js)
        self.assertIn("renderWeatherAlertSection", js)
        self.assertIn("renderPostMitigationBanner", js)
        self.assertIn("handleHighRiskSubmit", js)
        self.assertIn("handleRescheduleSubmit", js)
        self.assertIn("handleRefundSubmit", js)

        # Bracket integrity / syntax check
        self._verify_bracket_integrity(js)

        # No mojibake
        with open(self.js_path, "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake in js/ticket.js")

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
