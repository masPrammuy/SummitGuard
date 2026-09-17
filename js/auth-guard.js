/**
 * SummitGuard - Strict Authentication Gate & Page Interceptor
 * Intercepts unauthenticated navigation on protected pages and redirects to login.html
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const authGuard = factory();
    root.SummitAuthGuard = authGuard;
    if (typeof window !== 'undefined') {
      window.SummitAuthGuard = authGuard;
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.SummitAuthGuard = authGuard;
    }
  }
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this), function () {
  'use strict';

  /**
   * Check if current environment is running inside a browser window
   */
  function _isBrowser() {
    return typeof window !== 'undefined' && typeof window.location !== 'undefined';
  }

  /**
   * Check if the current location is the login page to avoid redirect loops
   * @param {string} [customLoginUrl] - Optional custom login URL to compare against
   */
  function _isLoginPage(customLoginUrl) {
    if (!_isBrowser()) return false;
    const pathname = (window.location.pathname || '').toLowerCase();
    if (/(^|\/)login(\.html)?$/i.test(pathname)) {
      return true;
    }
    if (customLoginUrl && typeof customLoginUrl === 'string') {
      const cleanCustom = customLoginUrl.split('?')[0].toLowerCase();
      if (pathname.endsWith(cleanCustom) || pathname === cleanCustom) {
        return true;
      }
    }
    return false;
  }

  /**
   * Asynchronously verify active authentication session and redirect if unauthenticated
   * @param {Object} [options] - Options for auth checking
   * @param {string} [options.loginUrl='login.html'] - Custom login page URL
   * @param {string} [options.targetUrl] - Custom destination URL to return after login
   * @returns {Promise<{ authenticated: boolean, redirected: boolean, session?: any, user?: any }>}
   */
  async function checkAuthAndRedirect(options) {
    options = options || {};
    const loginUrl = options.loginUrl || 'login.html';

    // 1. Bypass redirect if already on login page
    if (_isBrowser() && _isLoginPage(loginUrl)) {
      let activeSession = null;
      if (typeof SummitSupabase !== 'undefined' && SummitSupabase && typeof SummitSupabase.getSession === 'function') {
        try {
          activeSession = await SummitSupabase.getSession();
        } catch (e) {
          activeSession = null;
        }
      }
      return {
        authenticated: Boolean(activeSession),
        redirected: false,
        session: activeSession || null,
        user: (activeSession && activeSession.user) || null
      };
    }

    // 2. Fetch session from SummitSupabase
    let session = null;
    if (typeof SummitSupabase !== 'undefined' && SummitSupabase) {
      if (typeof SummitSupabase.getSession === 'function') {
        try {
          session = await SummitSupabase.getSession();
        } catch (err) {
          console.warn('Gagal memverifikasi sesi SummitSupabase:', err);
          session = null;
        }
      }

      // If session not found in cache, check Supabase client SDK if active
      if (!session && typeof SummitSupabase.getSupabase === 'function') {
        const client = SummitSupabase.getSupabase();
        if (client && client.auth && typeof client.auth.getSession === 'function') {
          try {
            const { data } = await client.auth.getSession();
            if (data && data.session) {
              session = data.session;
            }
          } catch (e) {
            // Ignore background error
          }
        }
      }
    }

    // 3. If authenticated session exists
    if (session && (session.user || session.access_token)) {
      const user = session.user || (typeof SummitSupabase !== 'undefined' && SummitSupabase.getUser ? SummitSupabase.getUser() : null);
      return {
        authenticated: true,
        session: session,
        user: user
      };
    }

    // 4. If unauthenticated in browser environment, redirect to login page
    if (_isBrowser()) {
      const targetUrl = options.targetUrl || window.location.href;
      const separator = loginUrl.includes('?') ? '&' : '?';
      const redirectUrl = loginUrl + separator + 'redirect=' + encodeURIComponent(targetUrl);

      window.location.href = redirectUrl;

      return {
        authenticated: false,
        redirected: true
      };
    }

    return {
      authenticated: false,
      redirected: false
    };
  }

  /**
   * Log out active user and redirect to login page
   * @param {string} [loginUrl='login.html'] - Custom login page URL
   * @returns {Promise<{ loggedOut: boolean, redirected: boolean, destination: string }>}
   */
  async function logoutAndRedirect(loginUrl) {
    const dest = loginUrl || 'login.html';

    if (typeof SummitSupabase !== 'undefined' && SummitSupabase && typeof SummitSupabase.logout === 'function') {
      try {
        await SummitSupabase.logout();
      } catch (err) {
        console.warn('SummitSupabase logout error:', err);
      }
    }

    if (_isBrowser()) {
      window.location.href = dest;
    }

    return {
      loggedOut: true,
      redirected: _isBrowser(),
      destination: dest
    };
  }

  /**
   * Helper to automatically execute auth check on DOM initialization
   * @param {Object} [options]
   * @returns {Promise<any>}
   */
  function init(options) {
    if (_isBrowser()) {
      if (document.readyState === 'loading') {
        return new Promise(function (resolve) {
          document.addEventListener('DOMContentLoaded', async function () {
            const result = await checkAuthAndRedirect(options);
            resolve(result);
          });
        });
      } else {
        return checkAuthAndRedirect(options);
      }
    }
    return Promise.resolve(null);
  }

  const SummitAuthGuard = {
    checkAuthAndRedirect: checkAuthAndRedirect,
    logoutAndRedirect: logoutAndRedirect,
    init: init
  };

  return SummitAuthGuard;
}));
