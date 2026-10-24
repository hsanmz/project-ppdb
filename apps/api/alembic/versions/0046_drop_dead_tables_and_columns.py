"""Drop dead tables (rate_limits, tiu_results) and dead columns.

Also drop users.profile and clean legacy RBAC pages.

Revision ID: 0046
Revises: 0045
Create Date: 2026-10-23
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0046"
down_revision: str | None = "0045"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(name: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return name in insp.get_table_names()


def _column_exists(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    if table not in insp.get_table_names():
        return False
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    # 1. Drop dead tables
    if _table_exists("rate_limits"):
        op.drop_table("rate_limits")

    if _table_exists("tiu_results"):
        op.drop_table("tiu_results")

    # 2. Drop dead columns on ppdb_waves (superseded by
    # registration_start_date & registration_end_date)
    if _column_exists("ppdb_waves", "start_date"):
        op.drop_column("ppdb_waves", "start_date")

    if _column_exists("ppdb_waves", "end_date"):
        op.drop_column("ppdb_waves", "end_date")

    # 3. Drop dead column on users (legacy unused JSON blob)
    if _column_exists("users", "profile"):
        op.drop_column("users", "profile")

    # 4. Clean up legacy pages from RBAC permission table if present
    if _table_exists("pages"):
        op.execute(
            sa.text(
                "DELETE FROM pages WHERE `key` IN "
                "('mou', 'diskonasi', 'applicants', 'document-settings')"
            )
        )


def downgrade() -> None:
    # Re-add columns if downgrading
    if not _column_exists("users", "profile"):
        op.add_column("users", sa.Column("profile", sa.Text(), nullable=True))

    if not _column_exists("ppdb_waves", "start_date"):
        op.add_column("ppdb_waves", sa.Column("start_date", sa.Date(), nullable=True))

    if not _column_exists("ppdb_waves", "end_date"):
        op.add_column("ppdb_waves", sa.Column("end_date", sa.Date(), nullable=True))

    if not _table_exists("rate_limits"):
        op.create_table(
            "rate_limits",
            sa.Column("key", sa.String(255), primary_key=True),
            sa.Column("timestamp", sa.BigInteger(), primary_key=True),
        )

    if not _table_exists("tiu_results"):
        op.create_table(
            "tiu_results",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "applicant_id",
                sa.String(64),
                sa.ForeignKey("ppdb_applicants.id", ondelete="CASCADE"),
                unique=True,
            ),
            sa.Column("attempt_id", sa.String(64), unique=True, nullable=True),
            sa.Column("idempotency_key", sa.String(200), unique=True, nullable=False),
            sa.Column("score", sa.Float(), nullable=False),
            sa.Column("completed_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
