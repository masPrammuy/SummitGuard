/**
 * SummitGuard - Supabase Client Connector & Authentication Manager
 * Handles Supabase v2 initialization, Google OAuth, Email/Password auth,
 * user session state, and resilient local storage fallback for offline/demo operation.
 */

(function (global) {
  'use strict';

  // Storage Keys for Supabase Config and Session State
  const STORAGE_KEYS = {
    CONFIG_URL: 'summit_supabase_url',
    CONFIG_KEY: 'summit_supabase_anon_key',
    ACTIVE_SESSION: 'summit_active_session',
    ACTIVE_USER: 'summit_active_user',
    LOCAL_ACCOUNTS: 'summit_local_users'
  };

  // In-memory storage fallback for environments without localStorage
  const _memoryStore = {};
  let _storageAvailableCached = null;

  function _isStorageAvailable() {
    if (_storageAvailableCached !== null) return _storageAvailableCached;
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        _storageAvailableCached = false;
        return false;
      }
      const testKey = '__summit_supa_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      _storageAvailableCached = true;
      return true;
    } catch (e) {
      _storageAvailableCached = false;
      return false;
    }
  }

  function _getItem(key) {
    if (_isStorageAvailable()) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch (e) {
        // fall through
      }
    }
    return _memoryStore[key] || null;
  }

  function _setItem(key, value) {
    _memoryStore[key] = value;
    if (_isStorageAvailable()) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        console.warn('localStorage setItem failed:', e);
      }
    }
  }

  function _removeItem(key) {
    delete _memoryStore[key];
    if (_isStorageAvailable()) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        // ignore
      }
    }
  }

  // Active Supabase client instance
  let _client = null;

  // Active session and user caches
  function _getActiveSession() {
    const raw = _getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function _setActiveSession(session) {
    if (session) {
      _setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    } else {
      _removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }
  }

  function _getActiveUser() {
    const raw = _getItem(STORAGE_KEYS.ACTIVE_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function _setActiveUser(user) {
    if (user) {
      _setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    } else {
      _removeItem(STORAGE_KEYS.ACTIVE_USER);
    }
  }

  function _clearActiveAuth() {
    _removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    _removeItem(STORAGE_KEYS.ACTIVE_USER);
  }

  // Local Accounts Helper for offline / resilient fallback
  function _getLocalAccounts() {
    const raw = _getItem(STORAGE_KEYS.LOCAL_ACCOUNTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  }

  function _saveLocalAccounts(accounts) {
    _setItem(STORAGE_KEYS.LOCAL_ACCOUNTS, JSON.stringify(accounts));
  }

  function _localRegister(email, password, metadata) {
    const accounts = _getLocalAccounts();
    const existing = accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return {
        data: null,
        error: { message: 'Akun dengan email ini sudah terdaftar.' }
      };
    }

    const fullName = (metadata && (metadata.full_name || metadata.name)) || email.split('@')[0];
    const role = (metadata && metadata.role) || 'Pendaki';
    const avatarUrl = (metadata && metadata.avatar_url) || null;

    const newUser = {
      id: 'usr-local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      email: email.trim().toLowerCase(),
      user_metadata: {
        full_name: fullName,
        role: role,
        avatar_url: avatarUrl,
        ...(metadata || {})
      },
      created_at: new Date().toISOString()
    };

    accounts.push({
      email: newUser.email,
      password: password, // Stored for local offline fallback only
      user: newUser
    });
    _saveLocalAccounts(accounts);

    const session = {
      access_token: 'summit_local_jwt_' + Date.now(),
      token_type: 'bearer',
      user: newUser
    };

    _setActiveSession(session);
    _setActiveUser(newUser);

    return {
      data: { user: newUser, session: session },
      error: null
    };
  }

  function _localLogin(email, password) {
    const accounts = _getLocalAccounts();
    const found = accounts.find(
      a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
    );

    if (!found) {
      return {
        data: null,
        error: { message: 'Email atau kata sandi tidak cocok.' }
      };
    }

    const session = {
      access_token: 'summit_local_jwt_' + Date.now(),
      token_type: 'bearer',
      user: found.user
    };

    _setActiveSession(session);
    _setActiveUser(found.user);

    return {
      data: { user: found.user, session: session },
      error: null
    };
  }

  /**
   * SummitSupabase API Client
   */
  const SummitSupabase = {
    /**
     * Ambil konfigurasi URL dan Anon Key Supabase yang tersimpan
     */
    getSupabaseConfig: function () {
      const storedUrl = _getItem(STORAGE_KEYS.CONFIG_URL) || '';
      const storedKey = _getItem(STORAGE_KEYS.CONFIG_KEY) || '';

      const env = (typeof window !== 'undefined' ? (window.__ENV__ || window.SUMMIT_SUPABASE_CONFIG || window.ENV) : null) || {};
      const envUrl = env.SUPABASE_URL || env.url || '';
      const envKey = env.SUPABASE_ANON_KEY || env.anonKey || '';

      return {
        url: storedUrl || envUrl || '',
        anonKey: storedKey || envKey || ''
      };
    },

    /**
     * Simpan konfigurasi kredensial Supabase ke storage
     */
    saveSupabaseConfig: function (url, anonKey) {
      if (url && anonKey) {
        _setItem(STORAGE_KEYS.CONFIG_URL, url.trim());
        _setItem(STORAGE_KEYS.CONFIG_KEY, anonKey.trim());
        return this.initSupabase(url.trim(), anonKey.trim());
      } else {
        _removeItem(STORAGE_KEYS.CONFIG_URL);
        _removeItem(STORAGE_KEYS.CONFIG_KEY);
        _client = null;
        return false;
      }
    },

    /**
     * Cek apakah Supabase sudah terkonfigurasi dan aktif
     */
    isSupabaseConfigured: function () {
      const config = this.getSupabaseConfig();
      return Boolean(config.url && config.anonKey && _client);
    },

    // Alias requirement
    isConfigured: function () {
      return this.isSupabaseConfigured();
    },

    /**
     * Inisialisasi Supabase Client JS SDK
     */
    initSupabase: function (url, anonKey) {
      const cfg = this.getSupabaseConfig();
      const targetUrl = url || cfg.url;
      const targetKey = anonKey || cfg.anonKey;

      if (!targetUrl || !targetKey) {
        _client = null;
        return false;
      }

      try {
        // Cek ketersediaan @supabase/supabase-js via global window.supabase
        const supabaseLib = (typeof window !== 'undefined' && window.supabase) ||
                            (typeof global !== 'undefined' && global.supabase);

        if (supabaseLib && typeof supabaseLib.createClient === 'function') {
          _client = supabaseLib.createClient(targetUrl, targetKey);

          // Pasang listener status auth Supabase untuk memperbarui sesi lokal
          if (_client && _client.auth) {
            _client.auth.onAuthStateChange((event, session) => {
              if (session && session.user) {
                _setActiveSession(session);
                _setActiveUser(session.user);
              } else if (event === 'SIGNED_OUT') {
                _clearActiveAuth();
              }
            });

            // Sync initial auth session jika ada
            _client.auth.getSession().then(({ data }) => {
              if (data && data.session) {
                _setActiveSession(data.session);
                _setActiveUser(data.session.user);
              }
            }).catch(() => {
              // Abaikan error background fetch
            });
          }
          return true;
        } else {
          // SDK belum dimuat, simpan kredensial untuk diinisialisasi nanti
          return false;
        }
      } catch (err) {
        console.warn('Gagal menginisialisasi Supabase client:', err);
        _client = null;
        return false;
      }
    },

    /**
     * Dapatkan instance Supabase client
     */
    getSupabase: function () {
      if (!_client) {
        this.initSupabase();
      }
      return _client;
    },

    /**
     * Pendaftaran akun baru (Sign Up)
     * @param {string} email
     * @param {string} password
     * @param {object} metadata { full_name, role, avatar_url }
     */
    register: async function (email, password, metadata) {
      if (!email || !password) {
        return {
          data: null,
          error: { message: 'Email dan kata sandi wajib diisi.' }
        };
      }

      const client = this.getSupabase();
      if (client && client.auth) {
        try {
          const fullName = (metadata && (metadata.full_name || metadata.name)) || email.split('@')[0];
          const userMeta = {
            full_name: fullName,
            role: (metadata && metadata.role) || 'Pendaki',
            avatar_url: (metadata && metadata.avatar_url) || null,
            ...(metadata || {})
          };

          const { data, error } = await client.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
              data: userMeta
            }
          });

          if (error) throw error;

          if (data && data.user) {
            _setActiveUser(data.user);
            if (data.session) {
              _setActiveSession(data.session);
            }
          }

          return { data, error: null };
        } catch (err) {
          console.warn('Supabase signUp gagal, beralih ke fallback akun lokal:', err);
          return _localRegister(email, password, metadata);
        }
      }

      // Fallback lokal jika Supabase tidak terhubung
      return _localRegister(email, password, metadata);
    },

    /**
     * Masuk ke sistem menggunakan email dan kata sandi (Sign In)
     * @param {string} email
     * @param {string} password
     */
    login: async function (email, password) {
      if (!email || !password) {
        return {
          data: null,
          error: { message: 'Email dan kata sandi wajib diisi.' }
        };
      }

      const client = this.getSupabase();
      if (client && client.auth) {
        try {
          const { data, error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password: password
          });

          if (error) throw error;

          if (data && data.user) {
            _setActiveUser(data.user);
            _setActiveSession(data.session);
          }

          return { data, error: null };
        } catch (err) {
          console.warn('Supabase signInWithPassword gagal, mencoba fallback lokal:', err);
          const fallback = _localLogin(email, password);
          if (fallback.data) return fallback;
          return { data: null, error: err };
        }
      }

      // Fallback lokal jika Supabase offline/belum disetup
      return _localLogin(email, password);
    },

    /**
     * Masuk ke sistem menggunakan Google OAuth
     * @param {string} [targetPath] - Jalur redirect tujuan setelah OAuth, default '/index.html'
     */
    loginWithGoogle: async function (targetPath) {
      const client = this.getSupabase();
      if (!client || !client.auth) {
        return {
          data: null,
          error: {
            message: 'Koneksi Supabase belum terkonfigurasi. Masukkan URL dan Anon Key untuk mengaktifkan Google OAuth.'
          }
        };
      }

      try {
        const dest = (targetPath && typeof targetPath === 'string') ? targetPath : '/index.html';
        const cleanDest = dest.startsWith('/') ? dest : '/' + dest;
        let redirectTarget = cleanDest;
        if (typeof window !== 'undefined' && window.location) {
          redirectTarget = new URL(cleanDest, window.location.origin).href;
        }

        const { data, error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectTarget
          }
        });

        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error('Google OAuth gagal dipanggil:', err);
        return { data: null, error: err };
      }
    },

    /**
     * Keluar dari sistem (Sign Out)
     */
    logout: async function () {
      const client = this.getSupabase();
      try {
        if (client && client.auth) {
          await client.auth.signOut();
        }
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      } finally {
        _clearActiveAuth();
      }
      return { error: null };
    },

    /**
     * Ambil sesi aktif pengguna saat ini
     */
    getSession: function () {
      return _getActiveSession();
    },

    /**
     * Ambil data profil pengguna aktif saat ini
     */
    getUser: function () {
      const user = _getActiveUser();
      if (user) return user;
      const session = _getActiveSession();
      return (session && session.user) || null;
    }
  };

  // Otomatis inisialisasi jika ada konfigurasi yang tersimpan
  SummitSupabase.initSupabase();

  // Ekspor module / global
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SummitSupabase;
  }
  if (typeof window !== 'undefined') {
    window.SummitSupabase = SummitSupabase;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.SummitSupabase = SummitSupabase;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
