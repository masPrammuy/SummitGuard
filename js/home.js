/**
 * SummitGuard - Home Page & Mountain Catalog Controller
 * Loads mountains from SummitStore, renders dynamic cards with live BMKG weather status,
 * and handles quick ticket lookup navigation.
 */

(function (global) {
  'use strict';

  // Mountain thumbnail images with reliable high-quality Unsplash nature photos
  const MOUNTAIN_IMAGES = {
    merbabu: 'https://images.unsplash.com/photo-1579618218290-25a2ae118e69?auto=format&fit=crop&w=800&q=80',
    prau: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    gede: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
  };

  /**
   * Format number to Indonesian Rupiah currency string
   * @param {number} amount
   * @returns {string} e.g. "Rp 25.000"
   */
  function formatCurrency(amount) {
    return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
  }

  /**
   * Render the dynamic mountain catalog grid
   */
  function renderMountainCatalog() {
    const gridEl = document.getElementById('mountains-grid');
    if (!gridEl) return;

    if (typeof SummitStore === 'undefined' || typeof SummitStore.getMountains !== 'function') {
      gridEl.innerHTML = `
        <div class="col-span-full bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6 text-center">
          <p class="font-bold">Gagal memuat katalog gunung.</p>
          <p class="text-xs text-amber-700 mt-1">Modul SummitStore belum terinisialisasi dengan sempurna.</p>
        </div>
      `;
      return;
    }

    const mountains = SummitStore.getMountains();
    if (!mountains || !mountains.length) {
      gridEl.innerHTML = `
        <div class="col-span-full bg-slate-50 border border-slate-200 text-slate-600 rounded-xl p-8 text-center">
          <p class="font-semibold text-sm">Belum ada data gunung terdaftar.</p>
        </div>
      `;
      return;
    }

    // Check if any mountain has active BMKG weather warning to show global banner
    checkGlobalWeatherAlert(mountains);

    // Build mountain cards HTML
    const cardsHtml = mountains.map(function (m) {
      const quotaPercent = Math.min(100, Math.max(0, Math.round((m.remainingQuota / m.dailyQuota) * 100)));
      
      // Quota color indicator
      let quotaColor = 'bg-emerald-500';
      let quotaTextColor = 'text-emerald-700';
      let quotaBgColor = 'bg-emerald-50';
      let quotaLabel = 'Kuota Tersedia Banyak';

      if (quotaPercent <= 15) {
        quotaColor = 'bg-red-500';
        quotaTextColor = 'text-red-700';
        quotaBgColor = 'bg-red-50';
        quotaLabel = 'Kuota Menipis / Kritis';
      } else if (quotaPercent <= 40) {
        quotaColor = 'bg-amber-500';
        quotaTextColor = 'text-amber-700';
        quotaBgColor = 'bg-amber-50';
        quotaLabel = 'Kuota Terbatas';
      }

      const weather = m.weather || {};
      const isWarning = Boolean(weather.warningActive || weather.status === 'warning');
      const imgUrl = MOUNTAIN_IMAGES[m.id] || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80';

      // Basecamp pills preview
      const basecamps = Array.isArray(m.basecamps) ? m.basecamps : [];
      const basecampBadges = basecamps.slice(0, 3).map(function (b) {
        return `<span class="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded border border-slate-200">${b}</span>`;
      }).join(' ') + (basecamps.length > 3 ? `<span class="text-[11px] text-slate-500 font-medium">+${basecamps.length - 3} jalur</span>` : '');

      return `
        <div class="bg-white rounded-2xl border ${isWarning ? 'border-red-300 shadow-md ring-1 ring-red-200' : 'border-slate-200 shadow-sm'} overflow-hidden flex flex-col transition hover:shadow-lg hover:-translate-y-1 duration-200 group">
          
          <!-- Mountain Photo & Elevation Header -->
          <div class="relative h-48 sm:h-52 w-full overflow-hidden bg-emerald-950">
            <img 
              src="${imgUrl}" 
              alt="${m.name}" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80';"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
            
            <!-- Altitude Elevation Badge -->
            <div class="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold border border-white/20 flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
              <span>${m.elevation}</span>
            </div>

            <!-- Province Badge -->
            <div class="absolute top-3 right-3 bg-emerald-900/80 backdrop-blur-md text-emerald-200 px-2 py-1 rounded text-[10px] font-semibold tracking-wider uppercase border border-emerald-400/20">
              ${m.province || 'Indonesia'}
            </div>

            <!-- Mountain Name in Banner -->
            <div class="absolute bottom-3 left-4 right-4">
              <h3 class="text-xl font-extrabold text-white tracking-tight drop-shadow-sm">
                ${m.name}
              </h3>
              <p class="text-xs text-emerald-300 font-medium">Tiket Masuk: ${formatCurrency(m.ticketPrice)} / orang</p>
            </div>
          </div>

          <!-- Card Body: Weather Alert, Basecamps, and Quota Progress -->
          <div class="p-5 flex-grow flex flex-col justify-between space-y-4">
            
            <!-- BMKG Weather Reactive Status Pill -->
            <div>
              ${isWarning ? `
                <div class="storm-warning-card bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-900">
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white badge-pulse shadow-sm">
                      <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      PERINGATAN BADAI BMKG
                    </span>
                    <span class="text-[11px] font-bold text-red-700">💨 ${weather.windSpeed || '40+ knot'}</span>
                  </div>
                  <p class="font-bold text-red-950 text-xs">${weather.condition || 'Badai Hujan & Angin Kencang'}</p>
                  <p class="text-[11px] text-red-800 leading-snug mt-1 line-clamp-2">
                    ${weather.warningMessage || 'Waspada potensi badai ekstrem di atas 2.000 mdpl.'}
                  </p>
                  <div class="mt-2 pt-2 border-t border-red-200 flex items-center justify-between text-[11px]">
                    <span class="font-medium text-red-700">Suhu: <strong>${weather.temp || '8°C'}</strong></span>
                    <span class="text-red-600 font-semibold underline">Opsi Mitigasi Aktif</span>
                  </div>
                </div>
              ` : `
                <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-sm">
                      ✓ BMKG: KONDUSIF & AMAN
                    </span>
                    <span class="text-[11px] font-semibold text-emerald-700">💨 ${weather.windSpeed || '10-15 knot'}</span>
                  </div>
                  <p class="font-semibold text-emerald-900 text-xs">${weather.condition || 'Cerah Berawan'}</p>
                  <p class="text-[11px] text-emerald-700 mt-0.5">
                    Suhu Puncak: <strong>${weather.temp || '14°C'}</strong> • Sangat aman untuk pendakian.
                  </p>
                </div>
              `}
            </div>

            <!-- Basecamps Info -->
            <div class="space-y-1.5">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Pilihan Pos Basecamp:
              </span>
              <div class="flex flex-wrap gap-1.5 items-center">
                ${basecampBadges}
              </div>
            </div>

            <!-- Quota Progress Bar -->
            <div class="space-y-1.5 pt-2 border-t border-slate-100">
              <div class="flex justify-between items-center text-xs">
                <span class="font-semibold text-slate-700">Sisa Kuota Perizinan:</span>
                <span class="font-bold font-mono ${quotaTextColor}">
                  ${m.remainingQuota} <span class="font-sans font-normal text-slate-400">/ ${m.dailyQuota}</span> (${quotaPercent}%)
                </span>
              </div>
              
              <!-- Progress Track -->
              <div class="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  class="${quotaColor} h-2.5 rounded-full transition-all duration-500" 
                  style="width: ${quotaPercent}%"
                  role="progressbar"
                  aria-valuenow="${m.remainingQuota}"
                  aria-valuemin="0"
                  aria-valuemax="${m.dailyQuota}"
                ></div>
              </div>
              
              <div class="flex items-center justify-between text-[10px] text-slate-500">
                <span>Daya dukung harian</span>
                <span class="${quotaTextColor} font-semibold">${quotaLabel}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-3 space-y-2">
              <a 
                href="booking.html?mountain=${encodeURIComponent(m.id)}" 
                class="w-full block text-center py-3 px-4 rounded-xl text-sm font-bold text-white shadow-md transition transform hover:-translate-y-0.5 ${
                  isWarning
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }"
              >
                <span>Daftar SIMAKSI</span>
                <span class="text-xs font-normal opacity-90 block sm:inline sm:ml-1">(${m.name})</span>
              </a>

              ${isWarning ? `
                <a 
                  href="admin.html" 
                  class="w-full block text-center py-1.5 px-3 rounded-lg text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition"
                  title="Buka panel simulasi cuaca BMKG"
                >
                  ⚡ Coba Simulasi Cuaca BMKG
                </a>
              ` : ''}
            </div>

          </div>
        </div>
      `;
    }).join('');

    gridEl.innerHTML = cardsHtml;
  }

  /**
   * Check if any mountain has active BMKG weather warning to render an alert banner
   * @param {Array} mountains
   */
  function checkGlobalWeatherAlert(mountains) {
    const alertContainer = document.getElementById('global-weather-alert');
    if (!alertContainer) return;

    const warnedMountain = mountains.find(function (m) {
      return m.weather && (m.weather.warningActive || m.weather.status === 'warning');
    });

    if (warnedMountain && typeof renderBMKGWeatherBanner === 'function') {
      alertContainer.classList.remove('hidden');
      renderBMKGWeatherBanner(alertContainer, {
        mountainName: warnedMountain.name,
        status: 'warning',
        condition: warnedMountain.weather.condition,
        temp: warnedMountain.weather.temp,
        windSpeed: warnedMountain.weather.windSpeed,
        warningActive: true,
        warningMessage: warnedMountain.weather.warningMessage
      });
    } else {
      alertContainer.classList.add('hidden');
      alertContainer.innerHTML = '';
    }
  }

  /**
   * Initialize quick ticket search form
   */
  function initQuickSearch() {
    const form = document.getElementById('quick-ticket-form');
    const input = document.getElementById('ticket-search-input');
    const demoBtn = document.getElementById('btn-demo-ticket');

    if (demoBtn && input) {
      demoBtn.addEventListener('click', function () {
        input.value = 'SMK-20260920-0482';
        input.focus();
      });
    }

    if (form && input) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        let ticketId = (input.value || '').trim();

        // If user submitted empty field, default to sample booking demo ticket
        if (!ticketId) {
          ticketId = 'SMK-20260920-0482';
        }

        // Clean up format (capitalize)
        ticketId = ticketId.toUpperCase();

        // Redirect to ticket.html with query parameter id
        window.location.href = 'ticket.html?id=' + encodeURIComponent(ticketId);
      });
    }
  }

  /**
   * Initialize home page components
   */
  function init() {
    // Inject shared navbar and footer if available
    if (typeof renderNavbar === 'function') {
      renderNavbar('home', 'navbar-container');
    }
    if (typeof renderFooter === 'function') {
      renderFooter('footer-container');
    }

    // Render mountain catalog
    renderMountainCatalog();

    // Setup quick ticket search
    initQuickSearch();
  }

  // Auto-run on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // Expose methods for testing or modular usage
  const HomeModule = {
    init: init,
    renderMountainCatalog: renderMountainCatalog,
    formatCurrency: formatCurrency
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HomeModule;
  }
  if (typeof window !== 'undefined') {
    window.SummitHome = HomeModule;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.SummitHome = HomeModule;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
