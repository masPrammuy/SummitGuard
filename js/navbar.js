/**
 * SummitGuard - Shared Navigation, Footer, and BMKG Weather Alert Components
 * Reusable across index.html, booking.html, ticket.html, and admin.html
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SummitNavbar = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  /**
   * Render the top navigation bar into #navbar-container or specified element
   * @param {string} activePage - 'home' | 'index' | 'booking' | 'ticket' | 'admin'
   * @param {HTMLElement|string} [container] - optional container ID or element
   * @returns {string} The rendered navbar HTML
   */
  function renderNavbar(activePage, container) {
    activePage = (activePage || '').toLowerCase();
    const isHome = activePage === 'home' || activePage === 'index' || activePage === 'beranda';
    const isBooking = activePage === 'booking' || activePage === 'daftar';
    const isTicket = activePage === 'ticket' || activePage === 'tiket';
    const isAdmin = activePage === 'admin' || activePage === 'bmkg' || activePage === 'simulasi';

    const navHtml = `
    <nav class="bg-emerald-900 text-white shadow-md border-b border-emerald-800 relative z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          
          <!-- Brand Logo -->
          <div class="flex items-center">
            <a href="index.html" class="flex items-center gap-2 group transition focus:outline-none">
              <div class="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-inner group-hover:bg-emerald-500 transition">
                <!-- Mountain & Shield SVG -->
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div class="flex flex-col">
                <span class="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
                  Summit<span class="text-emerald-400">Guard</span>
                </span>
                <span class="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold -mt-1">
                  SIMAKSI & Mitigasi BMKG
                </span>
              </div>
            </a>
          </div>

          <!-- Desktop Navigation Links -->
          <div class="hidden md:flex items-center space-x-1 lg:space-x-3">
            <a href="index.html" class="px-3 py-2 rounded-md text-sm font-medium transition ${
              isHome
                ? 'bg-emerald-800 text-white font-semibold'
                : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
            }">
              Beranda
            </a>
            <a href="booking.html" class="px-3 py-2 rounded-md text-sm font-medium transition ${
              isBooking
                ? 'bg-emerald-800 text-white font-semibold'
                : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
            }">
              Daftar SIMAKSI
            </a>
            <a href="ticket.html" class="px-3 py-2 rounded-md text-sm font-medium transition ${
              isTicket
                ? 'bg-emerald-800 text-white font-semibold'
                : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
            }">
              Tiket Saya
            </a>
            
            <!-- Simulasi BMKG Prominent Badge / Link -->
            <a href="admin.html" class="ml-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
              isAdmin
                ? 'bg-amber-400 text-amber-950 ring-2 ring-white shadow-lg'
                : 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-md hover:scale-105 transform'
            }">
              <span class="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              <span>⚡ Simulasi BMKG</span>
            </a>
          </div>

          <!-- Mobile Hamburger Toggle Button -->
          <div class="flex md:hidden items-center">
            <button type="button" id="navbar-hamburger-btn" aria-label="Buka Menu Navigasi" aria-expanded="false" class="inline-flex items-center justify-center p-2 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
              <svg id="hamburger-icon-open" class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg id="hamburger-icon-close" class="hidden h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        </div>
      </div>

      <!-- Mobile Dropdown Menu -->
      <div id="navbar-mobile-menu" class="hidden md:hidden bg-emerald-950 border-t border-emerald-800 px-4 pt-3 pb-4 space-y-2">
        <a href="index.html" class="block px-3 py-2 rounded-md text-base font-medium ${
          isHome ? 'bg-emerald-800 text-white' : 'text-emerald-200 hover:bg-emerald-800 hover:text-white'
        }">
          Beranda
        </a>
        <a href="booking.html" class="block px-3 py-2 rounded-md text-base font-medium ${
          isBooking ? 'bg-emerald-800 text-white' : 'text-emerald-200 hover:bg-emerald-800 hover:text-white'
        }">
          Daftar SIMAKSI
        </a>
        <a href="ticket.html" class="block px-3 py-2 rounded-md text-base font-medium ${
          isTicket ? 'bg-emerald-800 text-white' : 'text-emerald-200 hover:bg-emerald-800 hover:text-white'
        }">
          Tiket Saya
        </a>
        <div class="pt-2 border-t border-emerald-800/80">
          <a href="admin.html" class="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow">
            <span>⚡ Panel Simulasi BMKG</span>
          </a>
        </div>
      </div>
    </nav>
    `;

    // DOM injection if in browser environment
    if (typeof document !== 'undefined') {
      let targetEl = null;
      if (typeof container === 'string') {
        targetEl = document.getElementById(container) || document.querySelector(container);
      } else if (container && container.nodeType) {
        targetEl = container;
      } else {
        targetEl = document.getElementById('navbar-container') || document.getElementById('main-navbar');
      }

      if (!targetEl && document.body) {
        targetEl = document.createElement('div');
        targetEl.id = 'navbar-container';
        document.body.prepend(targetEl);
      }

      if (targetEl) {
        targetEl.innerHTML = navHtml;

        // Attach hamburger toggle event listener
        const hamburgerBtn = targetEl.querySelector('#navbar-hamburger-btn');
        const mobileMenu = targetEl.querySelector('#navbar-mobile-menu');
        const iconOpen = targetEl.querySelector('#hamburger-icon-open');
        const iconClose = targetEl.querySelector('#hamburger-icon-close');

        if (hamburgerBtn && mobileMenu) {
          hamburgerBtn.addEventListener('click', function() {
            const isExpanded = !mobileMenu.classList.contains('hidden');
            if (isExpanded) {
              mobileMenu.classList.add('hidden');
              hamburgerBtn.setAttribute('aria-expanded', 'false');
              if (iconOpen) iconOpen.classList.remove('hidden');
              if (iconClose) iconClose.classList.add('hidden');
            } else {
              mobileMenu.classList.remove('hidden');
              hamburgerBtn.setAttribute('aria-expanded', 'true');
              if (iconOpen) iconOpen.classList.add('hidden');
              if (iconClose) iconClose.classList.remove('hidden');
            }
          });
        }
      }
    }

    return navHtml;
  }

  /**
   * Render standardized footer into #footer-container or specified element
   * @param {HTMLElement|string} [container] - optional container
   * @returns {string} The rendered footer HTML
   */
  function renderFooter(container) {
    const footerHtml = `
    <footer class="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800 text-sm">
      <!-- Main Footer Body -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <!-- Column 1: Identity & SAR -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold">
                SG
              </div>
              <span class="font-bold text-lg text-white">Summit<span class="text-emerald-400">Guard</span></span>
            </div>
            <p class="text-xs text-slate-400 leading-relaxed">
              Sistem Manajemen Surat Izin Masuk Kawasan Konservasi (SIMAKSI) terintegrasi sistem peringatan dini cuaca BMKG.
            </p>
            <div class="pt-2 text-xs text-emerald-400 font-medium">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Posko Ranger 24 Jam: 0812-999-RANGER</span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">Frekuensi Radio VHF: 143.550 MHz</p>
            </div>
          </div>

          <!-- Column 2: Quick Links -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Tautan Sistem</h4>
            <ul class="space-y-2 text-xs">
              <li><a href="index.html" class="hover:text-emerald-400 transition">Beranda & Katalog Jalur</a></li>
              <li><a href="booking.html" class="hover:text-emerald-400 transition">Pendaftaran SIMAKSI Online</a></li>
              <li><a href="ticket.html" class="hover:text-emerald-400 transition">E-Tiket & Status Mitigasi</a></li>
              <li><a href="admin.html" class="hover:text-amber-400 text-amber-300 transition flex items-center gap-1 font-semibold">
                <span>⚡ Panel Simulasi BMKG</span>
              </a></li>
            </ul>
          </div>

          <!-- Column 3: Mountaineering Conservation Ethics -->
          <div class="md:col-span-2 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200">
              Etika Konservasi & Pedoman SOP Pendakian
            </h4>
            <div class="bg-slate-800/80 rounded-lg p-3.5 border border-slate-700/80 text-xs text-slate-300 space-y-1.5">
              <p class="font-semibold text-emerald-400">Prinsip Konservasi Alam Bebas (Leave No Trace):</p>
              <ul class="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                <li><strong>Bawa Turun Sampahmu:</strong> Wajib membawa kembali semua sampah anorganik ke pos perizinan basecamp.</li>
                <li><strong>Hargai Flora & Fauna:</strong> Jangan memetik edelweiss dan dilarang memberi makan satwa liar.</li>
                <li><strong>Keselamatan Rombongan:</strong> Pendakian wajib minimal 2-3 orang dengan ketua rombongan yang kompeten.</li>
              </ul>
            </div>
          </div>

        </div>

        <!-- Academic Disclaimer & Copyright -->
        <div class="mt-8 pt-6 border-t border-slate-800/90 text-center text-xs text-slate-400 space-y-2">
          <p class="text-[11px] text-slate-400 max-w-3xl mx-auto leading-relaxed">
            <strong>Disclaimer Akademik:</strong> SummitGuard merupakan platform prototipe simulasi terintegrasi perizinan pendakian (SIMAKSI) dan sistem mitigasi peringatan dini cuaca BMKG. Seluruh data transaksi, kuota perizinan, dan cuaca ekstrem dirancang untuk tujuan percontohan akademik dan studi kelayakan sistem mitigasi bencana alam bebas.
          </p>
          <p class="text-[11px] text-slate-400">
            &copy; 2026 SummitGuard Indonesia. Hak Cipta Dilindungi Undang-Undang.
          </p>
        </div>
      </div>
    </footer>
    `;

    if (typeof document !== 'undefined') {
      let targetEl = null;
      if (typeof container === 'string') {
        targetEl = document.getElementById(container) || document.querySelector(container);
      } else if (container && container.nodeType) {
        targetEl = container;
      } else {
        targetEl = document.getElementById('footer-container') || document.getElementById('main-footer');
      }

      if (!targetEl && document.body) {
        targetEl = document.createElement('div');
        targetEl.id = 'footer-container';
        document.body.appendChild(targetEl);
      }

      if (targetEl) {
        targetEl.innerHTML = footerHtml;
      }
    }

    return footerHtml;
  }

  /**
   * Helper to render emergency BMKG weather alert banner into target container
   * @param {HTMLElement|string} targetContainer - container or element selector/ID
   * @param {Object} [weatherInfo] - weather details object
   * @returns {string} The rendered banner HTML
   */
  function renderBMKGWeatherBanner(targetContainer, weatherInfo) {
    // Default or fallback weather alert details
    const data = weatherInfo || {
      mountainName: 'Kawasan Jalur Pendakian',
      status: 'warning',
      condition: 'Badai Hujan & Angin Kencang',
      temp: '8°C',
      windSpeed: '48 knot',
      warningActive: true,
      warningMessage: 'BMKG mengeluarkan peringatan dini cuaca ekstrem di ketinggian >2.000 mdpl. Kecepatan angin dapat membahayakan pendakian.'
    };

    const isWarning = data.status === 'warning' || data.warningActive === true;

    let bannerHtml = '';

    if (isWarning) {
      bannerHtml = `
      <div class="storm-warning-card bg-red-50 border-2 border-red-500 rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden transition my-4">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <!-- Left: Alert Icon & Message -->
          <div class="flex items-start gap-3.5">
            <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md animate-pulse-glow">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white badge-pulse">
                  PERINGATAN DINI CUACA EKSTREM BMKG
                </span>
                ${data.mountainName ? `<span class="text-xs font-semibold text-red-900 bg-red-100 px-2 py-0.5 rounded">${data.mountainName}</span>` : ''}
              </div>
              <h3 class="text-base sm:text-lg font-extrabold text-red-950 mt-1">
                Kondisi Cuaca: ${data.condition || 'Badai Ekstrem'}
              </h3>
              <p class="text-xs sm:text-sm text-red-800 mt-1 leading-relaxed max-w-3xl">
                ${data.warningMessage || 'BMKG mendeteksi potensi cuaca membahayakan. Mohon periksa status perizinan SIMAKSI Anda.'}
              </p>
              
              <!-- Metrics pills -->
              <div class="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-red-900">
                ${data.windSpeed ? `<span class="bg-white/80 px-2.5 py-1 rounded-md border border-red-200">💨 Kecepatan Angin: <strong>${data.windSpeed}</strong></span>` : ''}
                ${data.temp ? `<span class="bg-white/80 px-2.5 py-1 rounded-md border border-red-200">🌡️ Suhu Puncak: <strong>${data.temp}</strong></span>` : ''}
              </div>
            </div>
          </div>

          <!-- Right: Quick Action Buttons -->
          <div class="flex-shrink-0 flex sm:flex-col gap-2 w-full md:w-auto">
            <a href="ticket.html" class="flex-1 text-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition hover:shadow-md">
              Cek E-Tiket & Mitigasi
            </a>
            <a href="admin.html" class="flex-1 text-center bg-white hover:bg-red-100 text-red-900 border border-red-300 px-4 py-2 rounded-lg text-xs font-semibold transition">
              Simulasi Cuaca BMKG
            </a>
          </div>

        </div>
      </div>
      `;
    } else {
      bannerHtml = `
      <div class="bg-emerald-50 border border-emerald-300 rounded-xl p-4 shadow-sm relative overflow-hidden transition my-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                STATUS BMKG: KONDUSIF & AMAN
              </span>
              <p class="text-xs text-emerald-900 mt-0.5 font-medium">
                ${data.mountainName ? data.mountainName + ': ' : ''}Cuaca cerah berawan, aman untuk aktivitas pendakian resmi.
              </p>
            </div>
          </div>
          <a href="booking.html" class="hidden sm:inline-block bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
            Daftar Kuota
          </a>
        </div>
      </div>
      `;
    }

    // Injection
    if (typeof document !== 'undefined' && targetContainer) {
      let targetEl = null;
      if (typeof targetContainer === 'string') {
        targetEl = document.getElementById(targetContainer) || document.querySelector(targetContainer);
      } else if (targetContainer && targetContainer.nodeType) {
        targetEl = targetContainer;
      }

      if (targetEl) {
        targetEl.innerHTML = bannerHtml;
      }
    }

    return bannerHtml;
  }

  // Auto-init on DOMContentLoaded if containers exist
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
      // Auto-detect page from filename if not already rendered
      const pathname = window.location.pathname;
      let detectedPage = 'home';
      if (pathname.includes('booking.html')) detectedPage = 'booking';
      else if (pathname.includes('ticket.html')) detectedPage = 'ticket';
      else if (pathname.includes('admin.html')) detectedPage = 'admin';

      const navContainer = document.getElementById('navbar-container') || document.getElementById('main-navbar');
      if (navContainer && !navContainer.hasChildNodes()) {
        renderNavbar(detectedPage, navContainer);
      }

      const footContainer = document.getElementById('footer-container') || document.getElementById('main-footer');
      if (footContainer && !footContainer.hasChildNodes()) {
        renderFooter(footContainer);
      }
    });
  }

  return {
    renderNavbar: renderNavbar,
    renderFooter: renderFooter,
    renderBMKGWeatherBanner: renderBMKGWeatherBanner
  };
}));
