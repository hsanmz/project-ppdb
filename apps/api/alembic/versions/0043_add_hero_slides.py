"""Tabel slide hero beranda + halaman permission `hero`.

Revision ID: 0043
Revises: 0042
Create Date: 2026-10-17

Hero beranda `/` sebelumnya hardcode di
`apps/companyprofile/app/components/sections/HeroSection.tsx`. Migrasi ini
membuat entitas generik `hero-slides` (lihat ``TABLES`` di
`src/modules/companyprofile/router.py`) sehingga panitia bisa mengelola slide
(teks + gambar + tombol) dari dashboard Company Profile.

Tidak ada seed konten: hero tetap memakai teks statis saat ini sampai admin
mengisi slide pertama (perilaku fallback ada di HeroSection). Halaman ``hero``
didaftarkan agar bisa di-grant per-user dari Superadmin.
"""

from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision: str = "0043"
down_revision: str | None = "0042"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Mirrors `PAGES["companyprofile"]` in `scripts/seed.py`.
HERO_PAGE = ("hero", "Hero Beranda", "Home", 5)


def _create_table(bind: sa.engine.Connection) -> None:
    if "hero_slides" in set(sa.inspect(bind).get_table_names()):
        return
    op.create_table(
        "hero_slides",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("image", sa.String(length=255), nullable=True),
        # NOT NULL tanpa server_default, sama seperti `testimonials.order`:
        # nilai default dikirim router lewat `COLUMN_DEFAULTS` karena penulisan
        # generik memakai INSERT mentah.
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def _ensure_page(bind: sa.engine.Connection) -> None:
    """Daftarkan halaman `hero` agar bisa di-grant dari Superadmin."""
    tables = set(sa.inspect(bind).get_table_names())
    if "pages" not in tables or "modules" not in tables:
        return

    modules = sa.Table("modules", sa.MetaData(), autoload_with=bind)
    pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
    module = bind.execute(
        sa.select(modules.c.id).where(modules.c.key == "companyprofile")
    ).first()
    if not module:
        return

    key, label, icon, sort_order = HERO_PAGE
    now = datetime.now()
    existing = bind.execute(
        sa.select(pages.c.id).where(
            pages.c.module_id == module.id, pages.c.key == key
        )
    ).first()
    values = {
        "label": label,
        "icon": icon,
        "sort_order": sort_order,
        "updated_at": now,
    }
    if existing:
        bind.execute(pages.update().where(pages.c.id == existing.id).values(**values))
    else:
        bind.execute(
            pages.insert().values(
                id=str(uuid4()),
                module_id=module.id,
                key=key,
                created_at=now,
                **values,
            )
        )


def upgrade() -> None:
    bind = op.get_bind()
    _create_table(bind)
    _ensure_page(bind)


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())

    if "pages" in tables:
        pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
        bind.execute(pages.delete().where(pages.c.key == HERO_PAGE[0]))

    if "hero_slides" in set(sa.inspect(bind).get_table_names()):
        op.drop_table("hero_slides")
