/**
 * SummitGuard - Store & Core Business Logic
 * Centralized state management for mountains catalog, BMKG weather alerts,
 * SIMAKSI booking history, and disaster risk mitigation flows.
 */

(function (global) {
  'use strict';

  const STORAGE_KEYS = {
    MOUNTAINS: 'summit_mountains',
    BOOKINGS: 'summit_bookings'
  };

  // In-memory storage fallback for environments without localStorage (tests, SSR, private browsing)
  const _memoryStore = {};

  function _isStorageAvailable() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__summit_test_storage__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  function _getItem(key) {
    if (_isStorageAvailable()) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch (e) {
        // Fall back to memory
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
        console.warn('localStorage setItem failed, falling back to in-memory store:', e);
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

  // Initial Mock Data: 3 Mountains
  const DEFAULT_MOUNTAINS = [
    {
      id: 'merbabu',
      name: 'Gunung Merbabu',
      elevation: '3.142 mdpl',
      province: 'Jawa Tengah',
      basecamps: ['Selo', 'Suwanting', 'Thekelan', 'Wekas'],
      dailyQuota: 400,
      remainingQuota: 128,
      ticketPrice: 25000,
      weather: {
        status: 'warning',
        condition: 'Badai Hujan & Angin Kencang',
        temp: '8°C',
        windSpeed: '48 knot',
        warningActive: true,
        warningMessage: 'BMKG mengeluarkan peringatan dini badai petir dan angin kencang di ketinggian >2.000 mdpl.'
      }
    },
    {
      id: 'prau',
      name: 'Gunung Prau',
      elevation: '2.565 mdpl',
      province: 'Jawa Tengah',
      basecamps: ['Dieng', 'Patakbanteng', 'Kalilembu', 'Dwarawati', 'Wates', 'Igirmranak'],
      dailyQuota: 500,
      remainingQuota: 340,
      ticketPrice: 30000,
      weather: {
        status: 'safe',
        condition: 'Cerah Berawan',
        temp: '14°C',
        windSpeed: '12 knot',
        warningActive: false,
        warningMessage: 'Kondisi cuaca terpantau aman dan kondusif untuk aktivitas pendakian.'
      }
    },
    {
      id: 'gede',
      name: 'Gunung Gede Pangrango',
      elevation: '2.958 mdpl',
      province: 'Jawa Barat',
      basecamps: ['Cibodas', 'Gunung Putri', 'Selabintana'],
      dailyQuota: 600,
      remainingQuota: 215,
      ticketPrice: 35000,
      weather: {
        status: 'safe',
        condition: 'Kabut Tipis & Hujan Ringan',
        temp: '11°C',
        windSpeed: '18 knot',
        warningActive: false,
        warningMessage: 'Waspada jalur licin di pos 2-3, angin dalam batas aman.'
      }
    }
  ];

  // Initial Mock Data: Sample Booking ready for demo
  const DEFAULT_BOOKINGS = [
    {
      bookingId: 'SMK-20260920-0482',
      mountainId: 'merbabu',
      mountainName: 'Gunung Merbabu',
      basecamp: 'Jalur Selo',
      climbDate: '2026-09-20',
      durationDays: 2,
      leader: {
        name: 'Andi Pratama',
        nik: '3302198701020003',
        phone: '081234567890',
        emergencyContact: '081987654321 (Ayah)'
      },
      membersCount: 3,
      members: [
        { name: 'Budi Santoso', nik: '3302198701020004' },
        { name: 'Citra Lestari', nik: '3302198701020005' }
      ],
      addons: {
        porterLocal: true,
        porterCount: 1,
        porterFee: 350000
      },
      totalPayment: 440000,
      status: 'WEATHER_WARNING',
      mitigationChoice: null,
      highRiskWaiverSigned: false,
      rescheduledFrom: null,
      refundDetails: null,
      createdAt: '2026-09-17T10:00:00Z'
    }
  ];

  function _clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  // Helper untuk memvalidasi UUID format standar RFC 4122
  function _isUuid(id) {
    return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }

  // Safe local date string helper avoiding UTC timezone skew
  function getLocalDateString(d) {
    const date = d || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const SummitStore = {
    /**
     * Inisialisasi data storage jika belum ada
     */
    init: function () {
      const mountains = _getItem(STORAGE_KEYS.MOUNTAINS);
      if (!mountains) {
        this.saveMountains(_clone(DEFAULT_MOUNTAINS));
      }
      const bookings = _getItem(STORAGE_KEYS.BOOKINGS);
      if (!bookings) {
        this.saveBookings(_clone(DEFAULT_BOOKINGS));
      }
    },

    /**
     * Ambil seluruh daftar gunung
     */
    getMountains: function () {
      this.init();
      const data = _getItem(STORAGE_KEYS.MOUNTAINS);
      try {
        return data ? JSON.parse(data) : _clone(DEFAULT_MOUNTAINS);
      } catch (e) {
        return _clone(DEFAULT_MOUNTAINS);
      }
    },

    /**
     * Ambil detail satu gunung berdasarkan ID
     */
    getMountain: function (id) {
      if (!id) return null;
      const mountains = this.getMountains();
      const targetId = String(id).trim().toLowerCase();
      return mountains.find(m => String(m.id).toLowerCase() === targetId) || null;
    },

    /**
     * Simpan daftar gunung ke storage
     */
    saveMountains: function (mountains) {
      _setItem(STORAGE_KEYS.MOUNTAINS, JSON.stringify(mountains));
    },

    /**
     * Perbarui data/status cuaca BMKG untuk gunung tertentu
     * @param {string} mountainId
     * @param {object} weatherObj
     */
    updateMountainWeather: function (mountainId, weatherObj) {
      const mountains = this.getMountains();
      const targetId = String(mountainId).trim().toLowerCase();
      const index = mountains.findIndex(m => String(m.id).toLowerCase() === targetId);

      if (index === -1) {
        throw new Error(`Mountain with id '${mountainId}' not found.`);
      }

      mountains[index].weather = {
        ...mountains[index].weather,
        ...weatherObj
      };

      this.saveMountains(mountains);

      // Sinkronisasi status tiket aktif untuk gunung ini
      const isWarning = Boolean(
        mountains[index].weather.warningActive ||
        mountains[index].weather.status === 'warning'
      );

      const bookings = this.getBookings();
      let bookingsChanged = false;

      bookings.forEach(b => {
        if (String(b.mountainId).toLowerCase() === targetId) {
          if (isWarning && b.status === 'CONFIRMED') {
            b.status = 'WEATHER_WARNING';
            bookingsChanged = true;
          } else if (!isWarning && b.status === 'WEATHER_WARNING') {
            b.status = 'CONFIRMED';
            bookingsChanged = true;
          }
        }
      });

      if (bookingsChanged) {
        this.saveBookings(bookings);
      }

      // Sinkronisasi pembaruan cuaca gunung ke Supabase PostgreSQL database jika terhubung
      try {
        this.syncToSupabase('mountain', mountains[index]).catch(function () {});
      } catch (e) {
        // Fallback aman offline
      }

      return mountains[index];
    },

    /**
     * Ambil seluruh riwayat booking SIMAKSI
     */
    getBookings: function () {
      this.init();
      const data = _getItem(STORAGE_KEYS.BOOKINGS);
      try {
        return data ? JSON.parse(data) : _clone(DEFAULT_BOOKINGS);
      } catch (e) {
        return _clone(DEFAULT_BOOKINGS);
      }
    },

    /**
     * Ambil satu booking berdasarkan bookingId
     */
    getBooking: function (bookingId) {
      if (!bookingId) return null;
      const bookings = this.getBookings();
      const targetId = String(bookingId).trim().toUpperCase();
      return bookings.find(b => String(b.bookingId).trim().toUpperCase() === targetId) || null;
    },

    /**
     * Simpan daftar booking ke storage
     */
    saveBookings: function (bookings) {
      _setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    },

    /**
     * Hitung total rincian biaya tiket SIMAKSI
     */
    calculateFee: function (mountainId, membersCount, hasPorter, porterFee) {
      const mountain = this.getMountain(mountainId);
      const ticketPrice = mountain ? mountain.ticketPrice : 25000;
      const insurance = 5000;
      const count = Math.max(1, parseInt(membersCount, 10) || 1);
      const porter = hasPorter ? (parseInt(porterFee, 10) || 350000) : 0;
      return (ticketPrice + insurance) * count + porter;
    },

    /**
     * Buat reservasi baru SIMAKSI
     * @param {object} bookingData
     */
    createBooking: function (bookingData) {
      if (!bookingData) throw new Error('bookingData is required');

      const mountain = this.getMountain(bookingData.mountainId);
      const mountainName = mountain ? mountain.name : (bookingData.mountainName || 'Gunung');

      // Generate Booking ID: SMK-YYYYMMDD-XXXX
      const today = new Date();
      const datePart = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0');
      const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
      const generatedId = `SMK-${datePart}-${randomPart}`;

      const membersCount = parseInt(bookingData.membersCount, 10) ||
        (bookingData.members && bookingData.members.length ? bookingData.members.length + 1 : 1);

      const hasPorter = Boolean(bookingData.addons && bookingData.addons.porterLocal);
      const porterFee = hasPorter ? (bookingData.addons.porterFee || 350000) : 0;
      const totalPayment = bookingData.totalPayment ||
        this.calculateFee(bookingData.mountainId, membersCount, hasPorter, porterFee);

      // Status awal bergantung cuaca saat ini
      const isWarning = mountain && mountain.weather &&
        (mountain.weather.warningActive || mountain.weather.status === 'warning');
      const initialStatus = bookingData.status || (isWarning ? 'WEATHER_WARNING' : 'CONFIRMED');

      const newBooking = {
        bookingId: bookingData.bookingId || generatedId,
        mountainId: bookingData.mountainId,
        mountainName: mountainName,
        basecamp: bookingData.basecamp || (mountain && mountain.basecamps ? mountain.basecamps[0] : 'Basecamp Utama'),
        climbDate: bookingData.climbDate || getLocalDateString(today),
        durationDays: bookingData.durationDays || 2,
        leader: bookingData.leader || {
          name: '',
          nik: '',
          phone: '',
          emergencyContact: ''
        },
        membersCount: membersCount,
        members: bookingData.members || [],
        addons: {
          porterLocal: hasPorter,
          porterCount: hasPorter ? (bookingData.addons.porterCount || 1) : 0,
          porterFee: porterFee
        },
        totalPayment: totalPayment,
        status: initialStatus,
        mitigationChoice: null,
        highRiskWaiverSigned: false,
        rescheduledFrom: null,
        refundDetails: null,
        createdAt: new Date().toISOString()
      };

      // Kurangi kuota gunung tersisa
      if (mountain) {
        const mountains = this.getMountains();
        const mIndex = mountains.findIndex(m => m.id === mountain.id);
        if (mIndex !== -1) {
          mountains[mIndex].remainingQuota = Math.max(0, mountains[mIndex].remainingQuota - membersCount);
          this.saveMountains(mountains);
        }
      }

      const bookings = this.getBookings();
      bookings.unshift(newBooking);
      this.saveBookings(bookings);

      // Sinkronisasi booking baru dan kuota gunung ke Supabase PostgreSQL database
      try {
        this.syncToSupabase('booking', newBooking).catch(function () {});
        if (mountain) {
          const updatedMountain = this.getMountain(mountain.id);
          if (updatedMountain) {
            this.syncToSupabase('mountain', updatedMountain).catch(function () {});
          }
        }
      } catch (e) {
        // Fallback aman offline
      }

      return newBooking;
    },

    /**
     * Evaluasi apakah tiket tertentu terdampak peringatan cuaca BMKG
     * @param {string} bookingId
     */
    evaluateWeatherAlert: function (bookingId) {
      const booking = this.getBooking(bookingId);
      if (!booking) {
        return {
          hasWarning: false,
          booking: null,
          error: 'Booking not found'
        };
      }

      const mountain = this.getMountain(booking.mountainId);
      const isWarning = Boolean(
        mountain &&
        mountain.weather &&
        (mountain.weather.warningActive || mountain.weather.status === 'warning')
      );

      // Jika ada badai aktif dan tiket masih status CONFIRMED, update ke WEATHER_WARNING
      if (isWarning && booking.status === 'CONFIRMED') {
        booking.status = 'WEATHER_WARNING';
        const bookings = this.getBookings();
        const bIndex = bookings.findIndex(b => b.bookingId === booking.bookingId);
        if (bIndex !== -1) {
          bookings[bIndex].status = 'WEATHER_WARNING';
          this.saveBookings(bookings);
        }
      }

      return {
        hasWarning: isWarning,
        booking: booking,
        mountain: mountain,
        weather: mountain ? mountain.weather : null,
        warningMessage: mountain && mountain.weather ? mountain.weather.warningMessage : null
      };
    },

    /**
     * Mitigasi Opsi 1: Tetap Naik (High Risk Disclaimer & Pakta Integritas)
     * @param {string} bookingId
     * @param {object} waiverData
     */
    executeProceedHighRisk: function (bookingId, waiverData) {
      const bookings = this.getBookings();
      const targetId = String(bookingId).trim().toUpperCase();
      const index = bookings.findIndex(b => String(b.bookingId).trim().toUpperCase() === targetId);

      if (index === -1) {
        throw new Error(`Booking with ID '${bookingId}' not found.`);
      }

      const booking = bookings[index];
      if (booking.status === 'CANCELLED_REFUNDED') {
        return { success: false, message: 'Tiket yang sudah dibatalkan tidak dapat diaktifkan kembali.', booking: booking };
      }
      booking.status = 'HIGH_RISK_APPROVED';
      booking.mitigationChoice = 'PROCEED_HIGH_RISK';
      booking.highRiskWaiverSigned = true;
      booking.waiverDetails = {
        signerName: (waiverData && waiverData.signerName) || booking.leader.name,
        signerNik: (waiverData && waiverData.signerNik) || booking.leader.nik,
        equipmentChecklistPassed: Boolean(waiverData && waiverData.equipmentChecklistPassed !== false),
        emergencyHotline: '0811-2345-SAR (Ranger Pos Basecamp)',
        signedAt: new Date().toISOString(),
        notes: (waiverData && waiverData.notes) || 'Pendaki menyatakan siap menanggung risiko kondisi ekstrem secara mandiri.'
      };

      this.saveBookings(bookings);

      // Sinkronisasi status mitigasi risiko tinggi ke Supabase PostgreSQL database
      try {
        this.syncToSupabase('booking', booking).catch(function () {});
      } catch (e) {
        // Fallback aman offline
      }

      return { success: true, booking: booking };
    },

    /**
     * Mitigasi Opsi 2: Reschedule Tanggal Pendakian (Bebas Biaya Denda)
     * @param {string} bookingId
     * @param {string} newDate (format: YYYY-MM-DD)
     */
    executeReschedule: function (bookingId, newDate) {
      if (!newDate) throw new Error('newDate is required for reschedule');

      const bookings = this.getBookings();
      const targetId = String(bookingId).trim().toUpperCase();
      const index = bookings.findIndex(b => String(b.bookingId).trim().toUpperCase() === targetId);

      if (index === -1) {
        throw new Error(`Booking with ID '${bookingId}' not found.`);
      }

      const booking = bookings[index];
      if (booking.status === 'CANCELLED_REFUNDED') {
        return { success: false, message: 'Tiket yang sudah dibatalkan tidak dapat dijadwalkan ulang.', booking: booking };
      }
      booking.rescheduledFrom = booking.climbDate;
      booking.climbDate = newDate;
      booking.status = 'RESCHEDULED';
      booking.mitigationChoice = 'RESCHEDULE';
      booking.rescheduledAt = new Date().toISOString();

      this.saveBookings(bookings);

      // Sinkronisasi penjadwalan ulang ke Supabase PostgreSQL database
      try {
        this.syncToSupabase('booking', booking).catch(function () {});
      } catch (e) {
        // Fallback aman offline
      }

      return { success: true, booking: booking };
    },

    /**
     * Mitigasi Opsi 3: Refund Dana 100% Penuh (Klaim Force Majeure BMKG)
     * @param {string} bookingId
     * @param {object} refundData { bankName, accountNumber, accountHolder }
     */
    executeRefund: function (bookingId, refundData) {
      const bookings = this.getBookings();
      const targetId = String(bookingId).trim().toUpperCase();
      const index = bookings.findIndex(b => String(b.bookingId).trim().toUpperCase() === targetId);

      if (index === -1) {
        throw new Error(`Booking with ID '${bookingId}' not found.`);
      }

      const booking = bookings[index];
      if (booking.status === 'CANCELLED_REFUNDED') {
        return { success: false, message: 'Tiket ini sudah dibatalkan & direfund.', booking: booking };
      }

      const today = new Date();
      const datePart = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0');
      const voucherCode = `REF-${datePart}-${Math.floor(1000 + Math.random() * 9000)}`;

      booking.status = 'CANCELLED_REFUNDED';
      booking.mitigationChoice = 'REFUND';
      booking.refundDetails = {
        amount: booking.totalPayment,
        refundPercentage: 100,
        voucherCode: voucherCode,
        bankName: (refundData && refundData.bankName) || 'TRANSFER_BANK',
        accountNumber: (refundData && refundData.accountNumber) || '',
        accountHolder: (refundData && refundData.accountHolder) || (booking.leader && booking.leader.name) || '',
        processedAt: today.toISOString(),
        status: 'COMPLETED'
      };

      // Kembalikan kuota ke gunung terkait
      const mountains = this.getMountains();
      const mIndex = mountains.findIndex(m => m.id === booking.mountainId);
      if (mIndex !== -1) {
        mountains[mIndex].remainingQuota = Math.min(
          mountains[mIndex].dailyQuota,
          mountains[mIndex].remainingQuota + (Number(booking.membersCount) || 1)
        );
        this.saveMountains(mountains);
      }

      this.saveBookings(bookings);

      // Sinkronisasi pembatalan refund & pengembalian kuota ke Supabase PostgreSQL database
      try {
        this.syncToSupabase('booking', booking).catch(function () {});
        if (mIndex !== -1) {
          this.syncToSupabase('mountain', mountains[mIndex]).catch(function () {});
        }
      } catch (e) {
        // Fallback aman offline
      }

      return { success: true, booking: booking };
    },

    /**
     * Tanda tangani pakta integritas risiko tinggi (Alias executeProceedHighRisk)
     * @param {string} bookingId
     * @param {object} waiverData
     */
    signHighRiskWaiver: function (bookingId, waiverData) {
      return this.executeProceedHighRisk(bookingId, waiverData);
    },

    /**
     * Jadwalkan ulang tanggal pendakian SIMAKSI (Alias executeReschedule)
     * @param {string} bookingId
     * @param {string} newDate (format: YYYY-MM-DD)
     */
    rescheduleBooking: function (bookingId, newDate) {
      return this.executeReschedule(bookingId, newDate);
    },

    /**
     * Batalkan dan refund tiket SIMAKSI 100% (Alias executeRefund)
     * @param {string} bookingId
     * @param {object} refundData
     */
    refundBooking: function (bookingId, refundData) {
      return this.executeRefund(bookingId, refundData);
    },

    /**
     * Sinkronisasi entitas booking/mountain ke Supabase PostgreSQL database jika terhubung
     * @param {string} entityType - 'booking' | 'mountain'
     * @param {object} data
     */
    syncToSupabase: async function (entityType, data) {
      if (!data) return { success: false, reason: 'NO_DATA' };

      try {
        if (typeof SummitSupabase === 'undefined' || typeof SummitSupabase.getSupabase !== 'function') {
          return { success: false, reason: 'SUPABASE_NOT_CONFIGURED' };
        }

        const client = SummitSupabase.getSupabase();
        if (!client) {
          return { success: false, reason: 'SUPABASE_NOT_CONFIGURED' };
        }

        if (entityType === 'booking') {
          // Replaced optional chaining SummitSupabase.getUser()?.id with (SummitSupabase.getUser() && SummitSupabase.getUser().id) for backward compatibility
          const rawUserId = (typeof SummitSupabase !== 'undefined' && typeof SummitSupabase.getUser === 'function' && (SummitSupabase.getUser() && SummitSupabase.getUser().id)) || data.userId || null;
          const userId = _isUuid(rawUserId) ? rawUserId : null;
          const payload = {
            id: data.id || data.bookingId,
            user_id: userId,
            mountain_id: data.mountainId,
            mountain_name: data.mountainName,
            basecamp: data.basecamp,
            climb_date: data.climbDate,
            duration_days: data.durationDays || 2,
            leader: data.leader || {},
            members_count: data.membersCount,
            members: data.members || [],
            addons: data.addons || {},
            total_payment: data.totalPayment,
            status: data.status,
            mitigation_choice: data.mitigationChoice || null,
            high_risk_waiver_signed: !!data.highRiskWaiverSigned,
            rescheduled_from: data.rescheduledFrom || null,
            refund_details: data.refundDetails || null
          };

          const res = await client.from('bookings').upsert(payload);
          if (res && res.error) {
            return { success: false, error: res.error.message || String(res.error) };
          }
          return { success: true, data: res ? res.data : null };
        }

        if (entityType === 'mountain') {
          const payload = {
            id: data.id,
            name: data.name,
            elevation: data.elevation,
            province: data.province,
            basecamps: data.basecamps || [],
            daily_quota: data.dailyQuota,
            remaining_quota: data.remainingQuota,
            ticket_price: data.ticketPrice,
            weather: data.weather || {},
            updated_at: new Date().toISOString()
          };

          const res = await client.from('mountains').upsert(payload);
          if (res && res.error) {
            return { success: false, error: res.error.message || String(res.error) };
          }
          return { success: true, data: res ? res.data : null };
        }

        return { success: false, reason: 'UNKNOWN_ENTITY_TYPE' };
      } catch (e) {
        return { success: false, error: e.message || String(e) };
      }
    },

    /**
     * Ambil riwayat booking dari Supabase database dan perbarui cache lokal
     * @param {string} [userId]
     */
    fetchBookingsFromSupabase: async function (userId) {
      try {
        if (typeof SummitSupabase === 'undefined' || typeof SummitSupabase.getSupabase !== 'function') {
          return { success: false, reason: 'SUPABASE_NOT_CONFIGURED', bookings: this.getBookings() };
        }

        const client = SummitSupabase.getSupabase();
        if (!client) {
          return { success: false, reason: 'SUPABASE_NOT_CONFIGURED', bookings: this.getBookings() };
        }

        const rawUserId = userId || (typeof SummitSupabase !== 'undefined' && typeof SummitSupabase.getUser === 'function' && (SummitSupabase.getUser() && SummitSupabase.getUser().id)) || null;
        const effectiveUserId = _isUuid(rawUserId) ? rawUserId : null;
        if (!effectiveUserId) {
          return { success: false, reason: 'NO_USER_ID', bookings: this.getBookings() };
        }

        const { data, error } = await client
          .from('bookings')
          .select('*')
          .eq('user_id', effectiveUserId);

        if (error) {
          return { success: false, error: error.message || String(error), bookings: this.getBookings() };
        }

        const remoteBookings = (data || []).map(row => ({
          bookingId: row.id,
          mountainId: row.mountain_id,
          mountainName: row.mountain_name,
          basecamp: row.basecamp,
          climbDate: row.climb_date,
          durationDays: row.duration_days,
          leader: row.leader || {},
          membersCount: row.members_count,
          members: row.members || [],
          addons: row.addons || {},
          totalPayment: row.total_payment,
          status: row.status,
          mitigationChoice: row.mitigation_choice || null,
          highRiskWaiverSigned: !!row.high_risk_waiver_signed,
          rescheduledFrom: row.rescheduled_from || null,
          refundDetails: row.refund_details || null,
          createdAt: row.created_at,
          userId: row.user_id
        }));

        const localBookings = this.getBookings();
        const bookingMap = new Map();

        localBookings.forEach(b => {
          if (b && (b.bookingId || b.id)) {
            bookingMap.set(b.bookingId || b.id, b);
          }
        });

        remoteBookings.forEach(rb => {
          if (rb && rb.bookingId) {
            const existing = bookingMap.get(rb.bookingId);
            bookingMap.set(rb.bookingId, existing ? { ...existing, ...rb } : rb);
          }
        });

        const merged = Array.from(bookingMap.values());
        this.saveBookings(merged);

        return { success: true, bookings: merged };
      } catch (e) {
        return { success: false, error: e.message || String(e), bookings: this.getBookings() };
      }
    },

    /**
     * Reset data demo ke kondisi awal bawaan pabrik (Default Merbabu, Prau, Gede)
     */
    resetDemoData: function () {
      this.saveMountains(_clone(DEFAULT_MOUNTAINS));
      this.saveBookings(_clone(DEFAULT_BOOKINGS));
      return {
        mountains: this.getMountains(),
        bookings: this.getBookings()
      };
    },

    getLocalDateString: getLocalDateString
  };

  // Otomatis jalankan inisialisasi awal
  SummitStore.init();

  // Ekspor untuk browser (window) dan modular/Node.js jika ada
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SummitStore;
  }
  if (typeof window !== 'undefined') {
    window.SummitStore = SummitStore;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.SummitStore = SummitStore;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
