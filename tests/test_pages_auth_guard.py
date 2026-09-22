import os
import unittest
import re

class TestPagesAuthGuard(unittest.TestCase):
    """
    Verifies that all primary application pages are protected with
    the strict authentication gate in their <head> section:
    index.html, booking.html, ticket.html, and admin.html.
    """
    PAGES = ["index.html", "booking.html", "ticket.html", "admin.html"]

    def test_pages_exist(self):
        """Ensure all target pages exist in the root directory."""
        for page in self.PAGES:
            self.assertTrue(os.path.exists(page), f"{page} must exist in the workspace root")

    def test_pages_contain_auth_guard_scripts(self):
        """Verify all 4 pages contain Supabase CDN, supabase-client.js, auth-guard.js, and SummitAuthGuard.init()."""
        for page in self.PAGES:
            with open(page, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn(
                "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
                content,
                f"{page} must include Supabase JS SDK CDN"
            )
            self.assertIn(
                "js/supabase-client.js",
                content,
                f"{page} must include js/supabase-client.js"
            )
            self.assertIn(
                "js/auth-guard.js",
                content,
                f"{page} must include js/auth-guard.js"
            )
            self.assertIn(
                "SummitAuthGuard.init()",
                content,
                f"{page} must call SummitAuthGuard.init()"
            )

    def test_auth_guard_placed_in_head(self):
        """Verify the authentication guard scripts are located inside the <head> tag for early interception."""
        for page in self.PAGES:
            with open(page, "r", encoding="utf-8") as f:
                content = f.read()

            head_match = re.search(r"<head>(.*?)</head>", content, re.DOTALL | re.IGNORECASE)
            self.assertIsNotNone(head_match, f"{page} must have a valid <head> tag")

            head_content = head_match.group(1)
            self.assertIn(
                "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
                head_content,
                f"{page} must load Supabase JS SDK CDN within <head>"
            )
            self.assertIn(
                "js/supabase-client.js",
                head_content,
                f"{page} must load js/supabase-client.js within <head>"
            )
            self.assertIn(
                "js/auth-guard.js",
                head_content,
                f"{page} must load auth-guard.js within <head> to prevent unauthenticated rendering flash"
            )
            self.assertIn(
                "SummitAuthGuard.init()",
                head_content,
                f"{page} must initialize SummitAuthGuard within <head>"
            )


if __name__ == '__main__':
    unittest.main()
