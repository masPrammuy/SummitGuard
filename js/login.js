/**
 * SummitGuard - Dedicated Login, Registration & Google OAuth Controller
 * Manages authentication flow, tab switching, form validation, and OAuth redirection.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const login = factory();
    root.SummitLogin = login;
    if (typeof window !== 'undefined') {
      window.SummitLogin = login;
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.SummitLogin = login;
    }
  }
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this), function () {
  'use strict';

  /**
   * Safe check for browser environment
   */
  function _isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  /**
   * Sanitize redirect target URL to prevent open redirect vulnerabilities
   * @param {string} url
   * @returns {string}
   */
  function _sanitizeRedirectUrl(url) {
    if (!url || typeof url !== 'string') return 'index.html';
    const trimmed = url.trim();

    // Block protocol-relative URLs (//example.com) and javascript:
    if (trimmed.startsWith('//') || trimmed.toLowerCase().startsWith('javascript:')) {
      return 'index.html';
    }

    // Absolute URLs: allow only if origin matches current location origin
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (_isBrowser() && window.location && window.location.origin) {
        try {
          const parsed = new URL(trimmed, window.location.origin);
          if (parsed.origin === window.location.origin) {
            return parsed.pathname + parsed.search + parsed.hash;
          }
        } catch (e) {
          return 'index.html';
        }
      }
      return 'index.html';
    }

    return trimmed;
  }

  /**
   * Parse redirect target from window.location.search (?redirect=...)
   * @returns {string}
   */
  function getRedirectUrl() {
    if (!_isBrowser()) return 'index.html';

    try {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get('redirect');
      if (redirectParam) {
        return _sanitizeRedirectUrl(redirectParam);
      }
    } catch (e) {
      // Fallback
    }

    return 'index.html';
  }

  /**
   * Display status or error alert box
   * @param {string} message
   * @param {'error'|'success'|'info'} [type='error']
   */
  function showAlert(message, type) {
    if (!_isBrowser()) return;
    const alertEl = document.getElementById('auth-alert');
    if (!alertEl) return;

    const alertType = type || 'error';
    let bgClasses = '';
    let iconSvg = '';

    if (alertType === 'success') {
      bgClasses = 'bg-emerald-950/90 text-emerald-200 border-emerald-600/60';
      iconSvg = '<svg class="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    } else if (alertType === 'info') {
      bgClasses = 'bg-blue-950/90 text-blue-200 border-blue-600/60';
      iconSvg = '<svg class="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    } else {
      bgClasses = 'bg-red-950/90 text-red-200 border-red-600/60';
      iconSvg = '<svg class="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
    }

    alertEl.className = 'p-3.5 rounded-xl text-xs border leading-relaxed flex items-start gap-2.5 ' + bgClasses;
    alertEl.innerHTML = iconSvg + '<div class="flex-1">' + message + '</div>';
    alertEl.classList.remove('hidden');
  }

  /**
   * Hide status alert box
   */
  function clearAlert() {
    if (!_isBrowser()) return;
    const alertEl = document.getElementById('auth-alert');
    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.innerHTML = '';
    }
  }

  /**
   * Switch between Sign In and Sign Up tabs
   * @param {'signin'|'signup'} tabName
   */
  function switchTab(tabName) {
    if (!_isBrowser()) return;
    clearAlert();

    const tabSignIn = document.getElementById('tab-signin');
    const tabSignUp = document.getElementById('tab-signup');
    const formSignIn = document.getElementById('form-signin');
    const formSignUp = document.getElementById('form-signup');

    const activeClasses = ['bg-emerald-600', 'text-white', 'shadow-md'];
    const inactiveClasses = ['text-emerald-300/80', 'hover:text-white'];

    if (tabName === 'signup') {
      if (tabSignIn) {
        tabSignIn.classList.remove(...activeClasses);
        tabSignIn.classList.add(...inactiveClasses);
      }
      if (tabSignUp) {
        tabSignUp.classList.remove(...inactiveClasses);
        tabSignUp.classList.add(...activeClasses);
      }
      if (formSignIn) formSignIn.classList.add('hidden');
      if (formSignUp) formSignUp.classList.remove('hidden');

      const fullnameInput = document.getElementById('register-fullname');
      if (fullnameInput) fullnameInput.focus();
    } else {
      if (tabSignUp) {
        tabSignUp.classList.remove(...activeClasses);
        tabSignUp.classList.add(...inactiveClasses);
      }
      if (tabSignIn) {
        tabSignIn.classList.remove(...inactiveClasses);
        tabSignIn.classList.add(...activeClasses);
      }
      if (formSignUp) formSignUp.classList.add('hidden');
      if (formSignIn) formSignIn.classList.remove('hidden');

      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.focus();
    }
  }

  /**
   * Handle user login submission
   * @param {Event} [e]
   */
  async function handleLogin(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    clearAlert();

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit-btn');

    const email = (emailInput && emailInput.value || '').trim();
    const password = (passwordInput && passwordInput.value || '');

    if (!email) {
      showAlert('Alamat email wajib diisi.', 'error');
      if (emailInput) emailInput.focus();
      return;
    }

    if (!password) {
      showAlert('Kata sandi wajib diisi.', 'error');
      if (passwordInput) passwordInput.focus();
      return;
    }

    // Set loading button state
    let originalBtnHtml = '';
    if (submitBtn) {
      originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Memverifikasi Akun...</span>
      `;
    }

    try {
      if (typeof SummitSupabase === 'undefined' || !SummitSupabase.login) {
        throw new Error('Layanan autentikasi SummitSupabase belum dimuat.');
      }

      const result = await SummitSupabase.login(email, password);

      if (result.error) {
        showAlert(result.error.message || 'Email atau kata sandi tidak sesuai.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
        return;
      }

      showAlert('Berhasil masuk! Mengalihkan ke sistem...', 'success');
      const targetUrl = getRedirectUrl();
      setTimeout(function () {
        if (_isBrowser()) {
          window.location.href = targetUrl;
        }
      }, 350);

    } catch (err) {
      console.error('Login error:', err);
      showAlert(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  }

  /**
   * Handle user registration submission
   * @param {Event} [e]
   */
  async function handleRegister(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    clearAlert();

    const fullnameInput = document.getElementById('register-fullname');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    const submitBtn = document.getElementById('register-submit-btn');

    const fullName = (fullnameInput && fullnameInput.value || '').trim();
    const email = (emailInput && emailInput.value || '').trim();
    const password = (passwordInput && passwordInput.value || '');
    const confirmPassword = (confirmPasswordInput && confirmPasswordInput.value || '');

    // Form validations
    if (!fullName) {
      showAlert('Nama lengkap sesuai KTP wajib diisi.', 'error');
      if (fullnameInput) fullnameInput.focus();
      return;
    }

    if (!email) {
      showAlert('Alamat email wajib diisi.', 'error');
      if (emailInput) emailInput.focus();
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showAlert('Format email tidak valid. Masukkan email yang benar.', 'error');
      if (emailInput) emailInput.focus();
      return;
    }

    if (!password) {
      showAlert('Kata sandi wajib diisi.', 'error');
      if (passwordInput) passwordInput.focus();
      return;
    }

    if (password.length < 6) {
      showAlert('Kata sandi minimal terdiri dari 6 karakter.', 'error');
      if (passwordInput) passwordInput.focus();
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Konfirmasi kata sandi tidak cocok. Pastikan kedua sandi sama.', 'error');
      if (confirmPasswordInput) confirmPasswordInput.focus();
      return;
    }

    // Set loading button state
    let originalBtnHtml = '';
    if (submitBtn) {
      originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Mendaftarkan Akun...</span>
      `;
    }

    try {
      if (typeof SummitSupabase === 'undefined' || !SummitSupabase.register) {
        throw new Error('Layanan pendaftaran SummitSupabase belum dimuat.');
      }

      const metadata = {
        full_name: fullName,
        fullName: fullName,
        role: 'Pendaki'
      };

      const result = await SummitSupabase.register(email, password, metadata);

      if (result.error) {
        showAlert(result.error.message || 'Pendaftaran gagal. Periksa kembali data Anda.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
        return;
      }

      // Check if session was auto-created
      const hasSession = result.data && (result.data.session || (typeof SummitSupabase.getSession === 'function' && SummitSupabase.getSession()));

      if (hasSession) {
        showAlert('Akun berhasil dibuat! Mengalihkan ke sistem...', 'success');
        const targetUrl = getRedirectUrl();
        setTimeout(function () {
          if (_isBrowser()) {
            window.location.href = targetUrl;
          }
        }, 400);
      } else {
        // Confirmation / switch to login
        showAlert('Pendaftaran berhasil! Silakan masuk dengan email dan kata sandi Anda.', 'success');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
        switchTab('signin');
        const loginEmailInput = document.getElementById('login-email');
        if (loginEmailInput) loginEmailInput.value = email;
        const loginPasswordInput = document.getElementById('login-password');
        if (loginPasswordInput) {
          loginPasswordInput.value = '';
          loginPasswordInput.focus();
        }
      }

    } catch (err) {
      console.error('Registration error:', err);
      showAlert(err.message || 'Terjadi kesalahan sistem saat pendaftaran akun.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  }

  /**
   * Handle Google OAuth authentication
   */
  async function handleGoogleLogin() {
    clearAlert();
    const googleBtn = document.getElementById('google-login-btn');
    let originalBtnHtml = '';

    if (googleBtn) {
      originalBtnHtml = googleBtn.innerHTML;
      googleBtn.disabled = true;
      googleBtn.innerHTML = `
        <svg class="animate-spin h-4 w-4 text-slate-700 inline" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Menghubungkan ke Google...</span>
      `;
    }

    try {
      if (typeof SummitSupabase === 'undefined' || !SummitSupabase.loginWithGoogle) {
        throw new Error('Layanan Google OAuth belum tersedia.');
      }

      const redirectTarget = getRedirectUrl();
      const result = await SummitSupabase.loginWithGoogle(redirectTarget);

      if (result && result.error) {
        showAlert(result.error.message || 'Gagal memulai otorisasi Google OAuth.', 'error');
        if (googleBtn) {
          googleBtn.disabled = false;
          googleBtn.innerHTML = originalBtnHtml;
        }
      }
    } catch (err) {
      console.error('Google OAuth error:', err);
      showAlert(err.message || 'Terjadi gangguan saat otorisasi Google.', 'error');
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.innerHTML = originalBtnHtml;
      }
    }
  }

  /**
   * Initialize login controller, event listeners, and check for existing session
   */
  async function init() {
    if (!_isBrowser()) return;

    // Check if user already has an active authenticated session
    if (typeof SummitSupabase !== 'undefined' && SummitSupabase && typeof SummitSupabase.getSession === 'function') {
      try {
        const session = await SummitSupabase.getSession();
        if (session && (session.user || session.access_token)) {
          window.location.href = getRedirectUrl();
          return;
        }
      } catch (err) {
        // Continue to show login form
      }
    }

    // Attach Tab Switchers
    const tabSignIn = document.getElementById('tab-signin');
    const tabSignUp = document.getElementById('tab-signup');
    if (tabSignIn) {
      tabSignIn.addEventListener('click', function () {
        switchTab('signin');
      });
    }
    if (tabSignUp) {
      tabSignUp.addEventListener('click', function () {
        switchTab('signup');
      });
    }

    // Attach Form Submissions
    const formSignIn = document.getElementById('form-signin');
    if (formSignIn) {
      formSignIn.addEventListener('submit', handleLogin);
    }
    const formSignUp = document.getElementById('form-signup');
    if (formSignUp) {
      formSignUp.addEventListener('submit', handleRegister);
    }

    // Attach Google OAuth Button
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
      googleBtn.addEventListener('click', handleGoogleLogin);
    }

    // Detect initial tab from query parameter: ?tab=signup or ?tab=register
    try {
      const params = new URLSearchParams(window.location.search);
      const initialTab = (params.get('tab') || '').toLowerCase();
      if (initialTab === 'signup' || initialTab === 'register' || initialTab === 'daftar') {
        switchTab('signup');
      } else {
        switchTab('signin');
      }
    } catch (e) {
      switchTab('signin');
    }
  }

  // Auto-init on DOMContentLoaded
  if (_isBrowser()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    switchTab: switchTab,
    handleLogin: handleLogin,
    handleRegister: handleRegister,
    handleGoogleLogin: handleGoogleLogin,
    getRedirectUrl: getRedirectUrl,
    showAlert: showAlert,
    clearAlert: clearAlert,
    init: init
  };
}));
