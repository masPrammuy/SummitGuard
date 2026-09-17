import os
import unittest
import re

class TestAuthGuard(unittest.TestCase):
    def setUp(self):
        self.guard_path = "js/auth-guard.js"
        self.navbar_path = "js/navbar.js"

    def test_auth_guard_file_exists(self):
        """Verify js/auth-guard.js file exists."""
        self.assertTrue(os.path.exists(self.guard_path), f"{self.guard_path} must exist")

    def test_auth_guard_umd_and_exports(self):
        """Verify UMD pattern and SummitAuthGuard export structure."""
        if not os.path.exists(self.guard_path):
            self.fail(f"{self.guard_path} does not exist")

        with open(self.guard_path, "r", encoding="utf-8") as f:
            content = f.read()

        # UMD check
        self.assertRegex(content, r"typeof\s+define\s*===\s*['\"]function['\"]\s*&&\s*define\.amd", "UMD must support AMD")
        self.assertRegex(content, r"typeof\s+module\s*===\s*['\"]object['\"]\s*&&\s*module\.exports", "UMD must support CommonJS")
        self.assertIn("SummitAuthGuard", content, "SummitAuthGuard must be attached to global/root")

        # Exported functions
        required_methods = [
            "checkAuthAndRedirect",
            "logoutAndRedirect",
            "init"
        ]
        for method in required_methods:
            self.assertIn(method, content, f"Method '{method}' must be defined in {self.guard_path}")

    def test_auth_guard_redirect_logic(self):
        """Verify checkAuthAndRedirect logic, login.html bypass, redirect url, and return values."""
        if not os.path.exists(self.guard_path):
            self.fail(f"{self.guard_path} does not exist")

        with open(self.guard_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Checks SummitSupabase.getSession
        self.assertIn("SummitSupabase", content)
        self.assertIn("getSession", content)

        # Login page detection bypass (do not loop-redirect login.html)
        self.assertIn("login.html", content)

        # Target url encoding
        self.assertIn("encodeURIComponent", content)

        # Redirect query parameter
        self.assertIn("redirect=", content)

        # Return signature values
        self.assertIn("authenticated", content)
        self.assertIn("redirected", content)
        self.assertIn("session", content)
        self.assertIn("user", content)

    def test_auth_guard_options_and_defaults(self):
        """Verify checkAuthAndRedirect handles default options and custom loginUrl."""
        with open(self.guard_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("options.loginUrl", content)
        self.assertIn("'login.html'", content)
        self.assertIn("init", content)

    def test_auth_guard_logout_logic(self):
        """Verify logoutAndRedirect calls SummitSupabase.logout and navigates to login."""
        if not os.path.exists(self.guard_path):
            self.fail(f"{self.guard_path} does not exist")

        with open(self.guard_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("logoutAndRedirect", content)
        self.assertIn("logout", content)
        self.assertIn("location.href", content)

    def test_navbar_auth_integration(self):
        """Verify js/navbar.js integrates SummitSupabase user session and renders profile badge or login button."""
        self.assertTrue(os.path.exists(self.navbar_path), f"{self.navbar_path} must exist")

        with open(self.navbar_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check SummitSupabase integration
        self.assertIn("SummitSupabase", content, "js/navbar.js must reference SummitSupabase")
        self.assertIn("getUser", content, "js/navbar.js must call getUser to obtain active user profile")

        # Check user profile pill elements
        self.assertIn("Keluar", content, "Navbar must contain 'Keluar' logout button")
        self.assertIn("Masuk", content, "Navbar must contain 'Masuk' button when unauthenticated")
        self.assertIn("login.html", content, "Navbar 'Masuk' link must point to login.html")

        # Check logout event / handler trigger
        self.assertTrue(
            "logout" in content,
            "Navbar must attach logout trigger calling SummitSupabase.logout()"
        )

        # Check avatar rendering support (user_metadata avatar_url or initial)
        self.assertTrue(
            "avatar_url" in content or "avatar" in content,
            "Navbar must handle avatar_url"
        )

    def test_navbar_user_data_escaping_and_sanitization(self):
        """Verify HTML escaping helper and avatar URL validation preventing XSS in navbar."""
        with open(self.navbar_path, "r", encoding="utf-8") as f:
            content = f.read()

        # HTML escaping helper
        self.assertIn("_escapeHtml", content, "js/navbar.js must define _escapeHtml helper")
        self.assertIn("&amp;", content)
        self.assertIn("&lt;", content)
        self.assertIn("&gt;", content)
        self.assertIn("&quot;", content)
        self.assertIn("&#39;", content)

        # Avatar protocol validation helper
        self.assertIn("_isValidAvatarUrl", content, "js/navbar.js must define _isValidAvatarUrl")
        self.assertIn("https://", content)
        self.assertIn("http://", content)

        # Sanitization before embedding in HTML
        self.assertIn("_escapeHtml(rawDisplayName)", content)
        self.assertIn("_escapeHtml(rawEmail)", content)
        self.assertIn("_isValidAvatarUrl(rawAvatar)", content)

    def test_auth_guard_init_promise_and_login_regex(self):
        """Verify init() returns a Promise and _isLoginPage uses regex boundary matching."""
        with open(self.guard_path, "r", encoding="utf-8") as f:
            content = f.read()

        # init Promise return
        self.assertIn("new Promise", content, "init() must return a Promise when DOM is loading")
        self.assertIn("DOMContentLoaded", content)
        self.assertIn("resolve(result)", content)

        # _isLoginPage regex boundary matching
        self.assertIn("login", content)
        self.assertIn("customLoginUrl", content)
        self.assertIn(".test(pathname)", content)

    def test_syntax_and_bracket_integrity(self):
        """Verify bracket matching and absence of UTF-8 mojibake in both files."""
        for path in [self.guard_path, self.navbar_path]:
            if not os.path.exists(path):
                self.fail(f"{path} does not exist")

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            self._verify_brackets(content, path)

            with open(path, "rb") as f:
                raw = f.read()
            self.assertNotIn(b"\xc3\x82\xc2\xb0", raw, f"Mojibake found in {path}")

    def _verify_brackets(self, content, filename):
        cleaned = []
        i = 0
        n = len(content)
        in_single = False
        in_double = False
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
            elif in_single:
                if c == '\\':
                    i += 1
                elif c == '\'':
                    in_single = False
            elif in_double:
                if c == '\\':
                    i += 1
                elif c == '\"':
                    in_double = False
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
                    in_single = True
                elif c == '\"':
                    in_double = True
                elif c == '`':
                    in_backtick = True
                else:
                    cleaned.append(c)
            i += 1

        stripped = ''.join(cleaned)
        stack = []
        pairs = {')': '(', '}': '{', ']': '['}
        for idx, ch in enumerate(stripped):
            if ch in '({[':
                stack.append((ch, idx))
            elif ch in ')}]':
                self.assertTrue(len(stack) > 0, f"Unmatched closing '{ch}' in {filename} at index {idx}")
                last, _ = stack.pop()
                self.assertEqual(last, pairs[ch], f"Mismatched bracket in {filename}: '{last}' with '{ch}' at {idx}")
        self.assertEqual(len(stack), 0, f"Unclosed brackets in {filename}: {stack}")

if __name__ == '__main__':
    unittest.main()
