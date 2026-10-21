"""Gerbang keputusan kelulusan seleksi.

Keputusan lulus/tidak lulus hanya boleh ditetapkan (atau diubah) setelah
seluruh nilai wajib masuk: TIU (jalur TIU), Tahfidz, dan Wawancara.
"""

import uuid
from datetime import datetime

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.ppdb import PPDBApplicant, PPDBPeriod, PPDBWave
from src.models.selection import (
    SelectionCategory,
    SelectionCriteria,
    SelectionScore,
)
from src.modules.selection.schemas import ApplicantStatusUpdate
from src.repositories.selection_repository import SelectionRepository
from src.services.selection_service import SelectionService, selection_score_gaps


@pytest.fixture
def db():
    generator = get_db()
    session = next(generator)
    try:
        yield session
    finally:
        try:
            next(generator)
        except StopIteration:
            pass


@pytest.fixture
def active_wave(db: Session):
    db.query(PPDBWave).update({"status": "inactive"})
    db.query(PPDBPeriod).update({"status": "inactive"})
    db.commit()

    now = datetime.now()
    period_id = str(uuid.uuid4())
    db.add(
        PPDBPeriod(
            id=period_id,
            name="Periode Verdict Gate",
            academic_year="2026/2027",
            status="active",
            created_at=now,
            updated_at=now,
        )
    )
    wave = PPDBWave(
        id=str(uuid.uuid4()),
        period_id=period_id,
        wave_number=90,
        name="Gelombang Verdict Gate",
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(wave)
    db.commit()
    return wave


def _make_applicant(db: Session, wave_id: str, registration_path: str) -> PPDBApplicant:
    now = datetime.now()
    applicant = PPDBApplicant(
        id=str(uuid.uuid4()),
        user_id=str(uuid.uuid4()),
        wave_id=wave_id,
        full_name="Calon Santri Verdict",
        email=f"verdict-{uuid.uuid4().hex[:8]}@example.com",
        phone="081234567890",
        registration_path=registration_path,
        status="selection",
        created_at=now,
        updated_at=now,
    )
    db.add(applicant)
    db.commit()
    return applicant


def _make_rubric(
    db: Session,
    wave_id: str,
    category_name: str,
    criteria_names: list[str],
    applicant_id: str | None = None,
    scores: dict[str, float] | None = None,
) -> SelectionCategory:
    """Buat kategori + kriteria, dan opsional skor untuk sebagian kriteria."""
    now = datetime.now()
    category = SelectionCategory(
        id=str(uuid.uuid4()),
        wave_id=wave_id,
        name=category_name,
        created_at=now,
        updated_at=now,
    )
    db.add(category)
    db.flush()

    scores = scores or {}
    for criteria_name in criteria_names:
        criteria = SelectionCriteria(
            id=str(uuid.uuid4()),
            category_id=category.id,
            name=criteria_name,
            weight=round(100 / len(criteria_names), 2),
            created_at=now,
            updated_at=now,
        )
        db.add(criteria)
        db.flush()
        if applicant_id and criteria_name in scores:
            db.add(
                SelectionScore(
                    id=str(uuid.uuid4()),
                    applicant_id=applicant_id,
                    criteria_id=criteria.id,
                    score=scores[criteria_name],
                    created_at=now,
                    updated_at=now,
                )
            )
    db.commit()
    return category


def test_gaps_reports_missing_components(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id, registration_path="reguler")

    # Tahfidz: baru 1 dari 2 kriteria dinilai.
    _make_rubric(
        db,
        active_wave.id,
        "Tahfidz",
        ["Kelancaran", "Makhraj"],
        applicant_id=applicant.id,
        scores={"Kelancaran": 88.0},
    )
    # Wawancara: kriteria ada, belum ada skor sama sekali.
    _make_rubric(db, active_wave.id, "Wawancara", ["Sikap", "Jawaban"])
    # TIU: jalur reguler wajib, tapi belum ada nilai sama sekali.

    gaps = selection_score_gaps(db, applicant)

    assert gaps == ["ujian TIU", "ujian Tahfidz", "ujian Wawancara"]


def test_gaps_empty_when_all_scores_complete(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id, registration_path="reguler")

    _make_rubric(
        db,
        active_wave.id,
        "Tahfidz",
        ["Kelancaran", "Makhraj"],
        applicant_id=applicant.id,
        scores={"Kelancaran": 88.0, "Makhraj": 90.0},
    )
    _make_rubric(
        db,
        active_wave.id,
        "Wawancara",
        ["Sikap", "Jawaban"],
        applicant_id=applicant.id,
        scores={"Sikap": 85.0, "Jawaban": 92.0},
    )
    # Nilai TIU masuk otomatis via webhook pada kategori "TIU".
    _make_rubric(
        db,
        active_wave.id,
        "TIU",
        ["Google Form"],
        applicant_id=applicant.id,
        scores={"Google Form": 78.0},
    )

    assert selection_score_gaps(db, applicant) == []


def test_gaps_skips_tiu_for_non_tiu_path(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id, registration_path="prestasi")

    _make_rubric(
        db,
        active_wave.id,
        "Tahfidz",
        ["Kelancaran"],
        applicant_id=applicant.id,
        scores={"Kelancaran": 88.0},
    )
    _make_rubric(
        db,
        active_wave.id,
        "Wawancara",
        ["Sikap"],
        applicant_id=applicant.id,
        scores={"Sikap": 85.0},
    )

    assert selection_score_gaps(db, applicant) == []


def test_verdict_rejected_while_scores_incomplete(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id, registration_path="reguler")
    svc = SelectionService(SelectionRepository(db))

    with pytest.raises(HTTPException) as exc:
        svc.update_applicant_status(
            applicant.id, ApplicantStatusUpdate(status="passed")
        )

    assert exc.value.status_code == 400
    assert "nilai belum lengkap" in str(exc.value.detail).lower()

    db.expire_all()
    assert db.get(PPDBApplicant, applicant.id).status == "selection"


def test_reset_to_selection_allowed_while_scores_incomplete(db: Session, active_wave):
    applicant = _make_applicant(db, active_wave.id, registration_path="reguler")
    svc = SelectionService(SelectionRepository(db))

    result = svc.update_applicant_status(
        applicant.id, ApplicantStatusUpdate(status="selection")
    )

    assert "message" in result
    db.expire_all()
    assert db.get(PPDBApplicant, applicant.id).status == "selection"


def test_verdict_accepted_when_scores_complete(db: Session, active_wave, monkeypatch):
    applicant = _make_applicant(db, active_wave.id, registration_path="reguler")
    svc = SelectionService(SelectionRepository(db))

    _make_rubric(
        db,
        active_wave.id,
        "Tahfidz",
        ["Kelancaran"],
        applicant_id=applicant.id,
        scores={"Kelancaran": 88.0},
    )
    _make_rubric(
        db,
        active_wave.id,
        "Wawancara",
        ["Sikap"],
        applicant_id=applicant.id,
        scores={"Sikap": 85.0},
    )
    _make_rubric(
        db,
        active_wave.id,
        "TIU",
        ["Google Form"],
        applicant_id=applicant.id,
        scores={"Google Form": 78.0},
    )

    monkeypatch.setattr(
        "src.services.selection_service.send_notifications", lambda *a, **k: None
    )
    svc.update_applicant_status(applicant.id, ApplicantStatusUpdate(status="passed"))

    db.expire_all()
    assert db.get(PPDBApplicant, applicant.id).status == "passed"
    result_row = svc.repo.get_selection_result_by_applicant(applicant.id)
    assert result_row is not None and result_row.graduation_status == "passed"
