import pytest
from datetime import datetime, timedelta, timezone
from app.core.db import SessionLocal
from app.models.models import FarmerOtp
from app.core.sms import (
    create_or_refresh_otp,
    verify_farmer_otp,
    hash_otp,
    generate_secure_otp,
    RESEND_COOLDOWN_SECONDS,
    MAX_VERIFY_ATTEMPTS
)


def test_secure_otp_generation():
    for _ in range(20):
        otp = generate_secure_otp()
        assert len(otp) == 6
        assert otp.isdigit()
        assert 100000 <= int(otp) <= 999999


def test_otp_hashing():
    h1 = hash_otp("9876543210", "123456")
    h2 = hash_otp("9876543210", "123456")
    h3 = hash_otp("9876543210", "654321")
    assert h1 == h2
    assert h1 != h3


def test_create_and_verify_otp_flow():
    db = SessionLocal()
    phone = "9876500111"

    # Clean up test records
    db.query(FarmerOtp).filter(FarmerOtp.phone == phone).delete()
    db.commit()

    # 1. Create OTP
    raw_otp, delivery = create_or_refresh_otp(db, phone)
    assert len(raw_otp) == 6
    assert delivery.success is True
    assert delivery.is_dev_mode is True

    # 2. Resend before cooldown should raise ValueError
    with pytest.raises(ValueError) as excinfo:
        create_or_refresh_otp(db, phone)
    assert "seconds before requesting another OTP" in str(excinfo.value)

    # 3. Incorrect OTP decrement attempts
    with pytest.raises(ValueError) as excinfo:
        verify_farmer_otp(db, phone, "000000")
    assert "Incorrect OTP" in str(excinfo.value)

    # 4. Correct OTP verifies successfully
    verified = verify_farmer_otp(db, phone, raw_otp)
    assert verified is True

    # 5. Clean up
    db.query(FarmerOtp).filter(FarmerOtp.phone == phone).delete()
    db.commit()
    db.close()
