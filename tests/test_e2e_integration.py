import copy
import datetime
import http.server
import os
import re
import threading
import unittest
import urllib.request

class SummitStoreSimulator:
    """
    In-memory pure Python simulator of js/store.js business logic.
    Mirrors all state transitions, fee calculations, weather evaluations,
    and disaster mitigation workflows for SummitGuard.
    """
    def __init__(self):
        self.default_mountains = [
            {
                "id": "merbabu",
                "name": "Gunung Merbabu",
                "elevation": "3.142 mdpl",
                "province": "Jawa Tengah",
                "basecamps": ["Selo", "Suwanting", "Thekelan", "Wekas"],
                "dailyQuota": 400,
                "remainingQuota": 128,
                "ticketPrice": 25000,
                "weather": {
                    "status": "warning",
                    "condition": "Badai Hujan & Angin Kencang",
                    "temp": "8°C",
                    "windSpeed": "48 knot",
                    "warningActive": True,
                    "warningMessage": "BMKG mengeluarkan peringatan dini badai petir dan angin kencang di ketinggian >2.000 mdpl."
                }
            },
            {
                "id": "prau",
                "name": "Gunung Prau",
                "elevation": "2.565 mdpl",
                "province": "Jawa Tengah",
                "basecamps": ["Dieng", "Patakbanteng", "Kalilembu", "Dwarawati", "Wates", "Igirmranak"],
                "dailyQuota": 500,
                "remainingQuota": 340,
                "ticketPrice": 30000,
                "weather": {
                    "status": "safe",
                    "condition": "Cerah Berawan",
                    "temp": "14°C",
                    "windSpeed": "12 knot",
                    "warningActive": False,
                    "warningMessage": "Kondisi cuaca terpantau aman dan kondusif untuk aktivitas pendakian."
                }
            },
            {
                "id": "gede",
                "name": "Gunung Gede Pangrango",
                "elevation": "2.958 mdpl",
                "province": "Jawa Barat",
                "basecamps": ["Cibodas", "Gunung Putri", "Selabintana"],
                "dailyQuota": 600,
                "remainingQuota": 215,
                "ticketPrice": 35000,
                "weather": {
                    "status": "safe",
                    "condition": "Kabut Tipis & Hujan Ringan",
                    "temp": "11°C",
                    "windSpeed": "18 knot",
                    "warningActive": False,
                    "warningMessage": "Waspada jalur licin di pos 2-3, angin dalam batas aman."
                }
            }
        ]

        self.default_bookings = [
            {
                "bookingId": "SMK-20260920-0482",
                "mountainId": "merbabu",
                "mountainName": "Gunung Merbabu",
                "basecamp": "Jalur Selo",
                "climbDate": "2026-09-20",
                "durationDays": 2,
                "leader": {
                    "name": "Andi Pratama",
                    "nik": "3302198701020003",
                    "phone": "081234567890",
                    "emergencyContact": "081987654321 (Ayah)"
                },
                "membersCount": 3,
                "members": [
                    {"name": "Budi Santoso", "nik": "3302198701020004"},
                    {"name": "Citra Lestari", "nik": "3302198701020005"}
                ],
                "addons": {
                    "porterLocal": True,
                    "porterCount": 1,
                    "porterFee": 350000
                },
                "totalPayment": 440000,
                "status": "WEATHER_WARNING",
                "mitigationChoice": None,
                "highRiskWaiverSigned": False,
                "rescheduledFrom": None,
                "refundDetails": None,
                "createdAt": "2026-09-17T10:00:00Z"
            }
        ]

        self.reset_demo_data()

    def reset_demo_data(self):
        self.mountains = copy.deepcopy(self.default_mountains)
        self.bookings = copy.deepcopy(self.default_bookings)
        return {"mountains": self.mountains, "bookings": self.bookings}

    def get_mountains(self):
        return self.mountains

    def get_mountain(self, m_id):
        if not m_id:
            return None
        target = str(m_id).strip().lower()
        for m in self.mountains:
            if str(m["id"]).lower() == target:
                return m
        return None

    def get_bookings(self):
        return self.bookings

    def get_booking(self, b_id):
        if not b_id:
            return None
        target = str(b_id).strip().upper()
        for b in self.bookings:
            if str(b["bookingId"]).strip().upper() == target:
                return b
        return None

    def calculate_fee(self, mountain_id, members_count, has_porter, porter_fee=350000):
        mountain = self.get_mountain(mountain_id)
        ticket_price = mountain["ticketPrice"] if mountain else 25000
        insurance = 5000
        count = max(1, int(members_count or 1))
        porter = int(porter_fee or 350000) if has_porter else 0
        return (ticket_price + insurance) * count + porter

    def create_booking(self, data):
        mountain = self.get_mountain(data.get("mountainId"))
        mountain_name = mountain["name"] if mountain else data.get("mountainName", "Gunung")
        today_str = datetime.date.today().strftime("%Y%m%d")
        generated_id = f"SMK-{today_str}-9999"

        members_count = int(data.get("membersCount", 1))
        has_porter = bool(data.get("addons", {}).get("porterLocal", False))
        porter_fee = data.get("addons", {}).get("porterFee", 350000) if has_porter else 0
        total_payment = data.get("totalPayment") or self.calculate_fee(
            data.get("mountainId"), members_count, has_porter, porter_fee
        )

        is_warning = bool(
            mountain and mountain.get("weather", {}).get("warningActive")
        )
        initial_status = data.get("status") or ("WEATHER_WARNING" if is_warning else "CONFIRMED")

        new_booking = {
            "bookingId": data.get("bookingId", generated_id),
            "mountainId": data.get("mountainId"),
            "mountainName": mountain_name,
            "basecamp": data.get("basecamp", mountain["basecamps"][0] if mountain else "Basecamp Utama"),
            "climbDate": data.get("climbDate", datetime.date.today().isoformat()),
            "durationDays": data.get("durationDays", 2),
            "leader": data.get("leader", {}),
            "membersCount": members_count,
            "members": data.get("members", []),
            "addons": {
                "porterLocal": has_porter,
                "porterCount": 1 if has_porter else 0,
                "porterFee": porter_fee
            },
            "totalPayment": total_payment,
            "status": initial_status,
            "mitigationChoice": None,
            "highRiskWaiverSigned": False,
            "rescheduledFrom": None,
            "refundDetails": None,
            "createdAt": datetime.datetime.now().isoformat()
        }

        # Decrement remaining quota
        if mountain:
            mountain["remainingQuota"] = max(0, mountain["remainingQuota"] - members_count)

        self.bookings.insert(0, new_booking)
        return new_booking

    def update_mountain_weather(self, mountain_id, weather_obj):
        mountain = self.get_mountain(mountain_id)
        if not mountain:
            raise ValueError(f"Mountain with id '{mountain_id}' not found.")

        mountain["weather"].update(weather_obj)
        is_warning = bool(
            mountain["weather"].get("warningActive") or mountain["weather"].get("status") == "warning"
        )

        target_id = str(mountain_id).strip().lower()
        for b in self.bookings:
            if str(b["mountainId"]).lower() == target_id:
                if is_warning and b["status"] == "CONFIRMED":
                    b["status"] = "WEATHER_WARNING"
                elif not is_warning and b["status"] == "WEATHER_WARNING":
                    b["status"] = "CONFIRMED"

        return mountain

    def evaluate_weather_alert(self, booking_id):
        booking = self.get_booking(booking_id)
        if not booking:
            return {"hasWarning": False, "booking": None, "error": "Booking not found"}

        mountain = self.get_mountain(booking["mountainId"])
        is_warning = bool(
            mountain and mountain.get("weather", {}).get("warningActive")
        )

        if is_warning and booking["status"] == "CONFIRMED":
            booking["status"] = "WEATHER_WARNING"

        return {
            "hasWarning": is_warning,
            "booking": booking,
            "mountain": mountain,
            "weather": mountain["weather"] if mountain else None,
            "warningMessage": mountain["weather"].get("warningMessage") if mountain else None
        }

    def execute_proceed_high_risk(self, booking_id, waiver_data):
        booking = self.get_booking(booking_id)
        if not booking:
            raise ValueError(f"Booking with ID '{booking_id}' not found.")

        if booking["status"] == "CANCELLED_REFUNDED":
            return {
                "success": False,
                "message": "Tiket yang sudah dibatalkan tidak dapat diaktifkan kembali.",
                "booking": booking
            }

        booking["status"] = "HIGH_RISK_APPROVED"
        booking["mitigationChoice"] = "PROCEED_HIGH_RISK"
        booking["highRiskWaiverSigned"] = True
        booking["waiverDetails"] = {
            "signerName": (waiver_data or {}).get("signerName", booking["leader"].get("name")),
            "signerNik": (waiver_data or {}).get("signerNik", booking["leader"].get("nik")),
            "equipmentChecklistPassed": bool((waiver_data or {}).get("equipmentChecklistPassed", True)),
            "emergencyHotline": "0811-2345-SAR (Ranger Pos Basecamp)",
            "signedAt": datetime.datetime.now().isoformat(),
            "notes": (waiver_data or {}).get("notes", "Pendaki menyatakan siap menanggung risiko kondisi ekstrem secara mandiri.")
        }
        booking["success"] = True
        return booking

    def execute_reschedule(self, booking_id, new_date):
        if not new_date:
            raise ValueError("newDate is required for reschedule")

        booking = self.get_booking(booking_id)
        if not booking:
            raise ValueError(f"Booking with ID '{booking_id}' not found.")

        if booking["status"] == "CANCELLED_REFUNDED":
            return {
                "success": False,
                "message": "Tiket yang sudah dibatalkan tidak dapat dijadwalkan ulang.",
                "booking": booking
            }

        booking["rescheduledFrom"] = booking["climbDate"]
        booking["climbDate"] = new_date
        booking["status"] = "RESCHEDULED"
        booking["mitigationChoice"] = "RESCHEDULE"
        booking["rescheduledAt"] = datetime.datetime.now().isoformat()
        booking["success"] = True
        return booking

    def execute_refund(self, booking_id, refund_data):
        booking = self.get_booking(booking_id)
        if not booking:
            raise ValueError(f"Booking with ID '{booking_id}' not found.")

        if booking["status"] == "CANCELLED_REFUNDED":
            return {
                "success": False,
                "message": "Tiket ini sudah dibatalkan & direfund.",
                "booking": booking
            }

        today_str = datetime.date.today().strftime("%Y%m%d")
        voucher_code = f"REF-{today_str}-7777"

        booking["status"] = "CANCELLED_REFUNDED"
        booking["mitigationChoice"] = "REFUND"
        booking["refundDetails"] = {
            "amount": booking["totalPayment"],
            "refundPercentage": 100,
            "voucherCode": voucher_code,
            "bankName": (refund_data or {}).get("bankName", "TRANSFER_BANK"),
            "accountNumber": (refund_data or {}).get("accountNumber", ""),
            "accountHolder": (refund_data or {}).get("accountHolder", booking["leader"].get("name", "")),
            "processedAt": datetime.datetime.now().isoformat(),
            "status": "COMPLETED"
        }

        # Restore mountain quota
        mountain = self.get_mountain(booking["mountainId"])
        if mountain:
            mountain["remainingQuota"] = min(
                mountain["dailyQuota"],
                mountain["remainingQuota"] + int(booking["membersCount"])
            )

        booking["success"] = True
        return booking


class TestE2EIntegration(unittest.TestCase):
    """
    Comprehensive End-to-End System Integration test suite for SummitGuard.
    Verifies HTML pages, scripts, styles, cross-navigation, complete business logic,
    encoding/mojibake purity, HTML structure standards, and live HTTP serving.
    """

    @classmethod
    def setUpClass(cls):
        cls.required_pages = ["index.html", "booking.html", "ticket.html", "admin.html"]
        cls.required_scripts = [
            "js/store.js", "js/navbar.js", "js/home.js",
            "js/booking.js", "js/ticket.js", "js/admin.js"
        ]
        cls.required_styles = ["css/style.css"]

    # --------------------------------------------------------------------------
    # 1. Verify existence of all 4 HTML pages
    # --------------------------------------------------------------------------
    def test_all_pages_present(self):
        """Verify all 4 core application HTML pages exist and are populated."""
        for page in self.required_pages:
            self.assertTrue(os.path.exists(page), f"Missing page: {page}")
            self.assertTrue(os.path.isfile(page), f"Target is not a regular file: {page}")
            size = os.path.getsize(page)
            self.assertGreater(size, 1000, f"Page {page} appears abnormally small ({size} bytes)")

    # --------------------------------------------------------------------------
    # 2. Verify existence of all 6 JS scripts and CSS
    # --------------------------------------------------------------------------
    def test_all_scripts_and_styles_present(self):
        """Verify all 6 modular scripts and the custom CSS stylesheet exist."""
        for script in self.required_scripts:
            self.assertTrue(os.path.exists(script), f"Missing script: {script}")
            self.assertTrue(os.path.isfile(script), f"Target is not a file: {script}")
            size = os.path.getsize(script)
            self.assertGreater(size, 500, f"Script {script} appears abnormally small ({size} bytes)")

        for style in self.required_styles:
            self.assertTrue(os.path.exists(style), f"Missing stylesheet: {style}")
            self.assertTrue(os.path.isfile(style), f"Target is not a file: {style}")
            size = os.path.getsize(style)
            self.assertGreater(size, 500, f"Stylesheet {style} is abnormally small ({size} bytes)")

    # --------------------------------------------------------------------------
    # 3. Verify cross-page navigation integrity
    # --------------------------------------------------------------------------
    def test_cross_page_navigation_integrity(self):
        """
        Verify that all HTML documents and navigation components link seamlessly
        to valid internal pages without broken links or orphaned paths.
        """
        # Read content of all HTML pages
        html_contents = {}
        for page in self.required_pages:
            with open(page, "r", encoding="utf-8") as f:
                html_contents[page] = f.read()

        # Read navbar.js content
        with open("js/navbar.js", "r", encoding="utf-8") as f:
            navbar_js = f.read()

        # Check that navbar.js contains explicit links to all 4 pages
        for page in self.required_pages:
            self.assertIn(page, navbar_js, f"js/navbar.js must link to {page}")

        # Extract all internal .html links across all 4 pages
        for page, content in html_contents.items():
            matches = re.findall(r'href=[\'"]([a-zA-Z0-9_\-\./]+\.html(?:\?[^\'"]*)?)[\'"]', content)
            for raw_link in matches:
                target_page = raw_link.split("?")[0].split("#")[0]
                self.assertIn(
                    target_page,
                    self.required_pages,
                    f"Page {page} contains invalid link target: {raw_link}"
                )
                self.assertTrue(
                    os.path.exists(target_page),
                    f"Page {page} links to non-existent file {target_page}"
                )

        # Cross-page navigation flows:
        # 1. Home page routes to booking.html and ticket.html via js/home.js and navbar
        with open("js/home.js", "r", encoding="utf-8") as f:
            home_js = f.read()
        self.assertIn("booking.html", home_js, "js/home.js must route to booking.html")
        self.assertIn("ticket.html", home_js, "js/home.js must route to ticket.html")

        # 2. booking.html and js/booking.js must route to ticket.html
        self.assertIn("ticket.html", html_contents["booking.html"])
        with open("js/booking.js", "r", encoding="utf-8") as f:
            booking_js = f.read()
        self.assertIn("ticket.html", booking_js, "js/booking.js must route to ticket.html")

        # 3. ticket.html must link back to index.html, booking.html, and admin.html
        self.assertIn("index.html", html_contents["ticket.html"])
        self.assertIn("booking.html", html_contents["ticket.html"])
        self.assertIn("admin.html", html_contents["ticket.html"])

        # 4. admin.html and js/admin.js must link to ticket.html with booking query parameter
        self.assertIn("ticket.html?id=", html_contents["admin.html"])
        with open("js/admin.js", "r", encoding="utf-8") as f:
            admin_js = f.read()
        self.assertIn("ticket.html?id=", admin_js, "js/admin.js must link to ticket.html?id=")

    # --------------------------------------------------------------------------
    # 4. Verify complete business logic and mitigation flow
    # --------------------------------------------------------------------------
    def test_complete_business_logic_and_mitigation_flow(self):
        """
        Verify end-to-end SIMAKSI lifecycle:
        - Initial state check (Merbabu warning, Prau safe, Gede safe)
        - Booking creation with automated fee calculation and quota decrement
        - BMKG storm alert trigger and automated booking status transition
        - High-Risk waiver proceed flow (Pakta Integritas)
        - Reschedule date flow (zero fees guaranteed)
        - 100% full refund flow and quota recovery
        - Invariant guards preventing double refund and reschedule after cancellation
        """
        store = SummitStoreSimulator()

        # Step 4.1: Initial State
        merbabu = store.get_mountain("merbabu")
        prau = store.get_mountain("prau")
        gede = store.get_mountain("gede")
        self.assertIsNotNone(merbabu)
        self.assertIsNotNone(prau)
        self.assertIsNotNone(gede)

        # Merbabu initial weather warning
        self.assertTrue(merbabu["weather"]["warningActive"])
        self.assertEqual(merbabu["weather"]["status"], "warning")
        self.assertEqual(merbabu["weather"]["windSpeed"], "48 knot")

        # Prau initial safe weather
        self.assertFalse(prau["weather"]["warningActive"])
        self.assertEqual(prau["weather"]["status"], "safe")
        self.assertEqual(prau["remainingQuota"], 340)

        # Default demo booking check
        demo_booking = store.get_booking("SMK-20260920-0482")
        self.assertIsNotNone(demo_booking)
        self.assertEqual(demo_booking["status"], "WEATHER_WARNING")
        self.assertEqual(demo_booking["totalPayment"], 440000)

        # Step 4.2: Booking Creation Flow on Gunung Prau
        booking_input = {
            "mountainId": "prau",
            "basecamp": "Patakbanteng",
            "climbDate": "2026-10-01",
            "durationDays": 2,
            "leader": {
                "name": "Rian Pratama",
                "nik": "3302198701020010",
                "phone": "081234567810",
                "emergencyContact": "081987654310 (Ibu)"
            },
            "membersCount": 3,
            "members": [
                {"name": "Deni Setiawan", "nik": "3302198701020011"},
                {"name": "Eka Saputri", "nik": "3302198701020012"}
            ],
            "addons": {
                "porterLocal": True,
                "porterCount": 1,
                "porterFee": 350000
            }
        }

        created = store.create_booking(booking_input)
        self.assertIsNotNone(created)
        # Expected fee: (Prau 30,000 ticket + 5,000 insurance) * 3 + 350,000 porter = 455,000
        self.assertEqual(created["totalPayment"], 455000)
        # Prau had safe weather, so initial status must be CONFIRMED
        self.assertEqual(created["status"], "CONFIRMED")
        # Quota must be decremented: 340 - 3 = 337
        prau_updated = store.get_mountain("prau")
        self.assertEqual(prau_updated["remainingQuota"], 337)
        # ID pattern
        self.assertTrue(re.match(r"^SMK-\d{8}-\d+$", created["bookingId"]))

        # Step 4.3: BMKG Weather Warning Detection & Cascade
        # BMKG detects incoming tropical cyclone over Gunung Prau
        store.update_mountain_weather("prau", {
            "status": "warning",
            "condition": "Badai Siklon Tropis & Hujan Lebat",
            "temp": "6°C",
            "windSpeed": "52 knot",
            "warningActive": True,
            "warningMessage": "Peringatan dini badai siklon BMKG: kecepatan angin membahayakan keselamatan."
        })

        # The booking status on Prau must now cascade to WEATHER_WARNING
        evaluated = store.evaluate_weather_alert(created["bookingId"])
        self.assertTrue(evaluated["hasWarning"])
        self.assertEqual(evaluated["booking"]["status"], "WEATHER_WARNING")
        self.assertIn("Peringatan dini badai siklon BMKG", evaluated["warningMessage"])

        # Step 4.4: Mitigation Option 1 - High-Risk Waiver Flow (Tetap Naik)
        waiver_data = {
            "signerName": "Rian Pratama",
            "signerNik": "3302198701020010",
            "equipmentChecklistPassed": True,
            "notes": "Rombongan dilengkapi survival gear dan radio komunikasi."
        }
        highrisk_result = store.execute_proceed_high_risk(created["bookingId"], waiver_data)
        self.assertTrue(highrisk_result["success"])
        self.assertEqual(highrisk_result["status"], "HIGH_RISK_APPROVED")
        self.assertEqual(highrisk_result["mitigationChoice"], "PROCEED_HIGH_RISK")
        self.assertTrue(highrisk_result["highRiskWaiverSigned"])
        self.assertIn("0811-2345-SAR", highrisk_result["waiverDetails"]["emergencyHotline"])

        # Step 4.5: Mitigation Option 2 - Reschedule Flow (Zero Fees)
        rescheduled_result = store.execute_reschedule(created["bookingId"], "2026-11-10")
        self.assertTrue(rescheduled_result["success"])
        self.assertEqual(rescheduled_result["status"], "RESCHEDULED")
        self.assertEqual(rescheduled_result["mitigationChoice"], "RESCHEDULE")
        self.assertEqual(rescheduled_result["climbDate"], "2026-11-10")
        self.assertEqual(rescheduled_result["rescheduledFrom"], "2026-10-01")
        # Fee remains unchanged (zero penalty)
        self.assertEqual(rescheduled_result["totalPayment"], 455000)

        # Step 4.6: Mitigation Option 3 - 100% Full Refund Flow & Quota Recovery
        refund_data = {
            "bankName": "BCA",
            "accountNumber": "1234567890",
            "accountHolder": "Rian Pratama"
        }
        refund_result = store.execute_refund(created["bookingId"], refund_data)
        self.assertTrue(refund_result["success"])
        self.assertEqual(refund_result["status"], "CANCELLED_REFUNDED")
        self.assertEqual(refund_result["mitigationChoice"], "REFUND")
        # 100% full refund amount equal to totalPayment
        self.assertEqual(refund_result["refundDetails"]["amount"], 455000)
        self.assertEqual(refund_result["refundDetails"]["refundPercentage"], 100)
        self.assertTrue(refund_result["refundDetails"]["voucherCode"].startswith("REF-"))
        # Quota must be restored back: 337 + 3 = 340
        prau_restored = store.get_mountain("prau")
        self.assertEqual(prau_restored["remainingQuota"], 340)

        # Step 4.7: State Invariant Guards
        # Guard 1: Double refund must be rejected and quota NOT incremented again
        double_refund = store.execute_refund(created["bookingId"], refund_data)
        self.assertFalse(double_refund["success"])
        self.assertIn("sudah dibatalkan", double_refund["message"].lower())
        self.assertEqual(store.get_mountain("prau")["remainingQuota"], 340)

        # Guard 2: Reschedule on cancelled/refunded booking must be rejected
        invalid_reschedule = store.execute_reschedule(created["bookingId"], "2026-12-01")
        self.assertFalse(invalid_reschedule["success"])
        self.assertIn("tidak dapat dijadwalkan ulang", invalid_reschedule["message"].lower())

        # Guard 3: High-risk proceed on cancelled/refunded booking must be rejected
        invalid_highrisk = store.execute_proceed_high_risk(created["bookingId"], waiver_data)
        self.assertFalse(invalid_highrisk["success"])
        self.assertIn("tidak dapat diaktifkan kembali", invalid_highrisk["message"].lower())

    def test_js_store_contract_alignment(self):
        """
        Verify that js/store.js implements all required contract methods,
        formulas, integer coercions, and state guards in its source code.
        """
        with open("js/store.js", "r", encoding="utf-8") as f:
            js = f.read()

        required_methods = [
            "getMountains", "getMountain", "saveMountains",
            "updateMountainWeather", "getBookings", "getBooking",
            "saveBookings", "calculateFee", "createBooking",
            "evaluateWeatherAlert", "executeProceedHighRisk",
            "executeReschedule", "executeRefund", "resetDemoData"
        ]
        for method in required_methods:
            self.assertIn(method, js, f"Method '{method}' missing in js/store.js")

        # Integer coercion & numeric quota restoration
        self.assertIn("parseInt(bookingData.membersCount", js)
        self.assertTrue(
            "Number(booking.membersCount)" in js or "parseInt(booking.membersCount" in js,
            "Numeric quota addition required in executeRefund"
        )

        # Guard error messages
        self.assertIn("Tiket ini sudah dibatalkan", js)
        self.assertIn("Tiket yang sudah dibatalkan tidak dapat dijadwalkan ulang", js)
        self.assertIn("Tiket yang sudah dibatalkan tidak dapat diaktifkan kembali", js)

    # --------------------------------------------------------------------------
    # 5. Verify zero mojibake byte sequences across all project files
    # --------------------------------------------------------------------------
    def test_zero_mojibake_across_all_project_files(self):
        """
        Verify that all project HTML, JS, CSS, and Markdown files have clean UTF-8
        encoding without double-encoded mojibake byte sequences (e.g. Â°).
        """
        project_files = [
            "index.html", "booking.html", "ticket.html", "admin.html",
            "css/style.css",
            "js/store.js", "js/navbar.js", "js/home.js",
            "js/booking.js", "js/ticket.js", "js/admin.js"
        ]

        double_encoded_degree_byte = b"\xc3\x82\xc2\xb0"

        for filepath in project_files:
            self.assertTrue(os.path.exists(filepath), f"Missing project file: {filepath}")
            with open(filepath, "rb") as f:
                raw_bytes = f.read()

            self.assertNotIn(
                double_encoded_degree_byte,
                raw_bytes,
                f"Double-encoded mojibake byte sequence found in {filepath}"
            )

            # Must decode cleanly as UTF-8
            try:
                text = raw_bytes.decode("utf-8")
            except UnicodeDecodeError as e:
                self.fail(f"File {filepath} failed UTF-8 decoding: {e}")

            # Must not contain literal Â° character
            self.assertNotIn(
                "Â°",
                text,
                f"Mojibake character 'Â°' found in {filepath}"
            )

            # Legitimate degree symbols must be valid single UTF-8 characters (\xc2\xb0)
            if "°C" in text:
                self.assertIn(
                    b"\xc2\xb0C",
                    raw_bytes,
                    f"Degree symbol in {filepath} must be cleanly encoded as single UTF-8 byte"
                )

    # --------------------------------------------------------------------------
    # 6. Verify valid HTML structure, Tailwind CDN, and viewport meta tags
    # --------------------------------------------------------------------------
    def test_html_pages_structure_tailwind_and_viewport(self):
        """
        Verify all 4 HTML pages have valid HTML5 structure, proper viewport tags,
        Tailwind CSS CDN, and standard SummitGuard containers.
        """
        for page in self.required_pages:
            with open(page, "r", encoding="utf-8") as f:
                content = f.read()

            lower = content.lower()

            # HTML5 Doctype & language
            self.assertTrue(lower.startswith("<!doctype html>"), f"{page} must start with <!DOCTYPE html>")
            self.assertIn("<html lang=\"id\"", content, f"{page} must declare <html lang=\"id\">")

            # Meta Charset
            self.assertTrue(
                "<meta charset=\"utf-8\">" in lower or "<meta charset='utf-8'>" in lower,
                f"{page} must specify <meta charset=\"UTF-8\">"
            )

            # Responsive Viewport Meta Tag
            self.assertIn("viewport", lower, f"{page} must specify viewport meta tag")
            self.assertIn("width=device-width", lower, f"{page} viewport must set width=device-width")
            self.assertIn("initial-scale=1.0", lower, f"{page} viewport must set initial-scale=1.0")

            # Title tag
            self.assertIn("<title>", lower, f"{page} must have a <title> tag")
            self.assertIn("summitguard", lower, f"{page} title must contain 'SummitGuard'")

            # Tailwind CSS CDN
            self.assertTrue(
                "cdn.tailwindcss.com" in content or "tailwindcss" in content,
                f"{page} must include Tailwind CSS CDN"
            )

            # Custom CSS
            self.assertIn("css/style.css", content, f"{page} must link to css/style.css")

            # Navbar and Footer Containers
            self.assertTrue(
                "navbar-container" in content or "main-navbar" in content,
                f"{page} must define a container for navbar injection"
            )
            self.assertTrue(
                "footer-container" in content or "main-footer" in content,
                f"{page} must define a container for footer injection"
            )

            # Base scripts
            self.assertIn("js/store.js", content, f"{page} must load js/store.js")
            self.assertIn("js/navbar.js", content, f"{page} must load js/navbar.js")

            # Closing tags
            self.assertIn("</body>", content, f"{page} must properly close </body>")
            self.assertIn("</html>", content, f"{page} must properly close </html>")

    # --------------------------------------------------------------------------
    # 7. Live HTTP Server serving all pages and assets
    # --------------------------------------------------------------------------
    def test_http_server_serving_pages_and_assets(self):
        """
        Spin up an in-process HTTP server on localhost and verify that all 4 HTML
        pages and all 7 core assets are successfully served with HTTP 200 OK.
        """
        # Pick ephemeral port by binding to port 0
        server = http.server.HTTPServer(("127.0.0.1", 0), http.server.SimpleHTTPRequestHandler)
        port = server.server_address[1]

        # Run server in daemon thread
        server_thread = threading.Thread(target=server.serve_forever, daemon=True)
        server_thread.start()

        base_url = f"http://127.0.0.1:{port}"

        endpoints = [
            ("/index.html", 200, "SummitGuard"),
            ("/booking.html", 200, "Formulir Reservasi SIMAKSI"),
            ("/ticket.html", 200, "E-Tiket Resmi SIMAKSI"),
            ("/admin.html", 200, "Panel Simulasi BMKG"),
            ("/css/style.css", 200, "ticket"),
            ("/js/store.js", 200, "SummitStore"),
            ("/js/navbar.js", 200, "renderNavbar"),
            ("/js/home.js", 200, "DOMContentLoaded"),
            ("/js/booking.js", 200, "DOMContentLoaded"),
            ("/js/ticket.js", 200, "DOMContentLoaded"),
            ("/js/admin.js", 200, "DOMContentLoaded"),
        ]

        try:
            for path, expected_status, expected_text in endpoints:
                url = base_url + path
                req = urllib.request.Request(url, headers={"User-Agent": "SummitGuardE2ETest/1.0"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    self.assertEqual(
                        response.status,
                        expected_status,
                        f"Expected status {expected_status} for {url}, got {response.status}"
                    )
                    content = response.read().decode("utf-8", errors="replace")
                    self.assertIn(
                        expected_text,
                        content,
                        f"Expected content '{expected_text}' not found in response from {url}"
                    )
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
