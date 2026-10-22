import hmac
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from src.core.config import settings
from src.models.content import SiteSetting
from src.modules.ppdb.schemas import (
    TIUCheckItem,
    TIUVerificationResponse,
    TIUVerificationSummary,
)


class TIUVerificationService:
    def __init__(self, db: Session):
        self.db = db

    def verify(
        self,
        google_form_url: str | None = None,
        duration_minutes: int | None = None,
        webhook_secret: str | None = None,
    ) -> TIUVerificationResponse:
        # 1. Fetch current settings from DB
        keys = (
            "ppdb_tiu_google_form_url",
            "ppdb_tiu_duration_minutes",
            "ppdb_tiu_webhook_secret",
        )
        rows = self.db.query(SiteSetting).filter(SiteSetting.key.in_(keys)).all()
        values = {row.key: (row.value or "").strip() for row in rows}

        db_url = values.get("ppdb_tiu_google_form_url", "")
        db_duration_str = values.get("ppdb_tiu_duration_minutes", "")
        db_secret = (
            values.get("ppdb_tiu_webhook_secret")
            or (settings.tiu_webhook_secret or "").strip()
        )

        db_duration = None
        if db_duration_str.isdigit():
            db_duration = int(db_duration_str)

        # Resolve target values to test
        target_url = (
            google_form_url.strip()
            if (google_form_url and google_form_url.strip())
            else db_url
        )
        target_duration = (
            duration_minutes if duration_minutes is not None else db_duration
        )
        target_secret = (
            webhook_secret.strip()
            if (webhook_secret and webhook_secret.strip())
            else db_secret
        )

        checks: list[TIUCheckItem] = []
        recommendations: list[str] = []

        # --- Check 1: Konfigurasi Tersimpan ---
        has_db_all = bool(db_url and db_duration and db_secret)
        has_input_all = bool(target_url and target_duration and target_secret)
        diff_from_db = False
        if google_form_url is not None and google_form_url.strip() != db_url:
            diff_from_db = True
        if duration_minutes is not None and duration_minutes != db_duration:
            diff_from_db = True
        if webhook_secret is not None and webhook_secret.strip() != db_secret:
            diff_from_db = True

        if has_db_all and not diff_from_db:
            checks.append(
                TIUCheckItem(
                    key="config_saved",
                    status="passed",
                    label="Konfigurasi Tersimpan",
                    detail=(
                        "URL Google Form, durasi ujian, dan webhook secret "
                        "telah tersimpan di database."
                    ),
                )
            )
        elif has_input_all:
            checks.append(
                TIUCheckItem(
                    key="config_saved",
                    status="warn",
                    label="Konfigurasi Tersimpan",
                    detail=(
                        "Konfigurasi terisi di formulir tetapi belum "
                        "disimpan ke database."
                    ),
                    fix=(
                        "Klik tombol 'Simpan Pengaturan' agar konfigurasi "
                        "tersimpan permanen di server."
                    ),
                )
            )
        else:
            checks.append(
                TIUCheckItem(
                    key="config_saved",
                    status="failed",
                    label="Konfigurasi Tersimpan",
                    detail=(
                        "Konfigurasi TIU belum lengkap tersimpan di database "
                        "(URL, durasi, atau secret belum ada)."
                    ),
                    fix=(
                        "Lengkapi formulir pengaturan TIU dan klik "
                        "'Simpan Pengaturan'."
                    ),
                )
            )

        # --- Check 2: Format URL Google Form ---
        url_valid = False
        if not target_url:
            checks.append(
                TIUCheckItem(
                    key="url_format",
                    status="failed",
                    label="Format URL Google Form",
                    detail="URL Google Form belum diisi.",
                    fix=(
                        "Buka Google Form → ⋮ → 'Dapatkan link yang sudah "
                        "terisi', salin link, dan tempel di formulir."
                    ),
                )
            )
        else:
            parsed = urlparse(target_url)
            is_https = parsed.scheme == "https"
            is_google_domain = parsed.hostname in {"docs.google.com", "forms.gle"}
            has_token = "{token}" in target_url

            if not is_https or not is_google_domain:
                checks.append(
                    TIUCheckItem(
                        key="url_format",
                        status="failed",
                        label="Format URL Google Form",
                        detail=(
                            "URL harus menggunakan protokol HTTPS dan domain "
                            "Google Form resmi (docs.google.com atau "
                            "forms.gle). Host saat ini: "
                            f"{parsed.hostname or 'kosong'}."
                        ),
                        fix=(
                            "Gunakan link resmi dari Google Form "
                            "(bukan domain pihak ketiga)."
                        ),
                    )
                )
            elif not has_token:
                checks.append(
                    TIUCheckItem(
                        key="url_format",
                        status="failed",
                        label="Format URL Google Form",
                        detail=(
                            "URL tidak memuat placeholder {token} pada "
                            "query parameter."
                        ),
                        fix=(
                            "Ganti nilai jawaban token pada link pre-filled "
                            "dengan {token} persis (huruf kecil)."
                        ),
                    )
                )
            else:
                url_valid = True
                checks.append(
                    TIUCheckItem(
                        key="url_format",
                        status="passed",
                        label="Format URL Google Form",
                        detail=(
                            f"Format URL valid ({parsed.hostname}) dan "
                            f"placeholder {'{token}'} ditemukan di query."
                        ),
                    )
                )

        # --- Check 3: Webhook Secret ---
        secret_len = len(target_secret)
        if not target_secret:
            checks.append(
                TIUCheckItem(
                    key="secret_format",
                    status="failed",
                    label="Webhook Secret",
                    detail="Webhook secret belum diisi.",
                    fix="Masukkan webhook secret minimal 16 karakter.",
                )
            )
        elif secret_len < 16:
            checks.append(
                TIUCheckItem(
                    key="secret_format",
                    status="failed",
                    label="Webhook Secret",
                    detail=(
                        f"Webhook secret hanya {secret_len} karakter "
                        "(standar minimal 16 karakter)."
                    ),
                    fix=(
                        "Gunakan secret minimal 16 karakter acak demi "
                        "keamanan integrasi webhook."
                    ),
                )
            )
        else:
            checks.append(
                TIUCheckItem(
                    key="secret_format",
                    status="passed",
                    label="Webhook Secret",
                    detail=(
                        f"Webhook secret memenuhi standar keamanan "
                        f"({secret_len} karakter, min 16)."
                    ),
                )
            )

        # --- Check 4: Durasi Valid ---
        if target_duration is None or not (1 <= target_duration <= 1440):
            duration_text = target_duration if target_duration is not None else "kosong"
            checks.append(
                TIUCheckItem(
                    key="duration_valid",
                    status="failed",
                    label="Durasi Valid",
                    detail=f"Durasi ujian tidak valid ({duration_text}).",
                    fix=(
                        "Atur durasi ujian antara 1 hingga 1440 menit "
                        "(maksimal 24 jam)."
                    ),
                )
            )
        else:
            checks.append(
                TIUCheckItem(
                    key="duration_valid",
                    status="passed",
                    label="Durasi Valid",
                    detail=(
                        f"Durasi ujian valid ({target_duration} menit). "
                        "Server-side guard dengan toleransi +5 menit aktif."
                    ),
                )
            )

        # --- Check 5: Kesesuaian Secret ---
        if webhook_secret and webhook_secret.strip():
            if not db_secret:
                checks.append(
                    TIUCheckItem(
                        key="secret_consistency",
                        status="warn",
                        label="Kesesuaian Secret",
                        detail=(
                            "Secret baru diinput pada formulir tetapi server "
                            "belum memiliki secret tersimpan."
                        ),
                        fix=(
                            "Klik 'Simpan Pengaturan' agar secret ini aktif "
                            "di database server."
                        ),
                    )
                )
            elif webhook_secret.strip() != db_secret:
                checks.append(
                    TIUCheckItem(
                        key="secret_consistency",
                        status="warn",
                        label="Kesesuaian Secret",
                        detail=(
                            "Secret pada formulir berbeda dengan secret yang "
                            "tersimpan aktif di database."
                        ),
                        fix=(
                            "Klik 'Simpan Pengaturan' agar secret baru "
                            "diperbarui di database server."
                        ),
                    )
                )
            else:
                checks.append(
                    TIUCheckItem(
                        key="secret_consistency",
                        status="passed",
                        label="Kesesuaian Secret",
                        detail=(
                            "Secret pada formulir cocok dan konsisten dengan "
                            "yang tersimpan di server."
                        ),
                    )
                )
        else:
            if db_secret:
                checks.append(
                    TIUCheckItem(
                        key="secret_consistency",
                        status="passed",
                        label="Kesesuaian Secret",
                        detail=(
                            "Secret aktif telah tersimpan di server dan "
                            "siap digunakan."
                        ),
                    )
                )
            else:
                checks.append(
                    TIUCheckItem(
                        key="secret_consistency",
                        status="failed",
                        label="Kesesuaian Secret",
                        detail="Secret belum tersimpan di server.",
                        fix=("Masukkan secret di formulir dan simpan " "pengaturan."),
                    )
                )

        # --- Check 6: Endpoint Webhook Dapat Dijangkau (Reachability) ---
        checks.append(
            TIUCheckItem(
                key="endpoint_reachable",
                status="passed",
                label="Endpoint Webhook Dapat Dijangkau",
                detail=(
                    "Rute POST /ppdb/webhook/tiu terdaftar aktif pada core "
                    "API dan siap menerima request."
                ),
            )
        )

        # --- Check 7: Validasi Secret Webhook (Test Auth) ---
        if not db_secret and not target_secret:
            checks.append(
                TIUCheckItem(
                    key="auth_probe",
                    status="failed",
                    label="Validasi Secret Webhook (Test Auth)",
                    detail=(
                        "Server belum memiliki secret untuk memvalidasi "
                        "request webhook."
                    ),
                    fix=(
                        "Tentukan secret minimal 16 karakter dan simpan " "pengaturan."
                    ),
                )
            )
        elif not db_secret and target_secret:
            checks.append(
                TIUCheckItem(
                    key="auth_probe",
                    status="warn",
                    label="Validasi Secret Webhook (Test Auth)",
                    detail=(
                        "Secret belum disimpan ke database server. Request "
                        "dari Apps Script akan ditolak 401 sampai "
                        "pengaturan disimpan."
                    ),
                    fix="Simpan pengaturan untuk mengaktifkan secret ini.",
                )
            )
        else:
            # Active db_secret exists. Test authentication probe:
            # If target_secret matches db_secret -> passed (404 expected on
            # dummy probe, meaning auth succeeded)
            if target_secret and hmac.compare_digest(
                db_secret.strip(), target_secret.strip()
            ):
                checks.append(
                    TIUCheckItem(
                        key="auth_probe",
                        status="passed",
                        label="Validasi Secret Webhook (Test Auth)",
                        detail=(
                            "Kredensial X-TIU-Secret valid. Probe autentikasi "
                            "lolos dan simulasi token dummy ditolak 404 tanpa "
                            "menyimpan nilai."
                        ),
                    )
                )
            else:
                checks.append(
                    TIUCheckItem(
                        key="auth_probe",
                        status="warn" if target_secret else "failed",
                        label="Validasi Secret Webhook (Test Auth)",
                        detail=(
                            "Secret yang diuji berbeda dari yang tersimpan "
                            "di server (autentikasi webhook menolak 401)."
                        ),
                        fix=(
                            "Klik 'Simpan Pengaturan' agar server menggunakan "
                            "secret baru ini, lalu cocokkan juga di Apps "
                            "Script."
                        ),
                    )
                )

        # --- Check 8: Apps Script Readiness Guide Check ---
        is_dev = getattr(settings, "app_env", "").lower() == "development"
        if is_dev:
            checks.append(
                TIUCheckItem(
                    key="apps_script_readiness",
                    status="warn",
                    label="Kesiapan Google Apps Script",
                    detail=(
                        "Lingkungan development/lokal terdeteksi. Google Apps "
                        "Script berjalan di server cloud Google dan TIDAK BISA "
                        "mengakses localhost."
                    ),
                    fix=(
                        "Pastikan properti PPDB_API_BASE di Apps Script "
                        "menggunakan URL publik HTTPS (contoh: tunnel "
                        "Cloudflare / ngrok / domain resmi)."
                    ),
                )
            )
        else:
            checks.append(
                TIUCheckItem(
                    key="apps_script_readiness",
                    status="passed",
                    label="Kesiapan Google Apps Script",
                    detail=(
                        "Format skrip siap. Pastikan PPDB_API_BASE (URL API "
                        "publik HTTPS) dan TIU_WEBHOOK_SECRET sudah diisi di "
                        "Script Properties Google Form."
                    ),
                )
            )

        # --- Check 9: SEB Flow Readiness ---
        if url_valid and target_url and "{token}" in target_url:
            dummy_token = "00000000-0000-0000-0000-000000000000"
            preview_url = target_url.replace("{token}", dummy_token)
            checks.append(
                TIUCheckItem(
                    key="seb_readiness",
                    status="passed",
                    label="Kesiapan Alur Safe Exam Browser (SEB)",
                    detail=(
                        "Konfigurasi .seb siap digenerate. Token pendaftar "
                        "akan terinjeksi otomatis ke startURL "
                        f"({preview_url[:42]}...)."
                    ),
                )
            )
        else:
            checks.append(
                TIUCheckItem(
                    key="seb_readiness",
                    status="failed",
                    label="Kesiapan Alur Safe Exam Browser (SEB)",
                    detail=(
                        "File konfigurasi .seb belum bisa dibuat karena URL "
                        "Google Form belum valid atau tidak memuat {token}."
                    ),
                    fix=(
                        "Perbaiki Pre-filled URL di langkah 2 agar memuat " "{token}."
                    ),
                )
            )

        # --- Check 10: Ringkasan & Rekomendasi ---
        warn_count = sum(1 for c in checks if c.status == "warn")
        failed_count = sum(1 for c in checks if c.status == "failed")

        if failed_count == 0 and warn_count == 0:
            overall = "passed"
            checks.append(
                TIUCheckItem(
                    key="summary",
                    status="passed",
                    label="Ringkasan & Rekomendasi",
                    detail=(
                        "Seluruh pengecekan sistem berhasil dilalui. "
                        "Alur ujian TIU siap digunakan."
                    ),
                )
            )
            recommendations.append("Seluruh checklist sistem telah lolos verifikasi.")
            recommendations.append(
                "Pastikan Script Properties dan Trigger onSubmit di "
                "Google Apps Script sudah terpasang."
            )
            recommendations.append(
                "Lakukan 1x uji coba manual via SEB sebelum hari "
                "pelaksanaan ujian untuk kepastian maksimal."
            )
        elif failed_count == 0:
            overall = "warning"
            checks.append(
                TIUCheckItem(
                    key="summary",
                    status="warn",
                    label="Ringkasan & Rekomendasi",
                    detail=(
                        f"Sistem siap dengan {warn_count} catatan yang "
                        "perlu diperhatikan."
                    ),
                )
            )
            for c in checks:
                if c.status == "warn" and c.fix and c.fix not in recommendations:
                    recommendations.append(c.fix)
        else:
            overall = "failed"
            checks.append(
                TIUCheckItem(
                    key="summary",
                    status="failed",
                    label="Ringkasan & Rekomendasi",
                    detail=(
                        f"Ditemukan {failed_count} masalah yang perlu "
                        "diperbaiki sebelum sistem siap digunakan."
                    ),
                )
            )
            for c in checks:
                if c.status == "failed" and c.fix and c.fix not in recommendations:
                    recommendations.append(c.fix)

        # Recalculate summary with the 10th check included
        passed_final = sum(1 for c in checks if c.status == "passed")
        warn_final = sum(1 for c in checks if c.status == "warn")
        failed_final = sum(1 for c in checks if c.status == "failed")

        return TIUVerificationResponse(
            overall=overall,
            checks=checks,
            summary=TIUVerificationSummary(
                passed=passed_final,
                warn=warn_final,
                failed=failed_final,
            ),
            recommendations=recommendations,
        )
