/**
 * SummitGuard - SIMAKSI Booking & Checkout Form Controller
 * Manages mountain selection, dynamic basecamps, date boundaries,
 * dynamic member rows, equipment screening, local porter add-on,
 * fee calculation, and transaction checkout with instant redirection to ticket.html.
 */

(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(['SummitStore'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./store'));
  } else {
    root.SummitBooking = factory(root.SummitStore);
  }
}(typeof self !== 'undefined' ? self : this, function (SummitStore) {
  'use strict';

  // Format IDR currency helper
  function formatRupiah(amount) {
    return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
  }

  // Fallback store access if needed
  function getStore() {
    if (typeof window !== 'undefined' && window.SummitStore) {
      return window.SummitStore;
    }
    return SummitStore;
  }

  /**
   * Controller class for Booking Form
   */
  class BookingController {
    constructor() {
      this.store = getStore();
      this.mountains = [];
      this.selectedMountain = null;
      this.countdownInterval = null;

      // DOM Elements cache
      this.dom = {};
    }

    /**
     * Initialize form and bind all events
     */
    init() {
      if (typeof document === 'undefined') return;

      this.cacheDom();
      if (!this.dom.form && !this.dom.mountainSelect) return;

      this.loadMountains();
      this.initDateLimits();
      this.checkUrlParams();
      this.renderBasecampOptions();
      this.renderMountainPreview();
      this.renderMemberRows();
      this.updatePriceSummary();
      this.bindEvents();
    }

    /**
     * Cache all interactive DOM elements
     */
    cacheDom() {
      this.dom = {
        form: document.getElementById('booking-form'),
        mountainSelect: document.getElementById('mountain-select'),
        basecampSelect: document.getElementById('basecamp-select'),
        climbDate: document.getElementById('climb-date'),
        climbDuration: document.getElementById('climb-duration'),
        
        // Preview elements
        mountainPreviewCard: document.getElementById('mountain-preview-card'),
        previewMountainName: document.getElementById('preview-mountain-name'),
        previewMountainElevation: document.getElementById('preview-mountain-elevation'),
        previewQuotaBadge: document.getElementById('preview-quota-badge'),
        previewWeatherCondition: document.getElementById('preview-weather-condition'),
        previewWeatherTemp: document.getElementById('preview-weather-temp'),
        previewWeatherWind: document.getElementById('preview-weather-wind'),
        previewWeatherAlertBox: document.getElementById('preview-weather-alert-box'),
        previewWeatherAlertMessage: document.getElementById('preview-weather-alert-message'),

        // Leader details
        leaderName: document.getElementById('leader-name'),
        leaderNik: document.getElementById('leader-nik'),
        leaderNikCounter: document.getElementById('leader-nik-counter'),
        leaderPhone: document.getElementById('leader-phone'),
        leaderEmergency: document.getElementById('leader-emergency'),

        // Members
        membersCount: document.getElementById('members-count'),
        membersContainer: document.getElementById('members-container'),

        // Equipments & Health
        equipTent: document.getElementById('equip-tent'),
        equipSb: document.getElementById('equip-sb'),
        equipRaincoat: document.getElementById('equip-raincoat'),
        equipMat: document.getElementById('equip-mat'),
        equipFirstaid: document.getElementById('equip-firstaid'),
        healthConfirm: document.getElementById('health-confirm'),
        btnCheckAllEquip: document.getElementById('btn-check-all-equip'),
        btnAutofillDemo: document.getElementById('btn-autofill-demo'),

        // Porter addon
        porterAddon: document.getElementById('porter-addon'),
        porterCountWrapper: document.getElementById('porter-count-wrapper'),
        porterCount: document.getElementById('porter-count'),

        // Summary elements
        paymentSummary: document.getElementById('payment-summary'),
        summaryTicketLabel: document.getElementById('summary-ticket-label'),
        summaryTicketRate: document.getElementById('summary-ticket-rate'),
        summaryTicketSubtotal: document.getElementById('summary-ticket-subtotal'),
        summaryInsuranceLabel: document.getElementById('summary-insurance-label'),
        summaryInsuranceSubtotal: document.getElementById('summary-insurance-subtotal'),
        summaryPorterRow: document.getElementById('summary-porter-row'),
        summaryPorterLabel: document.getElementById('summary-porter-label'),
        summaryPorterSubtotal: document.getElementById('summary-porter-subtotal'),
        summaryTotalDisplay: document.getElementById('summary-total-display'),
        bookingErrorMsg: document.getElementById('booking-error-msg'),
        submitBtn: document.getElementById('submit-booking-btn'),

        // Success Modal
        successModal: document.getElementById('success-modal'),
        modalBookingId: document.getElementById('modal-booking-id'),
        modalBookingDestination: document.getElementById('modal-booking-destination'),
        modalBookingDate: document.getElementById('modal-booking-date'),
        modalBookingTotal: document.getElementById('modal-booking-total'),
        modalWeatherAlertNotice: document.getElementById('modal-weather-alert-notice'),
        modalViewTicketBtn: document.getElementById('modal-view-ticket-btn'),
        modalCountdown: document.getElementById('modal-countdown')
      };
    }

    /**
     * Load mountains list from SummitStore
     */
    loadMountains() {
      if (this.store && typeof this.store.getMountains === 'function') {
        this.mountains = this.store.getMountains();
      } else {
        this.mountains = [];
      }

      if (this.dom.mountainSelect && this.mountains.length > 0) {
        this.dom.mountainSelect.innerHTML = '';
        this.mountains.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.name} (${m.elevation})`;
          this.dom.mountainSelect.appendChild(opt);
        });
        this.selectedMountain = this.mountains[0];
      }
    }

    /**
     * Check URL query params for preselected mountain (?mountain=merbabu)
     */
    checkUrlParams() {
      if (typeof window === 'undefined') return;

      const urlParams = new URLSearchParams(window.location.search);
      const mParam = urlParams.get('mountain') || urlParams.get('id');

      if (mParam && this.mountains.length > 0) {
        const found = this.mountains.find(m => String(m.id).toLowerCase() === mParam.toLowerCase());
        if (found) {
          this.selectedMountain = found;
          if (this.dom.mountainSelect) {
            this.dom.mountainSelect.value = found.id;
          }
        }
      }
    }

    /**
     * Configure Date limits: min = today, max = today + 60 days
     */
    initDateLimits() {
      if (!this.dom.climbDate) return;

      const today = new Date();
      const minDateStr = today.toISOString().split('T')[0];

      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 60);
      const maxDateStr = maxDate.toISOString().split('T')[0];

      this.dom.climbDate.min = minDateStr;
      this.dom.climbDate.max = maxDateStr;

      // Default to 3 days in future if empty
      if (!this.dom.climbDate.value) {
        const defaultDate = new Date();
        defaultDate.setDate(today.getDate() + 3);
        this.dom.climbDate.value = defaultDate.toISOString().split('T')[0];
      }
    }

    /**
     * Populate Basecamps according to chosen mountain
     */
    renderBasecampOptions() {
      if (!this.dom.basecampSelect) return;

      const currentMountain = this.getSelectedMountain();
      this.dom.basecampSelect.innerHTML = '';

      if (currentMountain && Array.isArray(currentMountain.basecamps)) {
        currentMountain.basecamps.forEach(bc => {
          const opt = document.createElement('option');
          opt.value = bc.startsWith('Jalur') || bc.startsWith('Pos') ? bc : `Pos ${bc}`;
          opt.textContent = opt.value;
          this.dom.basecampSelect.appendChild(opt);
        });
      }
    }

    /**
     * Return currently selected mountain object
     */
    getSelectedMountain() {
      const id = this.dom.mountainSelect ? this.dom.mountainSelect.value : null;
      if (!id) return this.mountains[0] || null;
      return this.mountains.find(m => m.id === id) || this.mountains[0] || null;
    }

    /**
     * Render live weather & quota status preview for chosen mountain
     */
    renderMountainPreview() {
      const mountain = this.getSelectedMountain();
      if (!mountain) return;

      if (this.dom.previewMountainName) {
        this.dom.previewMountainName.textContent = mountain.name;
      }
      if (this.dom.previewMountainElevation) {
        this.dom.previewMountainElevation.textContent = `(${mountain.elevation})`;
      }
      if (this.dom.previewQuotaBadge) {
        const remaining = mountain.remainingQuota || 0;
        const total = mountain.dailyQuota || 500;
        this.dom.previewQuotaBadge.textContent = `${remaining} sisa dari ${total}`;
        if (remaining < 50) {
          this.dom.previewQuotaBadge.className = 'font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full';
        } else {
          this.dom.previewQuotaBadge.className = 'font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full';
        }
      }

      // Weather data
      const weather = mountain.weather || {
        status: 'safe',
        condition: 'Cerah Berawan',
        temp: '14°C',
        windSpeed: '12 knot',
        warningActive: false
      };

      if (this.dom.previewWeatherCondition) {
        this.dom.previewWeatherCondition.textContent = weather.condition || 'Cerah';
      }
      if (this.dom.previewWeatherTemp) {
        this.dom.previewWeatherTemp.textContent = weather.temp || '15°C';
      }
      if (this.dom.previewWeatherWind) {
        this.dom.previewWeatherWind.textContent = weather.windSpeed || '10 knot';
      }

      // Warning alert box visibility
      const isWarning = weather.status === 'warning' || weather.warningActive === true;
      if (this.dom.previewWeatherAlertBox) {
        if (isWarning) {
          this.dom.previewWeatherAlertBox.classList.remove('hidden');
          if (this.dom.previewWeatherAlertMessage) {
            this.dom.previewWeatherAlertMessage.textContent = weather.warningMessage ||
              'BMKG mengeluarkan peringatan dini cuaca ekstrem. Registrasi tetap dibuka dengan perlindungan mitigasi badai.';
          }
        } else {
          this.dom.previewWeatherAlertBox.classList.add('hidden');
        }
      }
    }

    /**
     * Render dynamic input rows for additional members
     */
    renderMemberRows() {
      if (!this.dom.membersContainer || !this.dom.membersCount) return;

      const totalCount = parseInt(this.dom.membersCount.value, 10) || 3;
      const additionalCount = Math.max(1, totalCount - 1); // 1 is Leader, rest are members

      // Collect existing inputs to avoid clearing when user toggles number
      const existingData = [];
      const currentRows = this.dom.membersContainer.querySelectorAll('.member-row-item');
      currentRows.forEach(row => {
        const nameInput = row.querySelector('.member-name-input');
        const nikInput = row.querySelector('.member-nik-input');
        existingData.push({
          name: nameInput ? nameInput.value : '',
          nik: nikInput ? nikInput.value : ''
        });
      });

      this.dom.membersContainer.innerHTML = '';

      for (let i = 0; i < additionalCount; i++) {
        const memberNum = i + 2; // Member 2, Member 3, etc.
        const prevName = existingData[i] ? existingData[i].name : '';
        const prevNik = existingData[i] ? existingData[i].nik : '';

        const rowDiv = document.createElement('div');
        rowDiv.className = 'member-row-item p-4 rounded-xl bg-slate-50 border border-slate-200 transition';
        rowDiv.innerHTML = `
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                ${memberNum}
              </span>
              <span>Anggota Rombongan #${memberNum}</span>
            </span>
            <span class="text-[10px] font-medium text-slate-500 member-nik-badge font-mono">
              ${prevNik ? prevNik.length : 0}/16 digit NIK
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="member-name-${i}" class="block text-[11px] font-semibold text-slate-600 mb-1">
                Nama Lengkap (Sesuai KTP/KIA) <span class="text-red-500">*</span>
              </label>
              <input type="text" id="member-name-${i}" class="member-name-input w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="Nama Anggota #${memberNum}" value="${prevName}">
            </div>
            <div>
              <label for="member-nik-${i}" class="block text-[11px] font-semibold text-slate-600 mb-1">
                NIK KTP / No. Identitas (16 Digit) <span class="text-red-500">*</span>
              </label>
              <input type="text" id="member-nik-${i}" maxlength="16" class="member-nik-input w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition" placeholder="16 digit NIK Anggota #${memberNum}" value="${prevNik}">
            </div>
          </div>
        `;

        // Bind NIK counter listener
        const nikInput = rowDiv.querySelector('.member-nik-input');
        const badge = rowDiv.querySelector('.member-nik-badge');
        if (nikInput && badge) {
          nikInput.addEventListener('input', () => {
            badge.textContent = `${nikInput.value.length}/16 digit NIK`;
            if (nikInput.value.length === 16) {
              badge.className = 'text-[10px] font-bold text-emerald-600 member-nik-badge font-mono';
            } else {
              badge.className = 'text-[10px] font-medium text-slate-500 member-nik-badge font-mono';
            }
          });
        }

        this.dom.membersContainer.appendChild(rowDiv);
      }
    }

    /**
     * Calculate and display total checkout breakdown
     */
    updatePriceSummary() {
      const mountain = this.getSelectedMountain();
      const ticketPrice = mountain ? (mountain.ticketPrice || 25000) : 25000;
      const insuranceFee = 5000;
      const totalCount = parseInt(this.dom.membersCount ? this.dom.membersCount.value : 3, 10) || 3;

      const hasPorter = Boolean(this.dom.porterAddon && this.dom.porterAddon.checked);
      const porterCount = hasPorter ? (parseInt(this.dom.porterCount ? this.dom.porterCount.value : 1, 10) || 1) : 0;
      const porterFeePerUnit = 350000;
      const porterSubtotal = hasPorter ? (porterCount * porterFeePerUnit) : 0;

      const ticketSubtotal = ticketPrice * totalCount;
      const insuranceSubtotal = insuranceFee * totalCount;
      const totalPayment = ticketSubtotal + insuranceSubtotal + porterSubtotal;

      // Update UI labels & values
      if (this.dom.summaryTicketLabel) {
        this.dom.summaryTicketLabel.textContent = `Tiket Masuk PNBP (${totalCount} orang)`;
      }
      if (this.dom.summaryTicketRate) {
        this.dom.summaryTicketRate.textContent = `@ ${formatRupiah(ticketPrice)} / orang`;
      }
      if (this.dom.summaryTicketSubtotal) {
        this.dom.summaryTicketSubtotal.textContent = formatRupiah(ticketSubtotal);
      }

      if (this.dom.summaryInsuranceLabel) {
        this.dom.summaryInsuranceLabel.textContent = `Asuransi Jiwa & SAR (${totalCount} orang)`;
      }
      if (this.dom.summaryInsuranceSubtotal) {
        this.dom.summaryInsuranceSubtotal.textContent = formatRupiah(insuranceSubtotal);
      }

      if (this.dom.summaryPorterRow) {
        if (hasPorter) {
          this.dom.summaryPorterRow.classList.remove('hidden');
          if (this.dom.summaryPorterLabel) {
            this.dom.summaryPorterLabel.textContent = `Jasa Porter Paguyuban (${porterCount} orang)`;
          }
          if (this.dom.summaryPorterSubtotal) {
            this.dom.summaryPorterSubtotal.textContent = formatRupiah(porterSubtotal);
          }
        } else {
          this.dom.summaryPorterRow.classList.add('hidden');
        }
      }

      if (this.dom.summaryTotalDisplay) {
        this.dom.summaryTotalDisplay.textContent = formatRupiah(totalPayment);
      }

      return {
        ticketPrice,
        insuranceFee,
        totalCount,
        hasPorter,
        porterCount,
        porterSubtotal,
        totalPayment
      };
    }

    /**
     * Check all equipment checkboxes helper
     */
    checkAllEquipments() {
      const checkboxes = [
        this.dom.equipTent,
        this.dom.equipSb,
        this.dom.equipRaincoat,
        this.dom.equipMat,
        this.dom.equipFirstaid,
        this.dom.healthConfirm
      ];
      checkboxes.forEach(cb => {
        if (cb) cb.checked = true;
      });
    }

    /**
     * Autofill mock demo data for swift testing and demo presentation
     */
    autofillDemo() {
      if (this.dom.leaderName) this.dom.leaderName.value = 'Andi Pratama';
      if (this.dom.leaderNik) {
        this.dom.leaderNik.value = '3302198701020003';
        if (this.dom.leaderNikCounter) {
          this.dom.leaderNikCounter.textContent = '16/16 digit';
          this.dom.leaderNikCounter.className = 'text-[11px] font-bold text-emerald-600 font-mono';
        }
      }
      if (this.dom.leaderPhone) this.dom.leaderPhone.value = '081234567890';
      if (this.dom.leaderEmergency) this.dom.leaderEmergency.value = '081987654321 (Ayah)';

      if (this.dom.membersCount) {
        this.dom.membersCount.value = '3';
        this.renderMemberRows();
      }

      const m1Name = document.getElementById('member-name-0');
      const m1Nik = document.getElementById('member-nik-0');
      if (m1Name) m1Name.value = 'Budi Santoso';
      if (m1Nik) m1Nik.value = '3302198701020004';

      const m2Name = document.getElementById('member-name-1');
      const m2Nik = document.getElementById('member-nik-1');
      if (m2Name) m2Name.value = 'Citra Lestari';
      if (m2Nik) m2Nik.value = '3302198701020005';

      // Update counters in dynamic rows
      if (this.dom.membersContainer) {
        const badges = this.dom.membersContainer.querySelectorAll('.member-nik-badge');
        badges.forEach(b => {
          b.textContent = '16/16 digit NIK';
          b.className = 'text-[10px] font-bold text-emerald-600 member-nik-badge font-mono';
        });
      }

      if (this.dom.porterAddon) {
        this.dom.porterAddon.checked = true;
        if (this.dom.porterCountWrapper) {
          this.dom.porterCountWrapper.classList.remove('hidden');
        }
        if (this.dom.porterCount) {
          this.dom.porterCount.value = '1';
        }
      }

      this.checkAllEquipments();
      this.updatePriceSummary();

      // Clear any prior errors
      if (this.dom.bookingErrorMsg) {
        this.dom.bookingErrorMsg.classList.add('hidden');
      }
    }

    /**
     * Validate all inputs
     * @returns {string|null} Error string if invalid, null if valid
     */
    validateForm() {
      const mountain = this.getSelectedMountain();
      if (!mountain) {
        return 'Pilihan destinasi gunung konservasi tidak valid.';
      }

      if (!this.dom.basecampSelect || !this.dom.basecampSelect.value.trim()) {
        return 'Silakan pilih pos registrasi basecamp resmi.';
      }

      if (!this.dom.climbDate || !this.dom.climbDate.value) {
        return 'Silakan pilih tanggal pendakian.';
      }

      // Validate leader info
      const leaderName = this.dom.leaderName ? this.dom.leaderName.value.trim() : '';
      if (!leaderName || leaderName.length < 3) {
        return 'Nama lengkap Ketua Rombongan wajib diisi (minimal 3 karakter).';
      }

      const leaderNik = this.dom.leaderNik ? this.dom.leaderNik.value.trim() : '';
      if (!/^\d{16}$/.test(leaderNik)) {
        return 'NIK Ketua Rombongan harus berupa 16 digit angka e-KTP yang valid.';
      }

      const leaderPhone = this.dom.leaderPhone ? this.dom.leaderPhone.value.trim() : '';
      if (!leaderPhone || leaderPhone.length < 9) {
        return 'Nomor telepon WhatsApp aktif Ketua Rombongan wajib diisi.';
      }

      const leaderEmergency = this.dom.leaderEmergency ? this.dom.leaderEmergency.value.trim() : '';
      if (!leaderEmergency || leaderEmergency.length < 5) {
        return 'Nomor kontak darurat keluarga & hubungan wajib diisi.';
      }

      // Validate members
      const totalMembers = parseInt(this.dom.membersCount ? this.dom.membersCount.value : 1, 10);
      if (totalMembers < 2) {
        return 'Sesuai regulasi Taman Nasional, jumlah rombongan minimal 2 orang (solo hike dilarang).';
      }

      const memberNames = this.dom.membersContainer.querySelectorAll('.member-name-input');
      const memberNiks = this.dom.membersContainer.querySelectorAll('.member-nik-input');

      for (let i = 0; i < memberNames.length; i++) {
        const num = i + 2;
        const nameVal = memberNames[i].value.trim();
        const nikVal = memberNiks[i].value.trim();

        if (!nameVal) {
          return `Nama lengkap Anggota #${num} belum diisi.`;
        }
        if (!/^\d{16}$/.test(nikVal)) {
          return `NIK Anggota #${num} harus tepat 16 digit angka.`;
        }
      }

      // Validate equipment checklist
      const requiredEquip = [
        { el: this.dom.equipTent, label: 'Tenda Double Layer' },
        { el: this.dom.equipSb, label: 'Sleeping Bag per Orang' },
        { el: this.dom.equipRaincoat, label: 'Jas Hujan / Ponco' },
        { el: this.dom.equipMat, label: 'Matras Thermal' },
        { el: this.dom.equipFirstaid, label: 'Kotak P3K Esensial' }
      ];

      for (const eq of requiredEquip) {
        if (eq.el && !eq.el.checked) {
          return `Skrining perlengkapan belum lengkap: Wajib membawa "${eq.label}".`;
        }
      }

      // Validate health confirm
      if (this.dom.healthConfirm && !this.dom.healthConfirm.checked) {
        return 'Harap centang konfirmasi kondisi fisik sehat & siap mematuhi SOP.';
      }

      return null;
    }

    /**
     * Submit booking and handle instant checkout
     */
    submitBooking() {
      const error = this.validateForm();
      if (error) {
        if (this.dom.bookingErrorMsg) {
          this.dom.bookingErrorMsg.textContent = error;
          this.dom.bookingErrorMsg.classList.remove('hidden');
          this.dom.bookingErrorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
      }

      if (this.dom.bookingErrorMsg) {
        this.dom.bookingErrorMsg.classList.add('hidden');
      }

      const currentMountain = this.getSelectedMountain();
      const pricing = this.updatePriceSummary();

      // Collect members
      const membersList = [];
      const memberNames = this.dom.membersContainer.querySelectorAll('.member-name-input');
      const memberNiks = this.dom.membersContainer.querySelectorAll('.member-nik-input');

      for (let i = 0; i < memberNames.length; i++) {
        membersList.push({
          name: memberNames[i].value.trim(),
          nik: memberNiks[i].value.trim()
        });
      }

      // Payment method
      let selectedMethod = 'QRIS';
      if (this.dom.form) {
        const checkedRadio = this.dom.form.querySelector('input[name="paymentMethod"]:checked');
        if (checkedRadio) selectedMethod = checkedRadio.value;
      }

      const bookingData = {
        mountainId: currentMountain.id,
        mountainName: currentMountain.name,
        basecamp: this.dom.basecampSelect.value,
        climbDate: this.dom.climbDate.value,
        durationDays: parseInt(this.dom.climbDuration ? this.dom.climbDuration.value : 2, 10) || 2,
        leader: {
          name: this.dom.leaderName.value.trim(),
          nik: this.dom.leaderNik.value.trim(),
          phone: this.dom.leaderPhone.value.trim(),
          emergencyContact: this.dom.leaderEmergency.value.trim()
        },
        membersCount: pricing.totalCount,
        members: membersList,
        addons: {
          porterLocal: pricing.hasPorter,
          porterCount: pricing.porterCount,
          porterFee: pricing.porterSubtotal
        },
        totalPayment: pricing.totalPayment,
        paymentMethod: selectedMethod
      };

      // Create booking in SummitStore
      let createdBooking = null;
      try {
        createdBooking = this.store.createBooking(bookingData);
      } catch (err) {
        console.error('SummitStore.createBooking error:', err);
        if (this.dom.bookingErrorMsg) {
          this.dom.bookingErrorMsg.textContent = 'Gagal menyimpan reservasi: ' + err.message;
          this.dom.bookingErrorMsg.classList.remove('hidden');
        }
        return false;
      }

      // Display Success Dialog & Countdown redirect
      this.showSuccessModal(createdBooking);
      return true;
    }

    /**
     * Show success modal with details and countdown to ticket.html
     * @param {object} booking
     */
    showSuccessModal(booking) {
      if (!this.dom.successModal) {
        // Fallback direct redirection
        if (typeof window !== 'undefined') {
          window.location.href = `ticket.html?id=${encodeURIComponent(booking.bookingId)}`;
        }
        return;
      }

      if (this.dom.modalBookingId) {
        this.dom.modalBookingId.textContent = booking.bookingId;
      }
      if (this.dom.modalBookingDestination) {
        this.dom.modalBookingDestination.textContent = `${booking.mountainName} - ${booking.basecamp}`;
      }
      if (this.dom.modalBookingDate) {
        this.dom.modalBookingDate.textContent = `${booking.climbDate} (${booking.membersCount} Pendaki)`;
      }
      if (this.dom.modalBookingTotal) {
        this.dom.modalBookingTotal.textContent = formatRupiah(booking.totalPayment);
      }

      // Check for weather warning status
      const isWeatherWarning = booking.status === 'WEATHER_WARNING';
      if (this.dom.modalWeatherAlertNotice) {
        if (isWeatherWarning) {
          this.dom.modalWeatherAlertNotice.classList.remove('hidden');
        } else {
          this.dom.modalWeatherAlertNotice.classList.add('hidden');
        }
      }

      const ticketUrl = `ticket.html?id=${encodeURIComponent(booking.bookingId)}`;
      if (this.dom.modalViewTicketBtn) {
        this.dom.modalViewTicketBtn.setAttribute('href', ticketUrl);
      }

      // Disable submit button
      if (this.dom.submitBtn) {
        this.dom.submitBtn.disabled = true;
        this.dom.submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }

      // Show modal
      this.dom.successModal.classList.remove('hidden');

      // Countdown redirect
      let secondsLeft = 3;
      if (this.dom.modalCountdown) {
        this.dom.modalCountdown.textContent = String(secondsLeft);
      }

      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }

      this.countdownInterval = setInterval(() => {
        secondsLeft -= 1;
        if (this.dom.modalCountdown) {
          this.dom.modalCountdown.textContent = String(secondsLeft);
        }
        if (secondsLeft <= 0) {
          clearInterval(this.countdownInterval);
          if (typeof window !== 'undefined') {
            window.location.href = ticketUrl;
          }
        }
      }, 1000);
    }

    /**
     * Bind all DOM event listeners
     */
    bindEvents() {
      // Mountain select change
      if (this.dom.mountainSelect) {
        this.dom.mountainSelect.addEventListener('change', () => {
          this.renderBasecampOptions();
          this.renderMountainPreview();
          this.updatePriceSummary();
        });
      }

      // Leader NIK counter
      if (this.dom.leaderNik && this.dom.leaderNikCounter) {
        this.dom.leaderNik.addEventListener('input', () => {
          const len = this.dom.leaderNik.value.length;
          this.dom.leaderNikCounter.textContent = `${len}/16 digit`;
          if (len === 16) {
            this.dom.leaderNikCounter.className = 'text-[11px] font-bold text-emerald-600 font-mono';
          } else {
            this.dom.leaderNikCounter.className = 'text-[11px] text-slate-500 font-mono';
          }
        });
      }

      // Members count change
      if (this.dom.membersCount) {
        this.dom.membersCount.addEventListener('change', () => {
          this.renderMemberRows();
          this.updatePriceSummary();
        });
      }

      // Porter addon toggle
      if (this.dom.porterAddon) {
        this.dom.porterAddon.addEventListener('change', () => {
          if (this.dom.porterCountWrapper) {
            if (this.dom.porterAddon.checked) {
              this.dom.porterCountWrapper.classList.remove('hidden');
            } else {
              this.dom.porterCountWrapper.classList.add('hidden');
            }
          }
          this.updatePriceSummary();
        });
      }

      // Porter count change
      if (this.dom.porterCount) {
        this.dom.porterCount.addEventListener('change', () => {
          this.updatePriceSummary();
        });
      }

      // Check all equipment button
      if (this.dom.btnCheckAllEquip) {
        this.dom.btnCheckAllEquip.addEventListener('click', () => {
          this.checkAllEquipments();
        });
      }

      // Autofill demo button
      if (this.dom.btnAutofillDemo) {
        this.dom.btnAutofillDemo.addEventListener('click', () => {
          this.autofillDemo();
        });
      }

      // Submit checkout button
      if (this.dom.submitBtn) {
        this.dom.submitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.submitBooking();
        });
      }
    }
  }

  // Auto-instantiate on DOMContentLoaded
  let controller = null;
  if (typeof document !== 'undefined') {
    controller = new BookingController();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        controller.init();
      });
    } else {
      controller.init();
    }
  }

  return {
    BookingController: BookingController,
    getController: function () {
      return controller;
    }
  };
}));
