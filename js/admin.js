/**
 * SummitGuard - BMKG Weather Simulation & Basecamp Admin Panel Controller
 * Handles real-time weather status toggling, automatic booking status synchronization,
 * live booking table monitoring, and demonstration reset utilities.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['SummitStore', 'SummitNavbar'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      typeof SummitStore !== 'undefined' ? SummitStore : require('./store'),
      typeof SummitNavbar !== 'undefined' ? SummitNavbar : require('./navbar')
    );
  } else {
    root.AdminController = factory(root.SummitStore, root.SummitNavbar);
  }
}(typeof self !== 'undefined' ? self : this, function(store, navbar) {
  'use strict';

  function getStore() {
    if (typeof store !== 'undefined' && store) return store;
    if (typeof window !== 'undefined' && window.SummitStore) return window.SummitStore;
    if (typeof globalThis !== 'undefined' && globalThis.SummitStore) return globalThis.SummitStore;
    throw new Error('SummitStore not found. Please include js/store.js before js/admin.js');
  }

  /**
   * Escape HTML to prevent XSS in dynamic table and card renderings
   * @param {*} str 
   * @returns {string}
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;')
      .split("'").join('&#039;');
  }

  /**
   * Format currency into Rupiah string
   * @param {number} amount 
   * @returns {string}
   */
  function formatRupiah(amount) {
    return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
  }

  /**
   * Format ISO date string into readable Indonesian date
   * @param {string} dateStr 
   * @returns {string}
   */
  function formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${day} ${months[monthIndex] || parts[1]} ${year}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  const AdminController = {
    /**
     * Initializer called on DOM ready
     */
    init: function() {
      // 1. Render shared navigation and footer
      if (typeof renderNavbar === 'function') {
        renderNavbar('admin', 'navbar-container');
      } else if (navbar && typeof navbar.renderNavbar === 'function') {
        navbar.renderNavbar('admin', 'navbar-container');
      }

      if (typeof renderFooter === 'function') {
        renderFooter('footer-container');
      } else if (navbar && typeof navbar.renderFooter === 'function') {
        navbar.renderFooter('footer-container');
      }

      // 2. Initial rendering of components
      this.renderWeatherCards();
      this.renderBookingsTable();

      // 3. Attach event listeners
      this.bindEvents();
    },

    /**
     * Bind UI event listeners
     */
    bindEvents: function() {
      const self = this;

      // Reset Demo Data Button
      const btnReset = document.getElementById('btn-reset-demo');
      if (btnReset) {
        btnReset.addEventListener('click', function(e) {
          e.preventDefault();
          self.handleResetDemo();
        });
      }
    },

    /**
     * Render the weather simulation cards for each mountain
     */
    renderWeatherCards: function() {
      const container = document.getElementById('weather-cards-container');
      if (!container) return;

      const currentStore = getStore();
      const mountains = currentStore.getMountains() || [];

      if (mountains.length === 0) {
        container.innerHTML = '<div class="col-span-full p-6 text-center text-slate-500">Tidak ada data gunung tersedia.</div>';
        return;
      }

      let html = '';
      mountains.forEach(m => {
        const isWarning = Boolean(m.weather && (m.weather.warningActive || m.weather.status === 'warning'));
        const statusBadge = isWarning
          ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
               <span class="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
               BADAI EKSTREM (ALERT)
             </span>`
          : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
               <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
               NORMAL / AMAN
             </span>`;

        const cardBorder = isWarning ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200';
        const bgHeader = isWarning ? 'bg-rose-50/60' : 'bg-slate-50/60';

        html += `
          <div class="bg-white rounded-2xl shadow-sm border ${cardBorder} flex flex-col overflow-hidden transition hover:shadow-md">
            <!-- Mountain Header -->
            <div class="p-5 ${bgHeader} border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <h3 class="font-bold text-base sm:text-lg text-slate-900">${escapeHtml(m.name)}</h3>
                <p class="text-xs text-slate-500">${escapeHtml(m.elevation)} • ${escapeHtml(m.province)}</p>
              </div>
              <div>
                ${statusBadge}
              </div>
            </div>

            <!-- Weather Details Body -->
            <div class="p-5 flex-grow space-y-4">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span class="text-slate-400 block text-[10px] uppercase font-semibold">Suhu Udara</span>
                  <span class="font-bold text-slate-800 text-sm">${escapeHtml(m.weather.temp || '14°C')}</span>
                </div>
                <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span class="text-slate-400 block text-[10px] uppercase font-semibold">Kecepatan Angin</span>
                  <span class="font-bold text-slate-800 text-sm">${escapeHtml(m.weather.windSpeed || '12 knot')}</span>
                </div>
              </div>

              <div class="text-xs space-y-1">
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Kondisi Terkini</span>
                <p class="font-semibold ${isWarning ? 'text-rose-700' : 'text-slate-800'}">
                  ${escapeHtml(m.weather.condition || 'Cerah Berawan')}
                </p>
                <p class="text-[11px] text-slate-500 leading-relaxed">
                  ${escapeHtml(m.weather.warningMessage || 'Kondisi cuaca terpantau aman.')}
                </p>
              </div>

              <!-- Basecamps list -->
              <div class="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span class="font-semibold text-slate-600">Jalur Resmi:</span> ${(m.basecamps || []).map(b => escapeHtml(b)).join(', ')}
              </div>
            </div>

            <!-- Interactive Simulation Buttons -->
            <div class="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button 
                type="button" 
                onclick="AdminController.setWeatherCondition('${escapeHtml(m.id)}', 'safe')"
                class="px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                  !isWarning
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 ring-offset-1'
                    : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-300'
                }"
                title="Atur cuaca ke kondisi Cerah Berawan & Aman"
              >
                <span>☀️ Aman (Normal)</span>
              </button>

              <button 
                type="button" 
                onclick="AdminController.setWeatherCondition('${escapeHtml(m.id)}', 'storm')"
                class="px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                  isWarning
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400 ring-offset-1'
                    : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
                }"
                title="Atur cuaca ke Badai Hujan & Angin Kencang (BMKG Alert)"
              >
                <span>⚡ Badai Ekstrem</span>
              </button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    /**
     * Update weather condition preset for a specific mountain
     * @param {string} mountainId 
     * @param {'safe'|'storm'} preset 
     */
    setWeatherCondition: function(mountainId, preset) {
      const currentStore = getStore();
      const mountain = currentStore.getMountain(mountainId);

      if (!mountain) {
        this.showToast(`Gunung dengan ID '${mountainId}' tidak ditemukan!`, 'error');
        return;
      }

      let weatherPayload;
      if (preset === 'storm') {
        weatherPayload = {
          status: 'warning',
          condition: 'Badai Hujan & Angin Kencang',
          temp: '7°C',
          windSpeed: '48 knot',
          warningActive: true,
          warningMessage: 'BMKG mengeluarkan peringatan dini badai petir dan angin kencang di ketinggian >2.000 mdpl.'
        };
      } else {
        // Safe preset
        weatherPayload = {
          status: 'safe',
          condition: 'Cerah Berawan',
          temp: '14°C',
          windSpeed: '12 knot',
          warningActive: false,
          warningMessage: 'Kondisi cuaca terpantau aman dan kondusif untuk aktivitas pendakian.'
        };
      }

      currentStore.updateMountainWeather(mountainId, weatherPayload);

      // Re-render UI components
      this.renderWeatherCards();
      this.renderBookingsTable();

      const statusLabel = preset === 'storm' ? 'Badai Ekstrem (BMKG Alert)' : 'Normal / Aman';
      const toastType = preset === 'storm' ? 'warning' : 'success';
      this.showToast(
        `Cuaca ${mountain.name} diubah ke ${statusLabel}. Reservasi terkait telah disinkronisasi!`,
        toastType
      );
    },

    /**
     * Render the live bookings table
     */
    renderBookingsTable: function() {
      const tbody = document.getElementById('bookings-table-body');
      const badgeCount = document.getElementById('booking-count-badge');
      if (!tbody) return;

      const currentStore = getStore();
      const bookings = currentStore.getBookings() || [];

      if (badgeCount) {
        badgeCount.textContent = `Total: ${bookings.length} Tiket`;
      }

      if (bookings.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="py-8 text-center text-slate-400">
              Belum ada riwayat booking SIMAKSI yang terdaftar.
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      bookings.forEach(b => {
        // Status Badge styling
        let statusBadgeHtml = '';
        switch (b.status) {
          case 'CONFIRMED':
            statusBadgeHtml = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                CONFIRMED
              </span>
            `;
            break;
          case 'WEATHER_WARNING':
            statusBadgeHtml = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <span class="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
                WEATHER_WARNING
              </span>
            `;
            break;
          case 'HIGH_RISK_APPROVED':
            statusBadgeHtml = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                HIGH_RISK_APPROVED
              </span>
            `;
            break;
          case 'RESCHEDULED':
            statusBadgeHtml = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                RESCHEDULED
              </span>
            `;
            break;
          case 'CANCELLED_REFUNDED':
            statusBadgeHtml = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-200">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                CANCELLED_REFUNDED
              </span>
            `;
            break;
          default:
            statusBadgeHtml = `
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                ${escapeHtml(b.status || 'UNKNOWN')}
              </span>
            `;
            break;
        }

        const leaderName = (b.leader && b.leader.name) ? b.leader.name : 'Anonim';
        const membersCount = b.membersCount || (b.members ? b.members.length + 1 : 1);
        const porterInfo = (b.addons && b.addons.porterLocal) ? '<span class="text-[10px] text-emerald-600 font-semibold block">+ Porter Lokal</span>' : '';

        html += `
          <tr class="hover:bg-slate-50/80 transition">
            <!-- ID Booking -->
            <td class="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
              ${escapeHtml(b.bookingId)}
            </td>

            <!-- Gunung & Jalur -->
            <td class="py-3.5 px-4">
              <div class="font-semibold text-slate-900">${escapeHtml(b.mountainName || b.mountainId)}</div>
              <div class="text-[11px] text-slate-500">${escapeHtml(b.basecamp || '-')}</div>
            </td>

            <!-- Tgl Pendakian & Durasi -->
            <td class="py-3.5 px-4 whitespace-nowrap">
              <div class="font-medium text-slate-800">${formatDateIndo(b.climbDate)}</div>
              <div class="text-[11px] text-slate-500">${b.durationDays || 2} Hari Pendakian</div>
            </td>

            <!-- Ketua & Anggota -->
            <td class="py-3.5 px-4">
              <div class="font-semibold text-slate-900">${escapeHtml(leaderName)}</div>
              <div class="text-[11px] text-slate-500">${membersCount} Orang Pendaki</div>
              ${porterInfo}
            </td>

            <!-- Total Biaya -->
            <td class="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
              ${formatRupiah(b.totalPayment)}
            </td>

            <!-- Status Mitigasi -->
            <td class="py-3.5 px-4 text-center whitespace-nowrap">
              ${statusBadgeHtml}
            </td>

            <!-- Aksi Buka E-Tiket -->
            <td class="py-3.5 px-4 text-center whitespace-nowrap">
              <a 
                href="ticket.html?id=${encodeURIComponent(b.bookingId)}" 
                target="_blank"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 font-semibold text-xs border border-emerald-200 transition shadow-sm"
                title="Buka E-Tiket Digital untuk reservasi ini"
              >
                <span>Buka E-Tiket</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </a>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    },

    /**
     * Handle Reset Demo Data action
     */
    handleResetDemo: function() {
      if (typeof window !== 'undefined' && window.confirm) {
        const confirmed = window.confirm('Apakah Anda yakin ingin mereset seluruh data simulasi cuaca dan reservasi demo ke kondisi awal bawaan pabrik?');
        if (!confirmed) return;
      }

      const currentStore = getStore();
      currentStore.resetDemoData();

      // Refresh UI
      this.renderWeatherCards();
      this.renderBookingsTable();

      this.showToast('Data demo berhasil direset ke kondisi awal!', 'success');
    },

    /**
     * Show animated toast feedback message
     * @param {string} message 
     * @param {'success'|'warning'|'error'|'info'} [type='info'] 
     */
    showToast: function(message, type) {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto border';

      if (type === 'success') {
        toast.className += ' bg-emerald-900 text-emerald-100 border-emerald-700';
        toast.innerHTML = `<span>✅</span> <span>${escapeHtml(message)}</span>`;
      } else if (type === 'warning') {
        toast.className += ' bg-amber-900 text-amber-100 border-amber-700';
        toast.innerHTML = `<span>⚠️</span> <span>${escapeHtml(message)}</span>`;
      } else if (type === 'error') {
        toast.className += ' bg-rose-900 text-rose-100 border-rose-700';
        toast.innerHTML = `<span>❌</span> <span>${escapeHtml(message)}</span>`;
      } else {
        toast.className += ' bg-slate-900 text-slate-100 border-slate-700';
        toast.innerHTML = `<span>ℹ️</span> <span>${escapeHtml(message)}</span>`;
      }

      container.appendChild(toast);

      // Trigger animation
      setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      }, 10);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 4000);
    },

    escapeHtml: escapeHtml
  };

  // Automatically initialize on DOMContentLoaded if in browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        AdminController.init();
      });
    } else {
      AdminController.init();
    }
  }

  return AdminController;
}));
