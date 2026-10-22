import hashlib
import hmac
import time
from unittest.mock import patch

import pytest

from src.core.config import settings
from src.core.notif_service import _update_log_status
from src.main import _validate_payment_gateway, _validate_secrets
from src.modules.notifications.router import _verify_wa_webhook


class TestSecretValidationHardening:
    """Test that weak secrets and placeholder credentials fail fast."""

    @pytest.mark.parametrize(
        "placeholder",
        [
            "dev-only-secret-change-me",
            "change-me",
            "change-me-to-a-long-random-hex-string",
            "ganti_dengan_string_panjang_acak_minimal_32_karakter",
            "short",
        ],
    )
    def test_validate_secrets_rejects_weak_jwt(self, placeholder):
        with patch.object(settings, "jwt_secret", placeholder):
            with patch.object(
                settings, "cron_secret", "valid_cron_secret_16_characters_long"
            ):
                with pytest.raises(RuntimeError, match="JWT_SECRET belum diatur aman"):
                    _validate_secrets()

    @pytest.mark.parametrize(
        "placeholder",
        [
            "dev-only-cron-secret-change-me",
            "change-me",
            "ganti_dengan_string_panjang_acak_minimal_16_karakter",
            "short",
        ],
    )
    def test_validate_secrets_rejects_weak_cron(self, placeholder):
        with patch.object(
            settings, "jwt_secret", "valid_jwt_secret_with_more_than_32_characters_ok"
        ):
            with patch.object(settings, "cron_secret", placeholder):
                with pytest.raises(RuntimeError, match="CRON_SECRET belum diatur aman"):
                    _validate_secrets()

    def test_validate_secrets_accepts_strong_secrets(self):
        with patch.object(settings, "jwt_secret", "a" * 32):
            with patch.object(settings, "cron_secret", "b" * 16):
                # Should not raise
                _validate_secrets()


class TestPaymentGatewayValidationHardening:
    """Test Pakasir requirements in production."""

    def test_skips_validation_in_non_production(self):
        with patch.object(settings, "app_env", "development"):
            with patch.object(settings, "pakasir_api_key", ""):
                # Should not raise in development
                _validate_payment_gateway()

    def test_enforces_credentials_in_production(self):
        with patch.object(settings, "app_env", "production"):
            with patch.object(settings, "pakasir_api_key", ""):
                with pytest.raises(RuntimeError, match="PAKASIR_API_KEY"):
                    _validate_payment_gateway()


class TestNotificationWebhookSecurity:
    """Test HMAC-SHA256 signature and replay attack protection."""

    def test_rejects_when_secret_is_empty(self):
        with patch.object(settings, "wa_webhook_secret", ""):
            assert (
                _verify_wa_webhook(b"{}", str(int(time.time())), "sha256=123") is False
            )

    def test_rejects_expired_timestamp(self):
        secret = "test-webhook-secret-key-12345"
        with patch.object(settings, "wa_webhook_secret", secret):
            expired_ts = str(int(time.time()) - 301)
            body = b'{"event":"message.sent"}'
            msg = f"{expired_ts}.{body.decode()}".encode()
            sig = "sha256=" + hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
            assert _verify_wa_webhook(body, expired_ts, sig) is False

    def test_rejects_tampered_payload(self):
        secret = "test-webhook-secret-key-12345"
        with patch.object(settings, "wa_webhook_secret", secret):
            ts = str(int(time.time()))
            body = b'{"event":"message.sent"}'
            msg = f"{ts}.{body.decode()}".encode()
            sig = "sha256=" + hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
            # Tamper the body
            tampered_body = b'{"event":"message.sent","tampered":true}'
            assert _verify_wa_webhook(tampered_body, ts, sig) is False

    def test_accepts_valid_signature_and_timestamp(self):
        secret = "test-webhook-secret-key-12345"
        with patch.object(settings, "wa_webhook_secret", secret):
            ts = str(int(time.time()))
            body = b'{"event":"message.sent","data":{"jobId":"msg-123"}}'
            msg = f"{ts}.{body.decode()}".encode()
            sig = "sha256=" + hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
            assert _verify_wa_webhook(body, ts, sig) is True


class TestNotificationLogStatusTransition:
    """Test updating notification log status safely."""

    def test_update_log_status_does_not_crash_on_db_error(self):
        with patch(
            "src.core.notif_service.update_record", side_effect=Exception("DB down")
        ):
            # Should not raise exception
            _update_log_status("non-existent-log-id", "failed", "Test error message")


class TestWebhookIdempotencyAndReplayProtection:
    """Test atomic duplicate suppression across webhooks."""

    @pytest.mark.asyncio
    async def test_wa_webhook_suppresses_duplicate_when_key_exists(self):
        from unittest.mock import AsyncMock, MagicMock

        from fastapi import Request

        from src.modules.notifications.router import wa_webhook

        secret = "test-webhook-secret-key-12345"
        ts = str(int(time.time()))
        body_dict = {"event": "message.sent", "data": {"jobId": "msg-duplicate-123"}}
        import json

        body_bytes = json.dumps(body_dict).encode()
        msg = f"{ts}.{body_bytes.decode()}".encode()
        sig = "sha256=" + hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()

        mock_request = AsyncMock(spec=Request)
        mock_request.body.return_value = body_bytes
        mock_request.headers = {
            "X-WA-Signature": sig,
            "X-WA-Timestamp": ts,
        }

        # Mock Redis returning False on set (meaning key already exists =
        # duplicate replay)
        mock_redis = MagicMock()
        mock_redis.set.return_value = False

        with patch.object(settings, "wa_webhook_secret", secret):
            with patch("src.core.cache.get_redis", return_value=mock_redis):
                response = await wa_webhook(mock_request)
                assert response.get("status") == "duplicate_suppressed"
                assert response.get("duplicate") is True

    def test_pakasir_webhook_already_paid_returns_idempotent_success(self):
        from unittest.mock import MagicMock

        from src.models.ppdb import PPDBPaymentTransaction
        from src.services.payment_service import PaymentService

        mock_repo = MagicMock()
        existing_tx = MagicMock(spec=PPDBPaymentTransaction)
        existing_tx.id = "tx-123"
        existing_tx.status = "success"
        existing_tx.order_id = "ORDER-123"
        existing_tx.txn_id = "TXN-123"
        existing_tx.external_id = None
        existing_tx.amount = 250000

        mock_repo.get_transaction_by_id.return_value = existing_tx
        mock_repo.get_transaction_by_order_id.return_value = existing_tx

        svc = PaymentService(mock_repo)
        with patch.object(settings, "pakasir_webhook_secret", "secret123"):
            result = svc.process_pakkasir_webhook(
                {"order_id": "ORDER-123", "status": "completed", "amount": 250000},
                x_secret="secret123",
            )
            assert result["status"] == "already_paid"
            assert result["success"] is True

    @pytest.mark.asyncio
    async def test_wa_webhook_deletes_idempotency_key_on_db_exception(self):
        from unittest.mock import AsyncMock, MagicMock

        from fastapi import Request

        from src.modules.notifications.router import wa_webhook

        secret = "test-webhook-secret-key-12345"
        ts = str(int(time.time()))
        body_dict = {
            "event": "message.sent",
            "data": {"jobId": "msg-fail-123", "eventKey": "payment_success"},
        }
        import json

        body_bytes = json.dumps(body_dict).encode()
        msg = f"{ts}.{body_bytes.decode()}".encode()
        sig = "sha256=" + hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()

        mock_request = AsyncMock(spec=Request)
        mock_request.body.return_value = body_bytes
        mock_request.headers = {
            "X-WA-Signature": sig,
            "X-WA-Timestamp": ts,
        }

        mock_redis = MagicMock()
        mock_redis.set.return_value = True  # Key created successfully

        with patch.object(settings, "wa_webhook_secret", secret):
            with patch("src.core.cache.get_redis", return_value=mock_redis):
                with patch(
                    "src.modules.notifications.router.get_raw_pool",
                    side_effect=Exception("Database down"),
                ):
                    with pytest.raises(Exception, match="Database down"):
                        await wa_webhook(mock_request)

                    # Verify that key was deleted so legitimate retry is not blocked
                    mock_redis.delete.assert_called_once_with(
                        "wa_hook_idempotency:msg-fail-123:message.sent"
                    )

    def test_pakasir_webhook_amount_mismatch_raises_400_and_records_anomaly(self):
        from unittest.mock import MagicMock

        from fastapi import HTTPException

        from src.models.ppdb import PPDBPaymentTransaction
        from src.services.payment_service import PaymentService

        mock_repo = MagicMock()
        existing_tx = MagicMock(spec=PPDBPaymentTransaction)
        existing_tx.id = "tx-mismatch-123"
        existing_tx.status = "pending"
        existing_tx.order_id = "ORDER-MM"
        existing_tx.txn_id = None
        existing_tx.external_id = None
        existing_tx.amount = 250000

        mock_repo.get_transaction_by_id.return_value = existing_tx
        mock_repo.get_transaction_by_order_id.return_value = existing_tx

        svc = PaymentService(mock_repo)
        with patch.object(settings, "pakasir_webhook_secret", "secret123"):
            with pytest.raises(HTTPException) as exc_info:
                svc.process_pakkasir_webhook(
                    {"order_id": "ORDER-MM", "status": "completed", "amount": 100000},
                    x_secret="secret123",
                )
            assert exc_info.value.status_code == 400
            assert "Nominal webhook tidak cocok" in exc_info.value.detail
            assert "[ANOMALI WEBHOOK] Nominal tidak cocok" in existing_tx.notes
            mock_repo.update_transaction.assert_called_once_with(existing_tx)

    def test_pakasir_webhook_releases_redis_lock_in_finally_on_error(self):
        from unittest.mock import MagicMock

        from src.models.ppdb import PPDBPaymentTransaction
        from src.services.payment_service import PaymentService

        mock_repo = MagicMock()
        existing_tx = MagicMock(spec=PPDBPaymentTransaction)
        existing_tx.id = "tx-lock-test"
        existing_tx.status = "pending"
        existing_tx.order_id = "ORDER-LOCK"
        existing_tx.txn_id = None
        existing_tx.external_id = None
        existing_tx.amount = 250000

        mock_repo.get_transaction_by_id.return_value = existing_tx
        mock_repo.get_transaction_by_order_id.return_value = existing_tx

        mock_redis = MagicMock()
        mock_redis.set.return_value = True  # lock acquired

        svc = PaymentService(mock_repo)
        with patch.object(settings, "pakasir_webhook_secret", "secret123"):
            with patch("src.core.cache.get_redis", return_value=mock_redis):
                with patch.object(
                    svc,
                    "_settle_successful_transaction",
                    side_effect=RuntimeError("Settlement failure"),
                ):
                    with pytest.raises(RuntimeError, match="Settlement failure"):
                        svc.process_pakkasir_webhook(
                            {
                                "order_id": "ORDER-LOCK",
                                "status": "completed",
                                "amount": 250000,
                            },
                            x_secret="secret123",
                        )
                    # Verify lock was safely released via Lua script
                    assert mock_redis.eval.called
                    args, kwargs = mock_redis.eval.call_args
                    assert "lock:pakasir_webhook:tx-lock-test" in args

    def test_pakasir_webhook_contention_raises_409_when_cannot_acquire_and_not_settled(
        self,
    ):
        from unittest.mock import MagicMock

        from fastapi import HTTPException

        from src.models.ppdb import PPDBPaymentTransaction
        from src.services.payment_service import PaymentService

        mock_repo = MagicMock()
        existing_tx = MagicMock(spec=PPDBPaymentTransaction)
        existing_tx.id = "tx-contention-test"
        existing_tx.status = "pending"
        existing_tx.order_id = "ORDER-CONT"
        existing_tx.txn_id = None
        existing_tx.external_id = None
        existing_tx.amount = 250000

        mock_repo.get_transaction_by_id.return_value = existing_tx
        mock_repo.get_transaction_by_order_id.return_value = existing_tx

        mock_redis = MagicMock()
        mock_redis.set.return_value = False  # cannot acquire lock

        svc = PaymentService(mock_repo)
        with patch.object(settings, "pakasir_webhook_secret", "secret123"):
            with patch("src.core.cache.get_redis", return_value=mock_redis):
                with pytest.raises(HTTPException) as exc_info:
                    svc.process_pakkasir_webhook(
                        {
                            "order_id": "ORDER-CONT",
                            "status": "completed",
                            "amount": 250000,
                        },
                        x_secret="secret123",
                    )
                assert exc_info.value.status_code == 409
                assert (
                    "Transaksi sedang diproses secara bersamaan"
                    in exc_info.value.detail
                )

    def test_tiu_webhook_rejects_conflicting_score_with_409(self):
        from datetime import datetime
        from unittest.mock import MagicMock

        from fastapi import HTTPException

        from src.models.ppdb import PPDBApplicant, PPDBTIUAttempt
        from src.models.selection import (
            SelectionCategory,
            SelectionCriteria,
            SelectionScore,
        )
        from src.modules.ppdb.router import TIUWebhookPayload, tiu_webhook

        mock_db = MagicMock()
        mock_db.get.return_value = None  # site settings fallback

        attempt = PPDBTIUAttempt(
            id="att-1",
            applicant_id="app-1",
            token="valid-token-123",
            created_at=datetime.now(),
        )
        applicant = PPDBApplicant(
            id="app-1", user_id="user-1", wave_id="wave-1", status="document_verified"
        )
        category = SelectionCategory(id="cat-1", wave_id="wave-1", name="TIU")
        criteria = SelectionCriteria(
            id="crit-1", category_id="cat-1", name="Google Form", weight=100.0
        )
        # Existing score is 80.0
        score_entry = SelectionScore(
            id="sc-1",
            applicant_id="app-1",
            criteria_id="crit-1",
            score=80.0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        # Mocking query returns
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            attempt,
            applicant,
            category,
            criteria,
            score_entry,  # Existing score entry with 80.0
        ]

        with patch.object(settings, "tiu_webhook_secret", "tiu_secret_123"):
            payload = TIUWebhookPayload(token="valid-token-123", score=95.0)
            with pytest.raises(HTTPException) as exc_info:
                tiu_webhook(payload, x_tiu_secret="tiu_secret_123", db=mock_db)
            assert exc_info.value.status_code == 409
            assert "sudah tercatat final" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_wa_webhook_preserves_idempotency_key_if_db_already_committed(self):
        from unittest.mock import AsyncMock, MagicMock

        from fastapi import Request

        from src.modules.notifications.router import wa_webhook

        secret = "test-webhook-secret-key-12345"
        ts = str(int(time.time()))
        body_dict = {
            "event": "message.sent",
            "data": {"jobId": "msg-post-commit-err", "eventKey": "payment_success"},
        }
        import json

        body_bytes = json.dumps(body_dict).encode()
        msg = f"{ts}.{body_bytes.decode()}".encode()
        sig = "sha256=" + hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()

        mock_request = AsyncMock(spec=Request)
        mock_request.body.return_value = body_bytes
        mock_request.headers = {
            "X-WA-Signature": sig,
            "X-WA-Timestamp": ts,
        }

        mock_redis = MagicMock()
        mock_redis.set.return_value = True

        mock_conn = MagicMock()
        mock_conn.commit.side_effect = None  # Commit succeeds

        mock_pool = MagicMock()
        mock_pool.connect.return_value.__enter__.return_value = mock_conn

        with patch.object(settings, "wa_webhook_secret", secret):
            with patch("src.core.cache.get_redis", return_value=mock_redis):
                with patch(
                    "src.modules.notifications.router.get_raw_pool",
                    return_value=mock_pool,
                ):
                    with patch(
                        "src.modules.notifications.router.JSONResponse",
                        side_effect=RuntimeError("Response serializer exploded"),
                    ):
                        with pytest.raises(
                            RuntimeError, match="Response serializer exploded"
                        ):
                            await wa_webhook(mock_request)

                        # Idempotency key must NOT be deleted because DB commit
                        # already succeeded
                        mock_redis.delete.assert_not_called()

    def test_pakasir_lock_expiry_old_owner_does_not_delete_new_owner_lock(self):
        from unittest.mock import MagicMock

        from src.models.ppdb import PPDBPaymentTransaction
        from src.services.payment_service import PaymentService

        mock_repo = MagicMock()
        tx = MagicMock(spec=PPDBPaymentTransaction)
        tx.id = "tx-expiry-test"
        tx.status = "pending"
        tx.amount = 250000
        tx.order_id = "ORDER-EXPIRY"
        tx.txn_id = None
        tx.external_id = None

        mock_repo.get_transaction_by_id.return_value = tx
        mock_repo.get_transaction_by_order_id.return_value = tx

        # Simulated Redis storage
        redis_store = {}

        def mock_set(key, val, nx=False, ex=None):
            if nx and key in redis_store:
                return False
            redis_store[key] = val
            return True

        def mock_eval(script, numkeys, key, token):
            if redis_store.get(key) == token:
                del redis_store[key]
                return 1
            return 0

        mock_redis = MagicMock()
        mock_redis.set.side_effect = mock_set
        mock_redis.eval.side_effect = mock_eval

        svc = PaymentService(mock_repo)

        with patch.object(settings, "pakasir_webhook_secret", "secret123"):
            with patch("src.core.cache.get_redis", return_value=mock_redis):
                # Process A starts and acquires lock
                # Token A is stored in redis_store
                # We simulate lock expiry by setting redis_store[lock_key] to
                # token_B (as if Process B took it)
                lock_key = "lock:pakasir_webhook:tx-expiry-test"

                # Simulate Process A executing settlement
                def slow_settle(*args, **kwargs):
                    # While Process A is settling, TTL expires and Process B
                    # acquires lock with token_B
                    redis_store[lock_key] = "token_B_from_new_owner"
                    # Process A updates DB to success
                    tx.status = "success"
                    return {"status": "success"}

                with patch.object(
                    svc, "_settle_successful_transaction", side_effect=slow_settle
                ):
                    svc.process_pakkasir_webhook(
                        {
                            "order_id": "ORDER-EXPIRY",
                            "status": "completed",
                            "amount": 250000,
                        },
                        x_secret="secret123",
                    )

                # Assert that Process A's finally block did NOT delete Process B's lock!
                assert redis_store.get(lock_key) == "token_B_from_new_owner"

                # Now Process B runs under its lock: it re-fetches tx from
                # repo, sees status='success',
                # and returns already_paid without re-settling!
                result_b = svc.process_pakkasir_webhook(
                    {
                        "order_id": "ORDER-EXPIRY",
                        "status": "completed",
                        "amount": 250000,
                    },
                    x_secret="secret123",
                )
                assert result_b["status"] == "already_paid"

    def test_tiu_webhook_concurrent_callback_catches_integrity_error_idempotently(self):
        from datetime import datetime
        from unittest.mock import MagicMock

        from sqlalchemy.exc import IntegrityError

        from src.models.ppdb import PPDBApplicant, PPDBTIUAttempt
        from src.models.selection import (
            SelectionCategory,
            SelectionCriteria,
            SelectionScore,
        )
        from src.modules.ppdb.router import TIUWebhookPayload, tiu_webhook

        mock_db = MagicMock()
        mock_db.get.return_value = None

        attempt = PPDBTIUAttempt(
            id="att-2",
            applicant_id="app-2",
            token="race-token-123",
            created_at=datetime.now(),
        )
        applicant = PPDBApplicant(
            id="app-2", user_id="user-2", wave_id="wave-2", status="document_verified"
        )
        category = SelectionCategory(id="cat-2", wave_id="wave-2", name="TIU")
        criteria = SelectionCriteria(
            id="crit-2", category_id="cat-2", name="Google Form", weight=100.0
        )

        # Existing record that the winner of the race inserted
        winner_score = SelectionScore(
            id="sc-winner",
            applicant_id="app-2",
            criteria_id="crit-2",
            score=90.0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        # Query returns attempt, applicant, category, criteria, then None for
        # initial score check
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            attempt,
            applicant,
            category,
            criteria,
            None,  # Initial query: score not found yet
            winner_score,  # Post-IntegrityError query: winner score is found!
        ]

        # db.commit() raises IntegrityError (race condition on unique constraint)
        mock_db.commit.side_effect = IntegrityError(
            "statement", "params", "Duplicate entry for key"
        )

        with patch.object(settings, "tiu_webhook_secret", "tiu_secret_123"):
            payload = TIUWebhookPayload(token="race-token-123", score=90.0)
            res = tiu_webhook(payload, x_tiu_secret="tiu_secret_123", db=mock_db)

            # Assert rollback was called and idempotent success response returned
            assert mock_db.rollback.called
            assert res["status"] == "success"
            assert res["already_recorded"] is True

    @pytest.mark.asyncio
    async def test_wa_webhook_updates_correct_log_by_job_id_when_multiple_queued(self):
        from unittest.mock import AsyncMock, MagicMock

        from fastapi import Request

        from src.modules.notifications.router import wa_webhook

        secret = "test-webhook-secret-key-12345"
        ts = str(int(time.time()))
        body_dict = {
            "event": "message.sent",
            "data": {
                "jobId": "job-target-456",
                "waMessageId": "wam-789",
                "eventKey": "payment_reminder_monday",
                "recipientUserId": "user-duplicate-events",
            },
        }
        import json

        body_bytes = json.dumps(body_dict).encode()
        msg = f"{ts}.{body_bytes.decode()}".encode()
        sig = "sha256=" + hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()

        mock_request = AsyncMock(spec=Request)
        mock_request.body.return_value = body_bytes
        mock_request.headers = {
            "X-WA-Signature": sig,
            "X-WA-Timestamp": ts,
        }

        mock_redis = MagicMock()
        mock_redis.set.return_value = True

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.rowcount = 1
        mock_conn.execute.return_value = mock_cursor

        mock_pool = MagicMock()
        mock_pool.connect.return_value.__enter__.return_value = mock_conn

        with patch.object(settings, "wa_webhook_secret", secret):
            with patch("src.core.cache.get_redis", return_value=mock_redis):
                with patch(
                    "src.modules.notifications.router.get_raw_pool",
                    return_value=mock_pool,
                ):
                    res = await wa_webhook(mock_request)
                    assert res.status_code == 200

                    # Verify that SQL execution explicitly queried
                    # WHERE wa_message_id = :job_id
                    calls = mock_conn.execute.call_args_list
                    first_sql = str(calls[0][0][0])
                    assert "wa_message_id = :job_id" in first_sql
                    assert calls[0][0][1]["job_id"] == "job-target-456"
