#!/usr/bin/env python3
"""
Validation script for js/store.js
Verifies existence, required methods, default datasets, encoding, integer parsing, and state guards.
"""
import os
import re
import sys

def validate():
    store_path = os.path.join(os.path.dirname(__file__), "..", "js", "store.js")
    store_path = os.path.normpath(store_path)
    
    print(f"[*] Validating store script at: {store_path}")
    
    if not os.path.exists(store_path):
        print(f"[FAIL] Error: {store_path} does not exist.")
        return False
        
    with open(store_path, "rb") as f:
        raw_bytes = f.read()

    with open(store_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    errors = []
    
    # Check for mojibake
    if b"\xc3\x82\xc2\xb0" in raw_bytes or "Â°" in content:
        errors.append("Mojibake 'Â°' detected in js/store.js")
    else:
        print("  [OK] No mojibake detected, UTF-8 degree encoding clean")

    # Check required methods
    required_methods = [
        "getMountains",
        "getMountain",
        "updateMountainWeather",
        "getBookings",
        "getBooking",
        "createBooking",
        "evaluateWeatherAlert",
        "executeProceedHighRisk",
        "executeReschedule",
        "executeRefund",
        "resetDemoData"
    ]
    
    for method in required_methods:
        if method not in content:
            errors.append(f"Missing required method: {method}")
        else:
            print(f"  [OK] Method found: {method}")
            
    # Check localStorage keys
    if "summit_mountains" not in content:
        errors.append("Missing storage key: summit_mountains")
    else:
        print("  [OK] Storage key 'summit_mountains' found")
        
    if "summit_bookings" not in content:
        errors.append("Missing storage key: summit_bookings")
    else:
        print("  [OK] Storage key 'summit_bookings' found")
        
    # Check default mountains
    for m in ["merbabu", "prau", "gede"]:
        if m not in content:
            errors.append(f"Missing default mountain data: {m}")
        else:
            print(f"  [OK] Default mountain found: {m}")
            
    # Check default sample booking
    if "SMK-20260920-0482" not in content:
        errors.append("Missing default sample booking: SMK-20260920-0482")
    else:
        print("  [OK] Default sample booking SMK-20260920-0482 found")
        
    # Check fallback mechanism
    if "_memoryStore" not in content and "memorystore" not in content.lower():
        errors.append("Missing fallback in-memory store implementation")
    else:
        print("  [OK] In-memory storage fallback found")

    # Check integer coercion in createBooking
    if "parseInt(bookingData.membersCount" not in content:
        errors.append("Missing integer coercion in createBooking (parseInt(bookingData.membersCount, 10))")
    else:
        print("  [OK] Integer coercion for membersCount found in createBooking")

    # Check numeric quota restoration in executeRefund
    if "Number(booking.membersCount)" not in content and "parseInt(booking.membersCount" not in content:
        errors.append("Missing numeric addition in executeRefund quota restoration")
    else:
        print("  [OK] Numeric quota restoration in executeRefund verified")

    # Check state guards for CANCELLED_REFUNDED
    if "Tiket ini sudah dibatalkan" not in content:
        errors.append("Missing double-refund guard in executeRefund")
    else:
        print("  [OK] Double-refund guard in executeRefund verified")

    if "Tiket yang sudah dibatalkan tidak dapat dijadwalkan ulang" not in content:
        errors.append("Missing cancelled-state guard in executeReschedule")
    else:
        print("  [OK] Reschedule cancelled-state guard verified")

    # Check export / global assignment
    if "SummitStore" not in content:
        errors.append("SummitStore identifier not found")
        
    if errors:
        print("\n[!] Validation Failed with errors:")
        for err in errors:
            print(f"  - {err}")
        return False
        
    print("\n[PASS] All SummitStore validation checks passed successfully!")
    return True

if __name__ == "__main__":
    success = validate()
    sys.exit(0 if success else 1)
