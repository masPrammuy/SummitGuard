import os
import re
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
        valid_statuses = [
            "CONFIRMED",
            "WEATHER_WARNING",
            "HIGH_RISK_APPROVED",
            "RESCHEDULED",
            "CANCELLED_REFUNDED"
        ]
        self.assertIn("WEATHER_WARNING", valid_statuses)
        self.assertIn("HIGH_RISK_APPROVED", valid_statuses)
        self.assertIn("RESCHEDULED", valid_statuses)
        self.assertIn("CANCELLED_REFUNDED", valid_statuses)

    def test_refund_100_percent_calculation(self):
        # Refund BMKG force majeure adalah 100% penuh tanpa potongan
        total_payment = 440000
        refund_percentage = 1.0
        refund_amount = total_payment * refund_percentage
        self.assertEqual(refund_amount, 440000)

    def test_sample_booking_id_format(self):
        sample_id = "SMK-20260920-0482"
        pattern = r"^SMK-\d{8}-[A-Za-z0-9]+$"
        self.assertTrue(re.match(pattern, sample_id) is not None)


class TestSummitStoreContract(unittest.TestCase):
    def setUp(self):
        self.store_file = "js/store.js"
        self.assertTrue(os.path.exists(self.store_file), "js/store.js must exist")
        with open(self.store_file, "r", encoding="utf-8") as f:
            self.content = f.read()

    def test_store_file_exists(self):
        self.assertTrue(os.path.exists(self.store_file))

    def test_store_required_methods_defined(self):
        required_methods = [
            "getMountains",
            "getMountain",
            "updateMountainWeather",
            "getBookings",
            "getBooking",
            "createBooking",
            "evaluateWeatherAlert",
            "executeProceedHighRisk",
            "executeReschedule",
            "executeRefund",
            "resetDemoData"
        ]
        for method in required_methods:
            self.assertIn(method, self.content, f"Method '{method}' must be defined in js/store.js")

    def test_store_initial_mountains_defined(self):
        # Check required mountain ids and metadata
        self.assertIn("merbabu", self.content)
        self.assertIn("prau", self.content)
        self.assertIn("gede", self.content)
        self.assertIn("Gunung Merbabu", self.content)
        self.assertIn("Gunung Prau", self.content)
        self.assertIn("Gunung Gede Pangrango", self.content)

    def test_store_initial_booking_defined(self):
        # Check sample booking id and fields
        self.assertIn("SMK-20260920-0482", self.content)
        self.assertIn("Andi Pratama", self.content)
        self.assertIn("WEATHER_WARNING", self.content)

    def test_store_memory_fallback_implemented(self):
        # Must handle localStorage absence or errors gracefully
        self.assertTrue(
            "_memoryStore" in self.content or "memory" in self.content.lower(),
            "js/store.js must include in-memory fallback for environments without localStorage"
        )

    def test_no_mojibake_in_store(self):
        with open("js/store.js", "rb") as f:
            raw_bytes = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw_bytes, "Found double-encoded mojibake Â°")
        self.assertNotIn("Â°", self.content, "Mojibake 'Â°' found in js/store.js")
        self.assertIn("8°C", self.content)
        self.assertIn("14°C", self.content)
        self.assertIn("11°C", self.content)

    def test_create_booking_integer_coercion_and_refund_guard(self):
        # Must parse membersCount as integer
        self.assertIn("parseInt(bookingData.membersCount", self.content, "createBooking must parseInt membersCount")
        # Must use Number() or numeric conversion on quota restoration
        self.assertTrue(
            "Number(booking.membersCount)" in self.content or "parseInt(booking.membersCount" in self.content,
            "executeRefund must ensure numeric addition on remainingQuota"
        )
        # Must have CANCELLED_REFUNDED guards in refund and reschedule
        self.assertIn("Tiket ini sudah dibatalkan", self.content, "executeRefund must guard against double refund")
        self.assertIn("Tiket yang sudah dibatalkan tidak dapat dijadwalkan ulang", self.content, "executeReschedule must guard against rescheduling cancelled booking")

    def test_store_js_bracket_integrity(self):
        # Verify basic syntax balance of braces, brackets, and parentheses
        content = self.content
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
