import os
import unittest
import re

class TestSupabaseClient(unittest.TestCase):
    def setUp(self):
        self.sql_path = "supabase-setup.sql"
        self.js_path = "js/supabase-client.js"

    def test_sql_and_client_exist(self):
        """Step 1 & 2 requirement: verify files exist."""
        self.assertTrue(os.path.exists(self.sql_path), f"{self.sql_path} must exist")
        self.assertTrue(os.path.exists(self.js_path), f"{self.js_path} must exist")

    def test_sql_profiles_schema(self):
        """Verify profiles table, columns, and foreign key to auth.users."""
        if not os.path.exists(self.sql_path):
            self.fail(f"{self.sql_path} does not exist")

        with open(self.sql_path, "r", encoding="utf-8") as f:
            sql = f.read()

        self.assertRegex(sql, r"create\s+table\s+(if\s+not\s+exists\s+)?(public\.)?profiles", "profiles table must be defined")
        self.assertIn("references auth.users", sql, "profiles table must reference auth.users")
        self.assertIn("full_name", sql)
        self.assertIn("role", sql)
        self.assertIn("email", sql)
        self.assertIn("avatar_url", sql)
        self.assertIn("created_at", sql)

    def test_sql_auth_trigger(self):
        """Verify handle_new_user function and on_auth_user_created trigger."""
        if not os.path.exists(self.sql_path):
            self.fail(f"{self.sql_path} does not exist")

        with open(self.sql_path, "r", encoding="utf-8") as f:
            sql = f.read()

        self.assertIn("handle_new_user", sql, "handle_new_user function must be declared")
        self.assertIn("on_auth_user_created", sql, "on_auth_user_created trigger must be declared")
        self.assertIn("auth.users", sql)

    def test_sql_mountains_schema(self):
        """Verify mountains table schema with quota, weather, and basecamps."""
        if not os.path.exists(self.sql_path):
            self.fail(f"{self.sql_path} does not exist")

        with open(self.sql_path, "r", encoding="utf-8") as f:
            sql = f.read()

        self.assertRegex(sql, r"create\s+table\s+(if\s+not\s+exists\s+)?(public\.)?mountains", "mountains table must be defined")
        self.assertIn("elevation", sql)
        self.assertIn("province", sql)
        self.assertIn("basecamps", sql)
        self.assertIn("daily_quota", sql)
        self.assertIn("remaining_quota", sql)
        self.assertIn("ticket_price", sql)
        self.assertIn("weather", sql)

    def test_sql_bookings_schema(self):
        """Verify bookings table schema with all SIMAKSI and mitigation fields."""
        if not os.path.exists(self.sql_path):
            self.fail(f"{self.sql_path} does not exist")

        with open(self.sql_path, "r", encoding="utf-8") as f:
            sql = f.read()

        self.assertRegex(sql, r"create\s+table\s+(if\s+not\s+exists\s+)?(public\.)?bookings", "bookings table must be defined")
        self.assertIn("mountain_id", sql)
        self.assertIn("mountain_name", sql)
        self.assertIn("basecamp", sql)
        self.assertIn("climb_date", sql)
        self.assertIn("duration_days", sql)
        self.assertIn("leader", sql)
        self.assertIn("members_count", sql)
        self.assertIn("members", sql)
        self.assertIn("addons", sql)
        self.assertIn("total_payment", sql)
        self.assertIn("status", sql)
        self.assertIn("mitigation_choice", sql)
        self.assertIn("high_risk_waiver_signed", sql)
        self.assertIn("rescheduled_from", sql)
        self.assertIn("refund_details", sql)

    def test_sql_rls_and_policies(self):
        """Verify Row Level Security is enabled and policies are defined for all 3 tables."""
        if not os.path.exists(self.sql_path):
            self.fail(f"{self.sql_path} does not exist")

        with open(self.sql_path, "r", encoding="utf-8") as f:
            sql = f.read()

        self.assertRegex(sql, r"alter\s+table\s+(public\.)?profiles\s+enable\s+row\s+level\s+security", "RLS must be enabled on profiles")
        self.assertRegex(sql, r"alter\s+table\s+(public\.)?mountains\s+enable\s+row\s+level\s+security", "RLS must be enabled on mountains")
        self.assertRegex(sql, r"alter\s+table\s+(public\.)?bookings\s+enable\s+row\s+level\s+security", "RLS must be enabled on bookings")
        self.assertIn("create policy", sql.lower(), "Security policies must be defined")

    def test_sql_initial_seed_mountains(self):
        """Verify initial seed data for Merbabu, Prau, and Gede."""
        if not os.path.exists(self.sql_path):
            self.fail(f"{self.sql_path} does not exist")

        with open(self.sql_path, "r", encoding="utf-8") as f:
            sql = f.read()

        self.assertIn("merbabu", sql)
        self.assertIn("prau", sql)
        self.assertIn("gede", sql)

    def test_js_client_methods_and_contract(self):
        """Verify SummitSupabase exports and required API methods."""
        if not os.path.exists(self.js_path):
            self.fail(f"{self.js_path} does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            js = f.read()

        self.assertIn("SummitSupabase", js)
        required_methods = [
            "getSupabaseConfig",
            "saveSupabaseConfig",
            "isSupabaseConfigured",
            "initSupabase",
            "getSupabase",
            "register",
            "login",
            "loginWithGoogle",
            "logout",
            "getSession",
            "getUser"
        ]
        for method in required_methods:
            self.assertIn(method, js, f"Method '{method}' must be defined in js/supabase-client.js")

        # Check alias isConfigured
        self.assertTrue("isConfigured" in js or "isSupabaseConfigured" in js)

    def test_js_client_google_oauth_and_fallback(self):
        """Verify Google OAuth and local fallback mechanisms."""
        if not os.path.exists(self.js_path):
            self.fail(f"{self.js_path} does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            js = f.read()

        self.assertIn("signInWithOAuth", js)
        self.assertIn("provider", js)
        self.assertIn("google", js)
        self.assertIn("signUp", js)
        self.assertIn("signInWithPassword", js)
        self.assertIn("signOut", js)

if __name__ == '__main__':
    unittest.main()
