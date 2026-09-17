#!/usr/bin/env python3
"""
Validation script for js/store.js
Verifies existence, required methods, default datasets, and architectural constraints.
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
        
    with open(store_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    errors = []
    
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
