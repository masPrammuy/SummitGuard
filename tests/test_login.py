import os
import unittest
import re

class TestLogin(unittest.TestCase):
    def setUp(self):
        self.html_path = "login.html"
        self.js_path = "js/login.js"

    def test_login_files_exist(self):
        """Verify login.html and js/login.js exist."""
        self.assertTrue(os.path.exists(self.html_path), f"{self.html_path} must exist")
        self.assertTrue(os.path.exists(self.js_path), f"{self.js_path} must exist")

    def test_no_demo_login_present(self):
        """Verify ABSOLUTELY NO demo login buttons or guest bypasses exist in login.html or js/login.js."""
        for path in [self.html_path, self.js_path]:
            if not os.path.exists(path):
                self.fail(f"{path} does not exist")
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().lower()

            # Disallowed keywords and patterns related to demo login / guest bypass
            self.assertNotIn("demo-login", content, f"demo-login found in {path}")
            self.assertNotIn("demologin", content, f"demologin found in {path}")
            self.assertNotIn("demo-btn", content, f"demo-btn found in {path}")
            self.assertNotIn("tombol demo", content, f"tombol demo found in {path}")
            self.assertNotIn("masuk sebagai demo", content, f"masuk sebagai demo found in {path}")
            self.assertNotIn("akun demo", content, f"akun demo found in {path}")
            self.assertNotIn("guest bypass", content, f"guest bypass found in {path}")
            self.assertNotIn("quick-demo", content, f"quick-demo found in {path}")

    def test_login_html_scripts_and_resources(self):
        """Verify login.html includes Supabase v2, dependencies, Google fonts, and Tailwind CSS."""
        if not os.path.exists(self.html_path):
            self.fail(f"{self.html_path} does not exist")

        with open(self.html_path, "r", encoding="utf-8") as f:
            content = f.read()

        # CDN scripts and styles
        self.assertIn("https://cdn.tailwindcss.com", content, "login.html must load Tailwind CSS")
        self.assertIn("Plus+Jakarta+Sans", content, "login.html must link Plus Jakarta Sans font")
        self.assertIn("@supabase/supabase-js@2", content, "login.html must include Supabase JS SDK v2 CDN")

        # Local JS files
        self.assertIn("js/supabase-client.js", content, "login.html must include js/supabase-client.js")
        self.assertIn("js/auth-guard.js", content, "login.html must include js/auth-guard.js")
        self.assertIn("js/login.js", content, "login.html must include js/login.js")
        self.assertNotIn("js/navbar.js", content, "login.html should not include js/navbar.js since it has a dedicated header")

    def test_login_html_elements_and_forms(self):
        """Verify required IDs, inputs, buttons, brand logo, and alert container in login.html."""
        if not os.path.exists(self.html_path):
            self.fail(f"{self.html_path} does not exist")

        with open(self.html_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Branding & Mountain Theme
        self.assertIn("SummitGuard", content, "Must display SummitGuard brand")
        self.assertIn("SIMAKSI & Mitigasi BMKG", content, "Must include subtitle/tagline")
        self.assertTrue("emerald" in content or "green" in content, "Must use emerald mountain theme")

        # Tab switcher
        self.assertIn("tab-signin", content, "Must have tab-signin element")
        self.assertIn("tab-signup", content, "Must have tab-signup element")
        self.assertIn("Masuk", content, "Must have 'Masuk' tab label")
        self.assertIn("Daftar Akun", content, "Must have 'Daftar Akun' tab label")

        # Sign In Form elements
        self.assertIn('id="login-email"', content, "Sign in must have id='login-email'")
        self.assertIn('id="login-password"', content, "Sign in must have id='login-password'")
        self.assertIn('id="login-submit-btn"', content, "Sign in must have id='login-submit-btn'")
        self.assertIn("Masuk ke Sistem", content, "Submit button text must be 'Masuk ke Sistem'")

        # Sign Up Form elements
        self.assertIn('id="register-fullname"', content, "Sign up must have id='register-fullname'")
        self.assertIn('id="register-email"', content, "Sign up must have id='register-email'")
        self.assertIn('id="register-password"', content, "Sign up must have id='register-password'")
        self.assertIn('id="register-confirm-password"', content, "Sign up must have id='register-confirm-password'")
        self.assertIn('id="register-submit-btn"', content, "Sign up must have id='register-submit-btn'")
        self.assertIn("Daftar Akun Baru", content, "Sign up button text must be 'Daftar Akun Baru'")

        # Google OAuth Button
        self.assertIn('id="google-login-btn"', content, "Must have Google OAuth button id='google-login-btn'")
        self.assertIn("Lanjutkan dengan Google", content, "Google button text must be 'Lanjutkan dengan Google'")
        # SVG icon in google button
        self.assertRegex(content, r'<button[^>]*id="google-login-btn"[^>]*>[\s\S]*?<svg', "Google button must contain SVG icon")

        # Status / Alert container
        self.assertIn('id="auth-alert"', content, "Must contain alert container id='auth-alert'")

    def test_login_js_umd_and_methods(self):
        """Verify js/login.js uses UMD and exposes all required methods on SummitLogin."""
        if not os.path.exists(self.js_path):
            self.fail(f"{self.js_path} does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            content = f.read()

        # UMD checks
        self.assertRegex(content, r"typeof\s+define\s*===\s*['\"]function['\"]\s*&&\s*define\.amd", "UMD must support AMD")
        self.assertRegex(content, r"typeof\s+module\s*===\s*['\"]object['\"]\s*&&\s*module\.exports", "UMD must support CommonJS")
        self.assertIn("SummitLogin", content, "SummitLogin must be exported")

        # Required methods
        required_methods = [
            "switchTab",
            "handleLogin",
            "handleRegister",
            "handleGoogleLogin",
            "getRedirectUrl",
            "init"
        ]
        for method in required_methods:
            self.assertIn(method, content, f"Method '{method}' must be defined in {self.js_path}")

    def test_login_js_logic_and_validation(self):
        """Verify login, registration validation, OAuth, and redirect logic in js/login.js."""
        if not os.path.exists(self.js_path):
            self.fail(f"{self.js_path} does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Login calls SummitSupabase.login
        self.assertIn("SummitSupabase.login", content, "handleLogin must invoke SummitSupabase.login")

        # Register calls SummitSupabase.register
        self.assertIn("SummitSupabase.register", content, "handleRegister must invoke SummitSupabase.register")

        # Register password matching validation
        self.assertTrue(
            "!== confirm" in content or "!= confirm" in content or "password !== confirmPassword" in content or "confirmPassword" in content,
            "handleRegister must validate that password and confirmation match"
        )
        # Min length validation (e.g., 6 chars)
        self.assertTrue(
            ".length < 6" in content or "< 6" in content,
            "handleRegister must validate password minimum length (min 6 chars)"
        )

        # Google login calls SummitSupabase.loginWithGoogle
        self.assertIn("SummitSupabase.loginWithGoogle", content, "handleGoogleLogin must invoke SummitSupabase.loginWithGoogle")

        # Redirect query parameter extraction
        self.assertIn("redirect", content, "getRedirectUrl must parse redirect query parameter")
        self.assertIn("index.html", content, "getRedirectUrl must fallback to index.html")

        # Initial auth check using SummitSupabase.getSession()
        self.assertIn("SummitSupabase.getSession", content, "init() must verify existing session via SummitSupabase.getSession")

    def test_alert_dom_xss_protection(self):
        """Verify DOM XSS protection: _escapeHtml helper escapes special chars and is called in showAlert."""
        if not os.path.exists(self.js_path):
            self.fail(f"{self.js_path} does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            content = f.read()

        # HTML escaping helper
        self.assertIn("function _escapeHtml", content, "js/login.js must define _escapeHtml helper")
        self.assertIn("&amp;", content)
        self.assertIn("&lt;", content)
        self.assertIn("&gt;", content)
        self.assertIn("&quot;", content)
        self.assertIn("&#39;", content)

        # showAlert escaping
        self.assertIn("_escapeHtml(message)", content, "showAlert must escape message before embedding into DOM")

    def test_sanitize_redirect_hardening(self):
        """Verify _sanitizeRedirectUrl hardening against backslashes, external origins, and login self-redirect loops."""
        if not os.path.exists(self.js_path):
            self.fail(f"{self.js_path} does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Backslash rejection
        self.assertIn(r"trimmed.includes('\\')", content, "_sanitizeRedirectUrl must reject backslashes")

        # Self-redirect loop rejection
        self.assertIn("_isLoginTarget", content, "js/login.js must define _isLoginTarget helper")
        self.assertIn(r"/(^|\/)login(\.html)?$/i", content, "_isLoginTarget must match login path boundaries")

        # Origin verification & scheme rejection
        self.assertIn("parsed.origin !== baseOrigin", content, "_sanitizeRedirectUrl must verify origin equality")
        self.assertIn("index.html", content, "_sanitizeRedirectUrl must fallback to index.html")

    def test_syntax_and_bracket_integrity(self):
        """Verify bracket matching and absence of UTF-8 mojibake in js/login.js."""
        if not os.path.exists(self.js_path):
            self.fail(f"{self.js_path} does not exist")

        with open(self.js_path, "r", encoding="utf-8") as f:
            content = f.read()

        self._verify_brackets(content, self.js_path)

        with open(self.js_path, "rb") as f:
            raw = f.read()
        self.assertNotIn(b"\xc3\x82\xc2\xb0", raw, f"Mojibake found in {self.js_path}")

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
