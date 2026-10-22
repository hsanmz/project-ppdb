"""Add has_crud to pages and can_crud to user_page_permissions.

Also reconcile canonical pages.

Revision ID: 0043
Revises: 0042
Create Date: 2026-10-19 14:55:00.000000

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

PPDB_CANONICAL = [
    # (key, label, icon, sort_order, has_crud)
    ("dashboard", "Dashboard", "LayoutDashboard", 5, False),
    ("data-pendaftar", "Data Pendaftar", "Users", 10, False),
    ("verifikasi-dokumen", "Verifikasi Dokumen", "ClipboardCheck", 20, True),
    ("pembayaran-formulir", "Pembayaran Formulir", "CreditCard", 30, False),
    ("pembayaran-tahap2", "Pembayaran Tahap 2", "CreditCard", 40, False),
    ("sessions", "Session 1:1", "CalendarCheck", 50, True),
    ("penilaian", "Hasil Pendaftaran", "Award", 60, True),
    ("review-loa", "Review LoA", "FileCheck2", 70, False),
    ("periods", "Periode PPDB", "CalendarDays", 80, True),
    ("pengumuman", "Preview LoA & SKD", "Settings", 90, False),
    ("rubrik", "Rubrik Penilaian", "Settings", 100, True),
    ("tiu-settings", "Pengaturan TIU", "Settings", 110, True),
    ("arsip", "Arsip Pendaftar", "Archive", 120, False),
    ("notifications", "Notifikasi", "Bell", 130, True),
]

CP_CANONICAL = [
    ("news", "Berita", "Newspaper", 10, True),
    ("programs", "Program", "BookOpen", 20, True),
    ("facilities", "Fasilitas", "Building2", 30, True),
    ("staff", "Staff", "Users", 40, True),
    ("achievements", "Prestasi", "Trophy", 50, True),
    ("gallery", "Galeri", "ImageIcon", 60, True),
    ("testimonials", "Testimoni", "MessageSquare", 70, True),
    ("social", "Tautan Sosial", "LinkIcon", 80, True),
    ("contact", "Info Kontak", "Phone", 90, True),
    ("settings", "Pengaturan", "Settings", 100, True),
]

LEGACY_MAP = {
    "ppdb": {
        "applicants": "verifikasi-dokumen",
        "payments": "pembayaran-formulir",
        "stage2-pembayaran": "pembayaran-tahap2",
        "selection": "rubrik",
        "mou": "review-loa",
        "document-settings": "pengumuman",
        "diskonasi": "periods",
    },
    "companyprofile": {
        "social-links": "social",
    },
}


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "pages" in tables:
        cols = {c["name"] for c in insp.get_columns("pages")}
        if "has_crud" not in cols:
            op.add_column(
                "pages",
                sa.Column(
                    "has_crud", sa.Boolean(), nullable=False, server_default=sa.true()
                ),
            )

    if "user_page_permissions" in tables:
        cols = {c["name"] for c in insp.get_columns("user_page_permissions")}
        if "can_crud" not in cols:
            op.add_column(
                "user_page_permissions",
                sa.Column(
                    "can_crud", sa.Boolean(), nullable=False, server_default=sa.true()
                ),
            )

    if "pages" not in tables or "modules" not in tables:
        return

    metadata = sa.MetaData()
    modules_t = sa.Table("modules", metadata, autoload_with=bind)
    pages_t = sa.Table("pages", metadata, autoload_with=bind)
    upp_t = (
        sa.Table("user_page_permissions", metadata, autoload_with=bind)
        if "user_page_permissions" in tables
        else None
    )

    now = datetime.now()

    # Reconcile modules
    for mod_key, canonical_list in [
        ("ppdb", PPDB_CANONICAL),
        ("companyprofile", CP_CANONICAL),
    ]:
        mod_id = bind.execute(
            sa.select(modules_t.c.id).where(modules_t.c.key == mod_key)
        ).scalar_one_or_none()
        if not mod_id:
            continue

        legacy = LEGACY_MAP.get(mod_key, {})

        # Rename or merge legacy page keys
        for old_key, new_key in legacy.items():
            old_row = bind.execute(
                sa.select(pages_t.c.id).where(
                    pages_t.c.module_id == mod_id, pages_t.c.key == old_key
                )
            ).first()
            if not old_row:
                continue

            new_row = bind.execute(
                sa.select(pages_t.c.id).where(
                    pages_t.c.module_id == mod_id, pages_t.c.key == new_key
                )
            ).first()

            if new_row:
                # Merge permissions from old to new
                if upp_t is not None:
                    grants = bind.execute(
                        sa.select(upp_t.c.user_id, upp_t.c.created_at).where(
                            upp_t.c.page_id == old_row.id
                        )
                    ).all()
                    for g in grants:
                        already = bind.execute(
                            sa.select(upp_t.c.id).where(
                                upp_t.c.user_id == g.user_id,
                                upp_t.c.page_id == new_row.id,
                            )
                        ).first()
                        if not already:
                            bind.execute(
                                upp_t.insert().values(
                                    id=str(uuid4()),
                                    user_id=g.user_id,
                                    page_id=new_row.id,
                                    can_crud=True,
                                    created_at=g.created_at or now,
                                )
                            )
                    bind.execute(upp_t.delete().where(upp_t.c.page_id == old_row.id))
                bind.execute(pages_t.delete().where(pages_t.c.id == old_row.id))
            else:
                bind.execute(
                    pages_t.update()
                    .where(pages_t.c.id == old_row.id)
                    .values(key=new_key, updated_at=now)
                )

        # Upsert canonical pages
        canonical_keys = {item[0] for item in canonical_list}
        for key, label, icon, sort_order, has_crud in canonical_list:
            existing = bind.execute(
                sa.select(pages_t.c.id).where(
                    pages_t.c.module_id == mod_id, pages_t.c.key == key
                )
            ).first()
            if existing:
                bind.execute(
                    pages_t.update()
                    .where(pages_t.c.id == existing.id)
                    .values(
                        label=label,
                        icon=icon,
                        sort_order=sort_order,
                        has_crud=has_crud,
                        updated_at=now,
                    )
                )
            else:
                bind.execute(
                    pages_t.insert().values(
                        id=str(uuid4()),
                        module_id=mod_id,
                        key=key,
                        label=label,
                        icon=icon,
                        sort_order=sort_order,
                        has_crud=has_crud,
                        created_at=now,
                        updated_at=now,
                    )
                )

        # Clean up any leftover pages for this module not in canonical_keys
        extra_rows = bind.execute(
            sa.select(pages_t.c.id, pages_t.c.key).where(
                pages_t.c.module_id == mod_id,
                pages_t.c.key.notin_(list(canonical_keys)),
            )
        ).all()
        for r in extra_rows:
            if upp_t is not None:
                bind.execute(upp_t.delete().where(upp_t.c.page_id == r.id))
            bind.execute(pages_t.delete().where(pages_t.c.id == r.id))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "user_page_permissions" in tables:
        cols = {c["name"] for c in insp.get_columns("user_page_permissions")}
        if "can_crud" in cols:
            op.drop_column("user_page_permissions", "can_crud")

    if "pages" in tables:
        cols = {c["name"] for c in insp.get_columns("pages")}
        if "has_crud" in cols:
            op.drop_column("pages", "has_crud")
