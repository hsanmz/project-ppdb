import pytest

from src.core.database import get_db
from src.models.content import SiteSetting
from src.services.tiu_verification_service import TIUVerificationService


@pytest.fixture
def db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()


def test_tiu_verification_invalid_inputs(db_session):
    svc = TIUVerificationService(db_session)
    res = svc.verify(
        google_form_url="http://invalid-domain.com/form",
        duration_minutes=0,
        webhook_secret="short",
    )
    assert res.overall == "failed"
    checks_by_key = {c.key: c for c in res.checks}

    assert len(res.checks) == 10
    assert checks_by_key["url_format"].status == "failed"
    assert (
        "HTTPS" in checks_by_key["url_format"].detail
        or "domain" in checks_by_key["url_format"].detail
    )
    assert checks_by_key["duration_valid"].status == "failed"
    assert checks_by_key["secret_format"].status == "failed"
    assert checks_by_key["seb_readiness"].status == "failed"
    assert res.summary.failed > 0


def test_tiu_verification_missing_token_in_url(db_session):
    svc = TIUVerificationService(db_session)
    res = svc.verify(
        google_form_url=(
            "https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform" "?entry.123=ABC"
        ),
        duration_minutes=90,
        webhook_secret="a_valid_secret_with_more_than_16_chars",
    )
    checks_by_key = {c.key: c for c in res.checks}
    assert checks_by_key["url_format"].status == "failed"
    assert "{token}" in checks_by_key["url_format"].detail
    assert checks_by_key["seb_readiness"].status == "failed"


def test_tiu_verification_valid_inputs_and_flow(db_session):
    svc = TIUVerificationService(db_session)
    valid_url = (
        "https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform?entry.123={token}"
    )
    valid_secret = "super_secret_webhook_key_12345678"

    # Save to DB first to simulate configured state
    db_session.query(SiteSetting).filter(
        SiteSetting.key.in_(
            [
                "ppdb_tiu_google_form_url",
                "ppdb_tiu_duration_minutes",
                "ppdb_tiu_webhook_secret",
            ]
        )
    ).delete(synchronize_session=False)

    from datetime import datetime

    now = datetime.now()
    db_session.add(
        SiteSetting(
            key="ppdb_tiu_google_form_url",
            value=valid_url,
            created_at=now,
            updated_at=now,
        )
    )
    db_session.add(
        SiteSetting(
            key="ppdb_tiu_duration_minutes", value="120", created_at=now, updated_at=now
        )
    )
    db_session.add(
        SiteSetting(
            key="ppdb_tiu_webhook_secret",
            value=valid_secret,
            created_at=now,
            updated_at=now,
        )
    )
    db_session.commit()

    res = svc.verify()
    checks_by_key = {c.key: c for c in res.checks}

    assert checks_by_key["config_saved"].status == "passed"
    assert checks_by_key["url_format"].status == "passed"
    assert checks_by_key["duration_valid"].status == "passed"
    assert checks_by_key["secret_format"].status == "passed"
    assert checks_by_key["secret_consistency"].status == "passed"
    assert checks_by_key["endpoint_reachable"].status == "passed"
    assert checks_by_key["auth_probe"].status == "passed"
    assert checks_by_key["seb_readiness"].status == "passed"
    assert res.summary.failed == 0


def test_tiu_verification_secret_differs_warning(db_session):
    svc = TIUVerificationService(db_session)
    valid_url = (
        "https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform?entry.123={token}"
    )
    stored_secret = "stored_secret_key_12345678"
    new_secret = "different_secret_key_87654321"

    db_session.query(SiteSetting).filter(
        SiteSetting.key.in_(
            [
                "ppdb_tiu_google_form_url",
                "ppdb_tiu_duration_minutes",
                "ppdb_tiu_webhook_secret",
            ]
        )
    ).delete(synchronize_session=False)

    from datetime import datetime

    now = datetime.now()
    db_session.add(
        SiteSetting(
            key="ppdb_tiu_google_form_url",
            value=valid_url,
            created_at=now,
            updated_at=now,
        )
    )
    db_session.add(
        SiteSetting(
            key="ppdb_tiu_duration_minutes", value="120", created_at=now, updated_at=now
        )
    )
    db_session.add(
        SiteSetting(
            key="ppdb_tiu_webhook_secret",
            value=stored_secret,
            created_at=now,
            updated_at=now,
        )
    )
    db_session.commit()

    # Pass the different secret in request
    res = svc.verify(webhook_secret=new_secret)
    checks_by_key = {c.key: c for c in res.checks}

    assert checks_by_key["secret_consistency"].status == "warn"
    assert checks_by_key["auth_probe"].status == "warn"
    assert res.summary.warn >= 1


def test_verify_endpoint_requires_auth():
    from fastapi.testclient import TestClient

    from src.main import app

    client = TestClient(app)
    resp = client.post("/ppdb/tiu-settings/verify", json={})
    assert resp.status_code == 401
