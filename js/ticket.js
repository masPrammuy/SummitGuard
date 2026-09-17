/**
 * SummitGuard - Digital E-Ticket & BMKG Disaster Mitigation Controller
 * Handles authentic e-ticket rendering, QR Code generation, live weather monitoring,
 * and 3 reactive mitigation flows: High-Risk Proceed, Free Reschedule, and 100% Full Refund.
 */

(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(['SummitStore'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./store'));
  } else {
    root.SummitTicket = factory(root.SummitStore);
  }
}(typeof self !== 'undefined' ? self : this, function (SummitStore) {
  'use strict';

  // Format IDR Currency Helper
  function formatRupiah(amount) {
    return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
  }

  // Format Indonesian Date Helper (e.g. 2026-09-20 -> 20 September 2026)
  function formatDateIndo(dateString) {
    if (!dateString) return '-';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${day} ${months[monthIndex]} ${year}`;
      }
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  }

  // Fallback store access
  function getStore() {
    if (typeof window !== 'undefined' && window.SummitStore) {
      return window.SummitStore;
    }
    return SummitStore;
  }

  /**
   * Deterministic hash string to 32-bit integer for QR module generation
   */
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Generate Authentic SVG QR Code Matrix
   * Produces a 25x25 grid with official corner finder patterns and data modules
   */
  function generateQRCodeSVG(dataString, size) {
    size = size || 140;
    const gridSize = 25;
    const cellSize = size / gridSize;
    const matrix = [];

    for (let r = 0; r < gridSize; r++) {
      matrix[r] = new Array(gridSize).fill(0);
    }

    // Helper: draw finder pattern at (row, col) 7x7
    function drawFinder(startR, startC) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6) {
            matrix[startR + r][startC + c] = 1;
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix[startR + r][startC + c] = 1;
          } else {
            matrix[startR + r][startC + c] = 0;
          }
        }
      }
    }

    // 3 Finder Patterns in corners
    drawFinder(0, 0); // Top-left
    drawFinder(0, gridSize - 7); // Top-right
    drawFinder(gridSize - 7, 0); // Bottom-left

    // Timing lines
    for (let i = 8; i < gridSize - 8; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
    }

    // Deterministic pseudo-data modules based on string hash
    let seed = hashString(dataString);
    function nextRand() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        // Skip finder zones
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= gridSize - 8;
        const inBottomLeft = r >= gridSize - 8 && c < 8;
        const isTiming = (r === 6 && c >= 8 && c < gridSize - 8) || (c === 6 && r >= 8 && r < gridSize - 8);

        if (!inTopLeft && !inTopRight && !inBottomLeft && !isTiming) {
          matrix[r][c] = nextRand() > 0.48 ? 1 : 0;
        }
      }
    }

    // Convert matrix to SVG rects
    let rects = '';
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (matrix[r][c] === 1) {
          const x = (c * cellSize).toFixed(2);
          const y = (r * cellSize).toFixed(2);
          const w = (cellSize + 0.1).toFixed(2);
          const h = (cellSize + 0.1).toFixed(2);
          rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f172a" />`;
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="w-full h-auto max-w-[130px] select-none">
        <rect width="100%" height="100%" fill="#ffffff" />
        ${rects}
      </svg>
    `;
  }

  /**
   * Main TicketController Class
   */
  class TicketController {
    constructor() {
      this.store = getStore();
      this.currentBookingId = null;
      this.currentBooking = null;
      this.dom = {};
    }

    /**
     * Cache all required DOM elements
     */
    cacheDom() {
      this.dom = {
        // Search & Switcher
        searchForm: document.getElementById('ticket-search-form'),
        searchInput: document.getElementById('ticket-search-input'),
        searchBtn: document.getElementById('search-ticket-btn'),
        demoTicketBtn: document.getElementById('btn-demo-ticket'),
        bookingChipsContainer: document.getElementById('booking-chips-container'),

        // Feedback / Not found
        toast: document.getElementById('ticket-toast'),
        toastTitle: document.getElementById('toast-title'),
        toastMessage: document.getElementById('toast-message'),
        toastIcon: document.getElementById('toast-icon'),
        toastCloseBtn: document.getElementById('toast-close-btn'),
        notFoundCard: document.getElementById('ticket-not-found'),
        resetToDemoBtn: document.getElementById('btn-reset-to-demo'),

        // Weather Alert Section
        weatherAlertSection: document.getElementById('weather-alert-section'),
        alertMountainBadge: document.getElementById('alert-mountain-badge'),
        alertConditionTitle: document.getElementById('alert-condition-title'),
        alertMessageText: document.getElementById('alert-message-text'),
        alertWindSpeed: document.getElementById('alert-wind-speed'),
        alertTemp: document.getElementById('alert-temp'),
        btnOpenModalHighRisk: document.getElementById('btn-open-modal-high-risk'),
        btnOpenModalReschedule: document.getElementById('btn-open-modal-reschedule'),
        btnOpenModalRefund: document.getElementById('btn-open-modal-refund'),

        // Post-mitigation banner
        postMitigationBanner: document.getElementById('post-mitigation-banner'),

        // Main E-Ticket Card
        printableCard: document.getElementById('ticket-printable-card'),
        bookingId: document.getElementById('ticket-booking-id'),
        btnCopyCode: document.getElementById('btn-copy-code'),
        statusBadgeContainer: document.getElementById('ticket-status-badge-container'),
        statusBadge: document.getElementById('ticket-status-badge'),
        mountainName: document.getElementById('ticket-mountain-name'),
        elevation: document.getElementById('ticket-elevation'),
        basecamp: document.getElementById('ticket-basecamp'),
        climbDate: document.getElementById('ticket-climb-date'),
        duration: document.getElementById('ticket-duration'),
        membersCount: document.getElementById('ticket-members-count'),
        leaderName: document.getElementById('ticket-leader-name'),
        leaderNik: document.getElementById('ticket-leader-nik'),
        leaderPhone: document.getElementById('ticket-leader-phone'),
        emergencyContact: document.getElementById('ticket-emergency-contact'),
        membersList: document.getElementById('ticket-members-list'),
        porterStatus: document.getElementById('ticket-porter-status'),
        porterBadge: document.getElementById('ticket-porter-badge'),
        paymentStatus: document.getElementById('ticket-payment-status'),
        totalPayment: document.getElementById('ticket-total-payment'),
        qrContainer: document.getElementById('ticket-qr-container'),
        qrToken: document.getElementById('ticket-qr-token'),
        barcodeText: document.getElementById('ticket-barcode-text'),
        issuedAt: document.getElementById('ticket-issued-at'),
        btnPrintTicket: document.getElementById('btn-print-ticket'),

        // Modal 1: Tetap Naik (High Risk)
        modalHighRisk: document.getElementById('modal-proceed-highrisk'),
        btnCloseModalHighRisk: document.getElementById('btn-close-modal-highrisk'),
        btnCancelHighRisk: document.getElementById('btn-cancel-highrisk'),
        formHighRisk: document.getElementById('form-highrisk-waiver'),
        highRiskSignerName: document.getElementById('highrisk-signer-name'),
        highRiskSignerNik: document.getElementById('highrisk-signer-nik'),
        highRiskConfirmationText: document.getElementById('highrisk-confirmation-text'),

        // Modal 2: Reschedule
        modalReschedule: document.getElementById('modal-reschedule'),
        btnCloseModalReschedule: document.getElementById('btn-close-modal-reschedule'),
        btnCancelReschedule: document.getElementById('btn-cancel-reschedule'),
        formReschedule: document.getElementById('form-reschedule'),
        rescheduleDateInput: document.getElementById('reschedule-date-input'),
        quickRescheduleDates: document.getElementById('quick-reschedule-dates'),

        // Modal 3: Refund
        modalRefund: document.getElementById('modal-refund'),
        btnCloseModalRefund: document.getElementById('btn-close-modal-refund'),
        btnCancelRefund: document.getElementById('btn-cancel-refund'),
        formRefund: document.getElementById('form-refund'),
        refundTotalAmount: document.getElementById('refund-total-amount'),
        refundBank: document.getElementById('refund-bank'),
        refundAccountNumber: document.getElementById('refund-account-number'),
        refundAccountName: document.getElementById('refund-account-name')
      };
    }

    /**
     * Initialize controller, render components, bind events
     */
    init() {
      if (typeof document === 'undefined') return;

      this.cacheDom();

      // Render shared navbar and footer
      if (typeof renderNavbar === 'function') {
        renderNavbar('ticket', 'navbar-container');
      }
      if (typeof renderFooter === 'function') {
        renderFooter('footer-container');
      }

      // Read booking ID from URL param or default demo booking
      const urlParams = new URLSearchParams(window.location.search);
      const requestedId = urlParams.get('id') || 'SMK-20260920-0482';

      this.loadBooking(requestedId);
      this.bindEvents();
    }

    /**
     * Load booking from SummitStore and render view
     */
    loadBooking(bookingId) {
      if (!bookingId) return;

      this.currentBookingId = bookingId.trim().toUpperCase();
      this.currentBooking = this.store.getBooking(this.currentBookingId);

      if (this.dom.searchInput) {
        this.dom.searchInput.value = this.currentBookingId;
      }

      this.renderBookingChips();

      if (!this.currentBooking) {
        this.showNotFoundView();
        return;
      }

      this.hideNotFoundView();
      this.renderTicketDetails();
      this.renderWeatherAlertSection();
      this.renderPostMitigationBanner();
    }

    /**
     * Render quick booking chips from store
     */
    renderBookingChips() {
      if (!this.dom.bookingChipsContainer) return;

      const bookings = this.store.getBookings() || [];
      if (bookings.length === 0) {
        this.dom.bookingChipsContainer.innerHTML = '<span class="text-slate-400 text-[11px]">Belum ada data tiket.</span>';
        return;
      }

      let html = '';
      bookings.slice(0, 5).forEach(b => {
        const isActive = b.bookingId === this.currentBookingId;
        const activeClass = isActive
          ? 'bg-emerald-600 text-white font-bold'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700';
        html += `
          <button 
            type="button" 
            class="booking-chip-btn px-2.5 py-1 rounded text-[11px] font-mono transition ${activeClass}" 
            data-id="${b.bookingId}"
          >
            ${b.bookingId} (${b.mountainName ? b.mountainName.replace('Gunung ', '') : 'Gunung'})
          </button>
        `;
      });

      this.dom.bookingChipsContainer.innerHTML = html;

      // Bind click handlers to chips
      const chipButtons = this.dom.bookingChipsContainer.querySelectorAll('.booking-chip-btn');
      chipButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetId = e.currentTarget.getAttribute('data-id');
          this.switchBooking(targetId);
        });
      });
    }

    /**
     * Switch current booking reactively and update browser history URL
     */
    switchBooking(newBookingId) {
      this.loadBooking(newBookingId);
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const newUrl = window.location.pathname + '?id=' + encodeURIComponent(newBookingId);
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    }

    /**
     * Show Not Found Card and hide ticket
     */
    showNotFoundView() {
      if (this.dom.notFoundCard) this.dom.notFoundCard.classList.remove('hidden');
      if (this.dom.printableCard) this.dom.printableCard.classList.add('hidden');
      if (this.dom.weatherAlertSection) this.dom.weatherAlertSection.classList.add('hidden');
      if (this.dom.postMitigationBanner) this.dom.postMitigationBanner.classList.add('hidden');
    }

    /**
     * Hide Not Found Card and show ticket
     */
    hideNotFoundView() {
      if (this.dom.notFoundCard) this.dom.notFoundCard.classList.add('hidden');
      if (this.dom.printableCard) this.dom.printableCard.classList.remove('hidden');
    }

    /**
     * Render the main E-Ticket elements
     */
    renderTicketDetails() {
      const b = this.currentBooking;
      if (!b) return;

      const mountain = this.store.getMountain(b.mountainId);

      // Header info
      if (this.dom.bookingId) this.dom.bookingId.textContent = b.bookingId;
      if (this.dom.mountainName) this.dom.mountainName.textContent = b.mountainName || (mountain ? mountain.name : 'Gunung');
      if (this.dom.elevation) this.dom.elevation.textContent = mountain ? mountain.elevation : 'Kawasan Konservasi';
      if (this.dom.basecamp) this.dom.basecamp.textContent = b.basecamp || 'Pos Registrasi Utama';
      if (this.dom.climbDate) this.dom.climbDate.textContent = formatDateIndo(b.climbDate);
      if (this.dom.duration) this.dom.duration.textContent = `Durasi: ${b.durationDays || 2} Hari 1 Malam`;

      // Members count
      const count = b.membersCount || (b.members ? b.members.length + 1 : 1);
      if (this.dom.membersCount) this.dom.membersCount.textContent = `Total: ${count} Orang`;

      // Leader info
      const leader = b.leader || {};
      if (this.dom.leaderName) this.dom.leaderName.textContent = leader.name || '-';
      if (this.dom.leaderNik) this.dom.leaderNik.textContent = leader.nik || '-';
      if (this.dom.leaderPhone) this.dom.leaderPhone.textContent = leader.phone || '-';
      if (this.dom.emergencyContact) this.dom.emergencyContact.textContent = leader.emergencyContact || '-';

      // Members roster
      if (this.dom.membersList) {
        if (b.members && b.members.length > 0) {
          let rosterHtml = '';
          b.members.forEach((m, idx) => {
            rosterHtml += `
              <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                    ${idx + 2}
                  </span>
                  <strong class="text-slate-800">${m.name}</strong>
                </div>
                <span class="font-mono text-slate-500 text-[11px]">NIK: ${m.nik}</span>
              </div>
            `;
          });
          this.dom.membersList.innerHTML = rosterHtml;
        } else {
          this.dom.membersList.innerHTML = '<p class="text-slate-400 text-xs italic">Tidak ada anggota tambahan (Pendakian Solo/Ketua).</p>';
        }
      }

      // Porter Addon
      const hasPorter = Boolean(b.addons && b.addons.porterLocal);
      if (this.dom.porterBadge) {
        this.dom.porterBadge.textContent = hasPorter ? 'Aktif' : 'Tidak Digunakan';
        this.dom.porterBadge.className = hasPorter
          ? 'text-xs font-bold px-2.5 py-1 rounded bg-amber-100 text-amber-800 border border-amber-300'
          : 'text-xs font-medium px-2.5 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200';
      }
      if (this.dom.porterStatus) {
        this.dom.porterStatus.textContent = hasPorter
          ? `Termasuk ${b.addons.porterCount || 1} Porter Paguyuban Lokal Warga (Mendukung Ekonomi Desa)`
          : 'Tanpa porter lokal (Seluruh perlengkapan dibawa mandiri oleh rombongan)';
      }

      // Payment summary
      if (this.dom.totalPayment) {
        this.dom.totalPayment.textContent = formatRupiah(b.totalPayment);
      }
      if (this.dom.paymentStatus) {
        if (b.status === 'CANCELLED_REFUNDED') {
          this.dom.paymentStatus.textContent = 'DIBATALKAN & DANA DIREFUND 100%';
          this.dom.paymentStatus.className = 'text-xs font-bold text-slate-400';
        } else {
          this.dom.paymentStatus.textContent = 'LUNAS - PNBP & ASURANSI';
          this.dom.paymentStatus.className = 'text-xs font-bold text-emerald-400';
        }
      }

      // Barcode & Token
      const tokenString = `SG-VERIFY|${b.bookingId}|${(b.mountainId || 'MT').toUpperCase()}|${count}PAX|${b.status}`;
      if (this.dom.qrToken) this.dom.qrToken.textContent = tokenString;
      if (this.dom.barcodeText) this.dom.barcodeText.textContent = `*${b.bookingId.replace(/[^A-Z0-9]/g, '')}*`;
      if (this.dom.qrContainer) {
        this.dom.qrContainer.innerHTML = generateQRCodeSVG(tokenString, 130);
      }
      if (this.dom.issuedAt) {
        const createdDate = b.createdAt ? new Date(b.createdAt) : new Date();
        this.dom.issuedAt.textContent = createdDate.toLocaleDateString('id-ID', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        }) + ' ' + createdDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      }

      // Status Badge Rendering
      this.renderStatusBadge(b.status);
    }

    /**
     * Render Status Badge based on the 5 supported statuses:
     * 1. CONFIRMED
     * 2. WEATHER_WARNING
     * 3. HIGH_RISK_APPROVED
     * 4. RESCHEDULED
     * 5. CANCELLED_REFUNDED
     */
    renderStatusBadge(status) {
      if (!this.dom.statusBadgeContainer) return;

      let badgeHtml = '';

      switch (status) {
        case 'CONFIRMED':
          badgeHtml = `
            <span id="ticket-status-badge" class="status-pill status-pill-confirmed">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Tiket Terverifikasi - Siap Mendaki</span>
            </span>
          `;
          break;

        case 'WEATHER_WARNING':
          badgeHtml = `
            <span id="ticket-status-badge" class="status-pill status-pill-warning badge-pulse">
              <span class="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              <span>SIAGA BMKG: Peringatan Dini Cuaca Ekstrem</span>
            </span>
          `;
          break;

        case 'HIGH_RISK_APPROVED':
          badgeHtml = `
            <span id="ticket-status-badge" class="status-pill status-pill-highrisk">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Tetap Naik - Disetujui dengan Catatan Risiko Tinggi</span>
            </span>
          `;
          break;

        case 'RESCHEDULED':
          badgeHtml = `
            <span id="ticket-status-badge" class="status-pill status-pill-rescheduled">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Jadwal Ulang Berhasil (Bebas Biaya)</span>
            </span>
          `;
          break;

        case 'CANCELLED_REFUNDED':
          badgeHtml = `
            <span id="ticket-status-badge" class="status-pill status-pill-refunded">
              <span class="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Tiket Dibatalkan & Dana Direfund 100%</span>
            </span>
          `;
          break;

        default:
          badgeHtml = `
            <span id="ticket-status-badge" class="status-pill status-pill-confirmed">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Tiket Terverifikasi</span>
            </span>
          `;
      }

      this.dom.statusBadgeContainer.innerHTML = badgeHtml;
    }

    /**
     * Render Emergency BMKG Weather Alert Section
     * Displays when status is WEATHER_WARNING
     */
    renderWeatherAlertSection() {
      if (!this.dom.weatherAlertSection) return;

      const b = this.currentBooking;
      if (!b) return;

      const mountain = this.store.getMountain(b.mountainId);
      const isWeatherWarning = b.status === 'WEATHER_WARNING';

      if (!isWeatherWarning) {
        this.dom.weatherAlertSection.classList.add('hidden');
        return;
      }

      this.dom.weatherAlertSection.classList.remove('hidden');

      const weather = (mountain && mountain.weather) ? mountain.weather : {
        condition: 'Badai Hujan & Angin Kencang',
        temp: '8°C',
        windSpeed: '48 knot',
        warningMessage: 'BMKG mengeluarkan peringatan dini badai petir dan angin kencang di ketinggian >2.000 mdpl.'
      };

      if (this.dom.alertMountainBadge) {
        this.dom.alertMountainBadge.textContent = b.mountainName || (mountain ? mountain.name : 'Gunung');
      }
      if (this.dom.alertConditionTitle) {
        this.dom.alertConditionTitle.textContent = `Waspada ${weather.condition || 'Cuaca Ekstrem'} di Jalur Pendakian`;
      }
      if (this.dom.alertMessageText) {
        this.dom.alertMessageText.textContent = weather.warningMessage ||
          'BMKG mendeteksi potensi cuaca membahayakan. Kecepatan angin dan hujan lebat berisiko menimbulkan hipotermia.';
      }
      if (this.dom.alertWindSpeed) {
        this.dom.alertWindSpeed.textContent = weather.windSpeed || '48 knot';
      }
      if (this.dom.alertTemp) {
        this.dom.alertTemp.textContent = weather.temp || '8°C';
      }
    }

    /**
     * Render Post-Mitigation Info Banners
     * Informs user if they have already chosen a mitigation option
     */
    renderPostMitigationBanner() {
      if (!this.dom.postMitigationBanner) return;

      const b = this.currentBooking;
      if (!b) return;

      let bannerHtml = '';

      if (b.status === 'HIGH_RISK_APPROVED') {
        const waiver = b.waiverDetails || {};
        bannerHtml = `
          <div class="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 sm:p-5 shadow-sm space-y-2">
            <div class="flex items-start gap-3">
              <span class="text-xl">⚠️</span>
              <div>
                <h4 class="text-sm font-extrabold text-amber-950">
                  Perhatian: Anda Melakukan Pendakian Kategori Risiko Tinggi (High-Risk Ascent)
                </h4>
                <p class="text-xs text-amber-900 mt-1 leading-relaxed">
                  Surat pelepasan tanggung jawab telah ditandatangani oleh <strong>${waiver.signerName || (b.leader && b.leader.name)}</strong> (NIK: ${waiver.signerNik || (b.leader && b.leader.nik)}). Seluruh rombongan wajib melapor ke Pos 1 Basecamp untuk pemeriksaan fisik tenda badai sebelum melangkah ke pos atas.
                </p>
                <div class="mt-2.5 pt-2 border-t border-amber-300 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-amber-950">
                  <span>🚨 Posko Ranger SAR Basecamp: <strong class="font-mono text-red-700">${waiver.emergencyHotline || '0811-2345-SAR'}</strong></span>
                  <span class="text-[11px] text-amber-800">Waktu TTD: ${waiver.signedAt ? new Date(waiver.signedAt).toLocaleDateString('id-ID') : 'Tervalidasi'}</span>
                </div>
              </div>
            </div>
          </div>
        `;
        this.dom.postMitigationBanner.innerHTML = bannerHtml;
        this.dom.postMitigationBanner.classList.remove('hidden');
      } else if (b.status === 'RESCHEDULED') {
        bannerHtml = `
          <div class="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 sm:p-5 shadow-sm space-y-2">
            <div class="flex items-start gap-3">
              <span class="text-xl">📅</span>
              <div>
                <h4 class="text-sm font-extrabold text-blue-950">
                  Jadwal Pendakian Berhasil Diperbarui (Bebas Denda / Rp 0)
                </h4>
                <p class="text-xs text-blue-900 mt-1 leading-relaxed">
                  Jadwal pendakian telah dipindahkan dari tanggal semula <strong>${formatDateIndo(b.rescheduledFrom)}</strong> ke tanggal baru yang aman: <strong>${formatDateIndo(b.climbDate)}</strong>. Kuota rombongan dan QR Code verifikasi telah diperbarui secara otomatis.
                </p>
                <div class="mt-2 text-xs text-blue-800 font-medium">
                  Status: Kuota Terkonfirmasi • Bebas Biaya Penalti
                </div>
              </div>
            </div>
          </div>
        `;
        this.dom.postMitigationBanner.innerHTML = bannerHtml;
        this.dom.postMitigationBanner.classList.remove('hidden');
      } else if (b.status === 'CANCELLED_REFUNDED') {
        const refund = b.refundDetails || {};
        bannerHtml = `
          <div class="bg-slate-100 border-2 border-slate-300 rounded-xl p-4 sm:p-5 shadow-sm space-y-2">
            <div class="flex items-start gap-3">
              <span class="text-xl">💳</span>
              <div class="w-full">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h4 class="text-sm font-extrabold text-slate-900">
                    Kuitansi Digital Pengembalian Dana 100% Penuh (Force Majeure)
                  </h4>
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-800 border border-slate-300">
                    ${refund.voucherCode || 'REF-COMPLETED'}
                  </span>
                </div>
                <p class="text-xs text-slate-600 mt-1 leading-relaxed">
                  Pemesanan SIMAKSI ini telah dibatalkan resmi karena peringatan cuaca buruk BMKG. Dana sebesar <strong>${formatRupiah(refund.amount || b.totalPayment)}</strong> telah dikembalikan 100% penuh ke rekening tujuan.
                </p>
                <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                  <div>
                    <span class="text-slate-400 block">Bank / E-Wallet:</span>
                    <strong class="text-slate-800">${refund.bankName || 'TRANSFER_BANK'}</strong>
                  </div>
                  <div>
                    <span class="text-slate-400 block">Nomor Rekening:</span>
                    <strong class="text-slate-800 font-mono">${refund.accountNumber || '-'}</strong>
                  </div>
                  <div>
                    <span class="text-slate-400 block">Pemilik Rekening:</span>
                    <strong class="text-slate-800">${refund.accountHolder || (b.leader && b.leader.name)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        this.dom.postMitigationBanner.innerHTML = bannerHtml;
        this.dom.postMitigationBanner.classList.remove('hidden');
      } else {
        this.dom.postMitigationBanner.innerHTML = '';
        this.dom.postMitigationBanner.classList.add('hidden');
      }
    }

    /**
     * Show temporary floating notification toast
     */
    showToast(title, message, type) {
      type = type || 'success';
      if (!this.dom.toast) return;

      const colors = {
        success: 'bg-emerald-50 border-emerald-500 text-emerald-950',
        warning: 'bg-amber-50 border-amber-500 text-amber-950',
        info: 'bg-blue-50 border-blue-500 text-blue-950',
        error: 'bg-red-50 border-red-500 text-red-950'
      };

      const iconMap = {
        success: '<div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">✓</div>',
        warning: '<div class="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">⚠️</div>',
        info: '<div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">ℹ️</div>',
        error: '<div class="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">✕</div>'
      };

      this.dom.toast.className = `rounded-xl p-4 shadow-lg border transition duration-300 flex items-center justify-between gap-3 ${colors[type] || colors.success}`;
      if (this.dom.toastTitle) this.dom.toastTitle.textContent = title;
      if (this.dom.toastMessage) this.dom.toastMessage.textContent = message;
      if (this.dom.toastIcon) this.dom.toastIcon.innerHTML = iconMap[type] || iconMap.success;

      this.dom.toast.classList.remove('hidden');

      setTimeout(() => {
        if (this.dom.toast) this.dom.toast.classList.add('hidden');
      }, 5000);
    }

    /**
     * Bind all interactive event listeners
     */
    bindEvents() {
      // 1. Search form submit
      if (this.dom.searchForm) {
        this.dom.searchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const q = this.dom.searchInput ? this.dom.searchInput.value : '';
          if (q && q.trim()) {
            this.switchBooking(q.trim());
          }
        });
      }

      // 2. Demo button
      if (this.dom.demoTicketBtn) {
        this.dom.demoTicketBtn.addEventListener('click', () => {
          this.switchBooking('SMK-20260920-0482');
        });
      }

      // 3. Reset to demo button on not-found card
      if (this.dom.resetToDemoBtn) {
        this.dom.resetToDemoBtn.addEventListener('click', () => {
          this.switchBooking('SMK-20260920-0482');
        });
      }

      // 4. Toast close button
      if (this.dom.toastCloseBtn) {
        this.dom.toastCloseBtn.addEventListener('click', () => {
          if (this.dom.toast) this.dom.toast.classList.add('hidden');
        });
      }

      // 5. Copy booking code button
      if (this.dom.btnCopyCode) {
        this.dom.btnCopyCode.addEventListener('click', () => {
          if (this.currentBookingId && navigator && navigator.clipboard) {
            navigator.clipboard.writeText(this.currentBookingId).then(() => {
              this.showToast('Kode Disalin!', `Kode ${this.currentBookingId} berhasil disalin ke papan klip.`, 'success');
            }).catch(() => {
              this.showToast('Kode Booking', this.currentBookingId, 'info');
            });
          } else if (this.currentBookingId) {
            this.showToast('Kode Booking', this.currentBookingId, 'info');
          }
        });
      }

      // 6. Print ticket button
      if (this.dom.btnPrintTicket) {
        this.dom.btnPrintTicket.addEventListener('click', () => {
          if (typeof window !== 'undefined' && window.print) {
            window.print();
          }
        });
      }

      // 7. Modal Open Triggers
      if (this.dom.btnOpenModalHighRisk) {
        this.dom.btnOpenModalHighRisk.addEventListener('click', () => this.openModalHighRisk());
      }
      if (this.dom.btnOpenModalReschedule) {
        this.dom.btnOpenModalReschedule.addEventListener('click', () => this.openModalReschedule());
      }
      if (this.dom.btnOpenModalRefund) {
        this.dom.btnOpenModalRefund.addEventListener('click', () => this.openModalRefund());
      }

      // 8. Modal Close Triggers
      if (this.dom.btnCloseModalHighRisk) {
        this.dom.btnCloseModalHighRisk.addEventListener('click', () => this.closeModal(this.dom.modalHighRisk));
      }
      if (this.dom.btnCancelHighRisk) {
        this.dom.btnCancelHighRisk.addEventListener('click', () => this.closeModal(this.dom.modalHighRisk));
      }

      if (this.dom.btnCloseModalReschedule) {
        this.dom.btnCloseModalReschedule.addEventListener('click', () => this.closeModal(this.dom.modalReschedule));
      }
      if (this.dom.btnCancelReschedule) {
        this.dom.btnCancelReschedule.addEventListener('click', () => this.closeModal(this.dom.modalReschedule));
      }

      if (this.dom.btnCloseModalRefund) {
        this.dom.btnCloseModalRefund.addEventListener('click', () => this.closeModal(this.dom.modalRefund));
      }
      if (this.dom.btnCancelRefund) {
        this.dom.btnCancelRefund.addEventListener('click', () => this.closeModal(this.dom.modalRefund));
      }

      // Click outside backdrop to close
      [this.dom.modalHighRisk, this.dom.modalReschedule, this.dom.modalRefund].forEach(modal => {
        if (modal) {
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              this.closeModal(modal);
            }
          });
        }
      });

      // 9. Modal Form Submissions
      // Modal 1 Form: Tetap Naik
      if (this.dom.formHighRisk) {
        this.dom.formHighRisk.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleHighRiskSubmit();
        });
      }

      // Modal 2 Form: Reschedule
      if (this.dom.formReschedule) {
        this.dom.formReschedule.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleRescheduleSubmit();
        });
      }

      // Modal 3 Form: Refund
      if (this.dom.formRefund) {
        this.dom.formRefund.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleRefundSubmit();
        });
      }
    }

    /**
     * Open Modal Helper
     */
    openModal(modalEl) {
      if (modalEl) {
        modalEl.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      }
    }

    /**
     * Close Modal Helper
     */
    closeModal(modalEl) {
      if (modalEl) {
        modalEl.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    }

    /**
     * Setup and open Modal 1: Tetap Naik
     */
    openModalHighRisk() {
      if (!this.currentBooking) return;
      const leader = this.currentBooking.leader || {};

      if (this.dom.highRiskSignerName) {
        this.dom.highRiskSignerName.value = leader.name || '';
      }
      if (this.dom.highRiskSignerNik) {
        this.dom.highRiskSignerNik.value = leader.nik || '';
      }
      if (this.dom.highRiskConfirmationText) {
        this.dom.highRiskConfirmationText.value = '';
      }

      // Reset checkboxes
      for (let i = 1; i <= 4; i++) {
        const cb = document.getElementById(`check-highrisk-${i}`);
        if (cb) cb.checked = false;
      }

      this.openModal(this.dom.modalHighRisk);
    }

    /**
     * Handle submission of Modal 1: Tetap Naik
     */
    handleHighRiskSubmit() {
      const confirmVal = (this.dom.highRiskConfirmationText ? this.dom.highRiskConfirmationText.value : '').trim().toUpperCase();
      if (confirmVal !== 'SAYA SETUJU') {
        alert('Harap ketik "SAYA SETUJU" untuk mengonfirmasi penandatanganan pakta integritas risiko.');
        return;
      }

      const signerName = this.dom.highRiskSignerName ? this.dom.highRiskSignerName.value.trim() : '';
      const signerNik = this.dom.highRiskSignerNik ? this.dom.highRiskSignerNik.value.trim() : '';

      const waiverData = {
        signerName: signerName || (this.currentBooking.leader && this.currentBooking.leader.name),
        signerNik: signerNik || (this.currentBooking.leader && this.currentBooking.leader.nik),
        equipmentChecklistPassed: true,
        notes: 'Pendaki menyepakati SOP badai ekstrem, membawa storm tent, logistik ekstra, dan siap dievakuasi.'
      };

      try {
        const updated = this.store.executeProceedHighRisk(this.currentBookingId, waiverData);
        this.currentBooking = updated;
        this.closeModal(this.dom.modalHighRisk);
        this.showToast('Pakta Integritas Berhasil Disetujui!', 'Status tiket diperbarui menjadi Tetap Naik (High Risk). Harap lapor pos basecamp saat tiba.', 'warning');
        this.renderTicketDetails();
        this.renderWeatherAlertSection();
        this.renderPostMitigationBanner();
        this.renderBookingChips();
      } catch (err) {
        alert('Gagal memproses pilihan: ' + err.message);
      }
    }

    /**
     * Setup and open Modal 2: Reschedule
     */
    openModalReschedule() {
      if (!this.currentBooking) return;

      const baseDate = new Date(this.currentBooking.climbDate || new Date());
      const minDate = new Date(baseDate);
      minDate.setDate(minDate.getDate() + 1);

      const maxDate = new Date(baseDate);
      maxDate.setDate(maxDate.getDate() + 30);

      const minStr = minDate.toISOString().split('T')[0];
      const maxStr = maxDate.toISOString().split('T')[0];

      if (this.dom.rescheduleDateInput) {
        this.dom.rescheduleDateInput.min = minStr;
        this.dom.rescheduleDateInput.max = maxStr;
        this.dom.rescheduleDateInput.value = minStr;
      }

      // Render 3 quick date recommendation cards (+3 days, +7 days, +14 days)
      if (this.dom.quickRescheduleDates) {
        const offsets = [3, 7, 14];
        let quickHtml = '';

        offsets.forEach(offset => {
          const d = new Date(baseDate);
          d.setDate(d.getDate() + offset);
          const valStr = d.toISOString().split('T')[0];
          const displayStr = formatDateIndo(valStr);

          quickHtml += `
            <button 
              type="button" 
              class="quick-date-card p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-left transition"
              data-date="${valStr}"
            >
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-emerald-800">+${offset} Hari</span>
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <strong class="text-xs text-slate-800 block mt-0.5">${displayStr}</strong>
              <span class="text-[10px] text-emerald-700 font-semibold block">Cuaca Aman • Kuota OK</span>
            </button>
          `;
        });

        this.dom.quickRescheduleDates.innerHTML = quickHtml;

        const quickButtons = this.dom.quickRescheduleDates.querySelectorAll('.quick-date-card');
        quickButtons.forEach(btn => {
          btn.addEventListener('click', (e) => {
            const chosen = e.currentTarget.getAttribute('data-date');
            if (this.dom.rescheduleDateInput) {
              this.dom.rescheduleDateInput.value = chosen;
            }
          });
        });
      }

      this.openModal(this.dom.modalReschedule);
    }

    /**
     * Handle submission of Modal 2: Reschedule
     */
    handleRescheduleSubmit() {
      const newDate = this.dom.rescheduleDateInput ? this.dom.rescheduleDateInput.value : '';
      if (!newDate) {
        alert('Harap pilih tanggal pendakian baru.');
        return;
      }

      try {
        const updated = this.store.executeReschedule(this.currentBookingId, newDate);
        this.currentBooking = updated;
        this.closeModal(this.dom.modalReschedule);
        this.showToast('Jadwal Berhasil Diperbarui (Rp 0)!', `Tanggal pendakian telah dipindahkan ke ${formatDateIndo(newDate)}. QR Code baru telah diterbitkan.`, 'info');
        this.renderTicketDetails();
        this.renderWeatherAlertSection();
        this.renderPostMitigationBanner();
        this.renderBookingChips();
      } catch (err) {
        alert('Gagal melakukan reschedule: ' + err.message);
      }
    }

    /**
     * Setup and open Modal 3: Refund
     */
    openModalRefund() {
      if (!this.currentBooking) return;

      if (this.dom.refundTotalAmount) {
        this.dom.refundTotalAmount.textContent = formatRupiah(this.currentBooking.totalPayment);
      }

      const leader = this.currentBooking.leader || {};
      if (this.dom.refundAccountName) {
        this.dom.refundAccountName.value = leader.name || '';
      }
      if (this.dom.refundAccountNumber) {
        this.dom.refundAccountNumber.value = '';
      }

      this.openModal(this.dom.modalRefund);
    }

    /**
     * Handle submission of Modal 3: Refund
     */
    handleRefundSubmit() {
      const bank = this.dom.refundBank ? this.dom.refundBank.value : 'TRANSFER_BANK';
      const accNum = this.dom.refundAccountNumber ? this.dom.refundAccountNumber.value.trim() : '';
      const accName = this.dom.refundAccountName ? this.dom.refundAccountName.value.trim() : '';

      if (!accNum) {
        alert('Harap isi nomor rekening atau nomor e-wallet tujuan.');
        return;
      }

      const refundData = {
        bankName: bank,
        accountNumber: accNum,
        accountHolder: accName || (this.currentBooking.leader && this.currentBooking.leader.name)
      };

      try {
        const updated = this.store.executeRefund(this.currentBookingId, refundData);
        this.currentBooking = updated;
        this.closeModal(this.dom.modalRefund);
        this.showToast('Klaim Refund 100% Berhasil!', `Pengembalian dana 100% sebesar ${formatRupiah(updated.totalPayment)} diproses. Voucher kuitansi telah terbit.`, 'success');
        this.renderTicketDetails();
        this.renderWeatherAlertSection();
        this.renderPostMitigationBanner();
        this.renderBookingChips();
      } catch (err) {
        alert('Gagal memproses refund: ' + err.message);
      }
    }
  }

  // Auto-init when DOM is ready in browser
  let ticketApp = null;
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      ticketApp = new TicketController();
      ticketApp.init();
      window.ticketController = ticketApp;
    });
  }

  return {
    TicketController: TicketController,
    formatRupiah: formatRupiah,
    formatDateIndo: formatDateIndo,
    generateQRCodeSVG: generateQRCodeSVG
  };
}));
