"""Kolom urutan tampil untuk tabel `programs`.

Revision ID: 0044
Revises: 0043
Create Date: 2026-10-17

Sebelumnya tabel ``programs`` tidak punya kolom urutan dan endpoint daftar
(``GET /companyprofile/programs``) tidak memakai ``ORDER BY``, sehingga urutan
program mengikuti PK UUID (acak) — menu Program di navbar/footer dan daftar
program tidak bisa diatur panitia. Migrasi ini menambahkan kolom ``order``
(sama seperti ``testimonials.order`` dan ``hero_slides.order``) dan endpoint
mengurutkannya ASC.

``server_default`` dipakai hanya untuk mengisi baris yang sudah ada, lalu
langsung dilepas supaya bentuk kolom identik dengan dua tabel lain itu
(NOT NULL tanpa default di sisi database; nilai default saat create dikirim
router lewat ``COLUMN_DEFAULTS``).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0044"
down_revision: str | None = "0043"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _columns(bind: sa.engine.Connection) -> set[str]:
    inspector = sa.inspect(bind)
    if "programs" not in set(inspector.get_table_names()):
        return set()
    return {column["name"] for column in inspector.get_columns("programs")}


def upgrade() -> None:
    bind = op.get_bind()
    if "order" in _columns(bind):
        return

    op.add_column(
        "programs",
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("programs", "order", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    if "order" not in _columns(bind):
        return
    op.drop_column("programs", "order")
