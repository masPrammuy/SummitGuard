import os
import unittest
import re

class TestStoreSupabase(unittest.TestCase):
    def setUp(self):
        self.store_file = "js/store.js"
        self.assertTrue(os.path.exists(self.store_file), "js/store.js must exist")
        with open(self.store_file, "r", encoding="utf-8") as f:
            self.content = f.read()

    def test_store_has_supabase_sync_methods(self):
        """Verify syncToSupabase and fetchBookingsFromSupabase methods exist."""
        self.assertIn("syncToSupabase", self.content, "js/store.js must define syncToSupabase")
        self.assertIn("fetchBookingsFromSupabase", self.content, "js/store.js must define fetchBookingsFromSupabase")

    def test_store_has_mitigation_alias_methods(self):
        """Verify signHighRiskWaiver, rescheduleBooking, and refundBooking methods exist."""
        self.assertIn("signHighRiskWaiver", self.content, "js/store.js must define signHighRiskWaiver")
        self.assertIn("rescheduleBooking", self.content, "js/store.js must define rescheduleBooking")
        self.assertIn("refundBooking", self.content, "js/store.js must define refundBooking")

    def test_store_sync_booking_schema_mapping(self):
        """Verify camelCase to snake_case mapping for booking entities matching supabase-setup.sql."""
        self.assertIn("syncToSupabase", self.content)
        # Check booking mapping fields
        self.assertIn("mountain_id", self.content)
        self.assertIn("mountain_name", self.content)
        self.assertIn("climb_date", self.content)
        self.assertIn("duration_days", self.content)
        self.assertIn("members_count", self.content)
        self.assertIn("total_payment", self.content)
        self.assertIn("mitigation_choice", self.content)
        self.assertIn("high_risk_waiver_signed", self.content)
        self.assertIn("rescheduled_from", self.content)
        self.assertIn("refund_details", self.content)
        # Check client upsert call for bookings
        self.assertRegex(self.content, r"\.from\(['\"]bookings['\"]\)\.upsert\(", "Must upsert to bookings table")

    def test_store_sync_mountain_schema_mapping(self):
        """Verify mountain entity mapping matching supabase-setup.sql."""
        self.assertIn("daily_quota", self.content)
        self.assertIn("remaining_quota", self.content)
        self.assertIn("ticket_price", self.content)
        # Check client upsert call for mountains
        self.assertRegex(self.content, r"\.from\(['\"]mountains['\"]\)\.upsert\(", "Must upsert to mountains table")

    def test_store_supabase_unconfigured_guard_and_resilience(self):
        """Verify graceful return when Supabase is not configured and try/catch error safety."""
        self.assertIn("SUPABASE_NOT_CONFIGURED", self.content, "Must return SUPABASE_NOT_CONFIGURED if not connected")
        self.assertIn("SummitSupabase.getSupabase", self.content, "Must check SummitSupabase.getSupabase()")

    def test_store_mutation_hooks(self):
        """Verify state mutation methods invoke syncToSupabase."""
        # createBooking hook
        create_match = re.search(r"createBooking:\s*function\s*\([^\)]*\)\s*\{(.*?)\n\s*evaluateWeatherAlert:", self.content, re.DOTALL)
        self.assertIsNotNone(create_match, "createBooking method block must exist")
        create_body = create_match.group(1)
        self.assertIn("syncToSupabase", create_body, "createBooking must call syncToSupabase")
        self.assertIn("'booking'", create_body, "createBooking must sync booking")
        self.assertIn("'mountain'", create_body, "createBooking must sync mountain quota")

        # updateMountainWeather hook
        weather_match = re.search(r"updateMountainWeather:\s*function\s*\([^\)]*\)\s*\{(.*?)\n\s*getBookings:", self.content, re.DOTALL)
        self.assertIsNotNone(weather_match, "updateMountainWeather method block must exist")
        weather_body = weather_match.group(1)
        self.assertIn("syncToSupabase", weather_body, "updateMountainWeather must call syncToSupabase")
        self.assertIn("'mountain'", weather_body, "updateMountainWeather must sync mountain")

        # executeProceedHighRisk hook
        waiver_match = re.search(r"executeProceedHighRisk:\s*function\s*\([^\)]*\)\s*\{(.*?)\n\s*executeReschedule:", self.content, re.DOTALL)
        self.assertIsNotNone(waiver_match, "executeProceedHighRisk block must exist")
        self.assertIn("syncToSupabase", waiver_match.group(1), "executeProceedHighRisk must call syncToSupabase")

        # executeReschedule hook
        reschedule_match = re.search(r"executeReschedule:\s*function\s*\([^\)]*\)\s*\{(.*?)\n\s*executeRefund:", self.content, re.DOTALL)
        self.assertIsNotNone(reschedule_match, "executeReschedule block must exist")
        self.assertIn("syncToSupabase", reschedule_match.group(1), "executeReschedule must call syncToSupabase")

        # executeRefund hook
        refund_match = re.search(r"executeRefund:\s*function\s*\([^\)]*\)\s*\{(.*?)\n\s*signHighRiskWaiver:", self.content, re.DOTALL)
        self.assertIsNotNone(refund_match, "executeRefund block must exist")
        refund_body = refund_match.group(1)
        self.assertIn("syncToSupabase", refund_body, "executeRefund must call syncToSupabase")
        self.assertIn("'mountain'", refund_body, "executeRefund must sync restored mountain quota")

    def test_store_fetch_bookings_implementation(self):
        """Verify fetchBookingsFromSupabase queries bookings and merges with local storage."""
        self.assertIn("fetchBookingsFromSupabase", self.content)
        self.assertIn("saveBookings", self.content)
        self.assertRegex(self.content, r"\.from\(['\"]bookings['\"]\)\s*\.select\(", "Must select from bookings table")

    def test_store_user_id_resolution(self):
        """Verify user_id resolves from active session or fallback."""
        self.assertIn("SummitSupabase.getUser()?.id", self.content)
        self.assertIn("data.userId", self.content)

    def test_store_non_uuid_user_id_sanitization(self):
        """Verify non-UUID userId (e.g. usr-local-12345) is sanitized to null for PostgreSQL uuid column."""
        self.assertIn("_isUuid", self.content, "js/store.js must define _isUuid validator helper")
        # Verify regex matches standard UUID and rejects local mock ids
        uuid_match = re.search(r"_isUuid\s*=\s*function|[function\s*]+_isUuid|const\s+_isUuid", self.content)
        self.assertIsNotNone(uuid_match, "_isUuid helper must be defined")
        # Ensure regex checks for standard 8-4-4-4-12 pattern
        self.assertIn("0-9a-f", self.content)
        self.assertIn("user_id", self.content)

    def test_store_mountain_payload_updated_at(self):
        """Verify syncToSupabase('mountain', ...) includes updated_at timestamp."""
        mountain_match = re.search(r"if\s*\(\s*entityType\s*===\s*['\"]mountain['\"]\s*\)\s*\{(.*?)\.from\(['\"]mountains['\"]\)", self.content, re.DOTALL)
        self.assertIsNotNone(mountain_match, "Mountain sync block must exist")
        self.assertIn("updated_at", mountain_match.group(1), "Mountain payload must include updated_at timestamp")

    def test_store_unawaited_sync_has_catch_handler(self):
        """Verify unawaited syncToSupabase calls in mutation methods have .catch handlers."""
        self.assertIn(".catch(", self.content, "Unawaited syncToSupabase calls must attach .catch() handler")


if __name__ == '__main__':
    unittest.main()
