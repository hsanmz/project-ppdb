"""Tabel konten landing PPDB (jalur, pilar, alur, teks/CTA) + seed konten awal

Revision ID: 0042
Revises: 0041
Create Date: 2026-10-16

Konten di bawah hero halaman publik `/ppdb` sebelumnya hardcode di
`apps/companyprofile/app/(main)/ppdb/page.tsx`. Migrasi ini memindahkannya ke
CMS Company Profile (empat entitas generik di
`src/modules/companyprofile/router.py`):

- `ppdb-jalur`   -> `ppdb_jalur_cards` (kartu Jalur Pendaftaran)
- `ppdb-pillars` -> `ppdb_pillars`     (kartu pilar kurikulum)
- `ppdb-steps`   -> `ppdb_steps`       (langkah alur pendaftaran)
- `ppdb-copy`    -> `ppdb_page_copy`   (singleton: judul seksi + banner CTA)

Seed memakai teks yang saat ini tampil di halaman publik supaya tampilan
tidak berubah sampai admin menyuntingnya lewat dashboard. Seeding hanya
dilakukan saat tabel masih kosong (aman dijalankan ulang lewat downgrade +
upgrade, dan tidak menimpa suntingan admin).
"""

import json
from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision: str = "0042"
down_revision: str | None = "0041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# (key, label, icon, sort_order) — key harus SAMA dengan `tab.key` di
# `apps/companyprofile/app/admin/dashboard/_constants.ts`.
PPDB_PAGES: list[tuple[str, str, str, int]] = [
    ("ppdb-jalur", "Jalur PPDB", "Route", 110),
    ("ppdb-pillars", "Pilar Kurikulum", "LayoutGrid", 120),
    ("ppdb-steps", "Alur PPDB", "ListOrdered", 130),
    ("ppdb-copy", "Teks & CTA PPDB", "Type", 140),
]

SEED_JALUR: list[dict] = [
    {
        "id": "ppdbjalur-1",
        "icon": "Award",
        "content": {
            "order": 1,
            "accent": "amber",
            "kicker": "Beasiswa Penuh & Parsial",
            "title": "Jalur Prestasi Tahfidz & Sains",
            "desc": (
                "Dikhususkan bagi calon santri yang memiliki hafalan Al-Qur'an "
                "minimal 5 Juz bersanad mutqin atau memiliki prestasi kejuaraan "
                "sains, robotika, dan IT tingkat regional/nasional."
            ),
            "items": [
                "Bebas biaya pendaftaran dan seleksi",
                "Potongan uang pangkal hingga 100%",
                "Uji tasmi hafalan langsung dengan dewan asatidz",
                "Sertifikat atau piagam kejuaraan pendukung",
            ],
            "cta_label": "Daftar Jalur Prestasi",
            "cta_href": "/contact",
        },
    },
    {
        "id": "ppdbjalur-2",
        "icon": "GraduationCap",
        "content": {
            "order": 2,
            "accent": "emerald",
            "kicker": "Seleksi Reguler Berbasis Minat",
            "title": "Jalur Reguler Terpadu",
            "desc": (
                "Terbuka bagi calon santri yang memiliki komitmen kuat dalam "
                "menghafal Al-Qur'an dan belajar teknologi digital."
            ),
            "items": [
                "Tes Potensi Akademik (TPA) & Baca Al-Qur'an",
                "Wawancara kesiapan santri dan orang tua",
                "Observasi minat bakat teknologi digital",
                "Pembinaan intensif tahsin di awal masuk",
            ],
            "cta_label": "Daftar Jalur Reguler",
            "cta_href": "/contact",
        },
    },
]

SEED_PILLARS: list[dict] = [
    {
        "id": "ppdbpillar-1",
        "icon": "BookOpen",
        "content": {
            "order": 1,
            "title": "Tahfidz Mutqin 30 Juz",
            "desc": (
                "Metode hafalan intensif bimbingan asatidz bersanad dengan "
                "target mutqin dan adab Qur'ani."
            ),
        },
    },
    {
        "id": "ppdbpillar-2",
        "icon": "Laptop",
        "content": {
            "order": 2,
            "title": "Coding & AI Academy",
            "desc": (
                "Penguasaan rekayasa software, web development, robotika, dan "
                "dasar machine learning."
            ),
        },
    },
    {
        "id": "ppdbpillar-3",
        "icon": "Users",
        "content": {
            "order": 3,
            "title": "Bahasa Internasional",
            "desc": (
                "Lingkungan pembiasaan bilingual Bahasa Arab dan Inggris aktif "
                "dalam interaksi harian."
            ),
        },
    },
    {
        "id": "ppdbpillar-4",
        "icon": "ShieldCheck",
        "content": {
            "order": 4,
            "title": "Adab & Kepemimpinan",
            "desc": (
                "Pendidikan akhlak mulia, kemandirian pondok, dan kepekaan "
                "sosial kemasyarakatan."
            ),
        },
    },
]

SEED_STEPS: list[dict] = [
    {
        "id": "ppdbstep-1",
        "content": {
            "order": 1,
            "title": "Pendaftaran Online",
            "desc": (
                "Isi formulir biodata santri dan unggah dokumen pendukung "
                "melalui sistem."
            ),
        },
    },
    {
        "id": "ppdbstep-2",
        "content": {
            "order": 2,
            "title": "Verifikasi Berkas",
            "desc": (
                "Tim panitia memvalidasi data akademik dan administrasi calon "
                "santri."
            ),
        },
    },
    {
        "id": "ppdbstep-3",
        "content": {
            "order": 3,
            "title": "Ujian Seleksi & Tasmi",
            "desc": (
                "Tes kemampuan dasar, observasi minat digital, dan tes baca "
                "Al-Qur'an."
            ),
        },
    },
    {
        "id": "ppdbstep-4",
        "content": {
            "order": 4,
            "title": "Pengumuman & Daftar Ulang",
            "desc": (
                "Penerimaan santri baru resmi dan persiapan orientasi santri "
                "(khutbah & ta'aruf)."
            ),
        },
    },
]

SEED_COPY: list[dict] = [
    {
        "id": "ppdbcopy-main",
        "content": {
            "jalur_title": "Jalur Pendaftaran Santri Baru",
            "jalur_desc": (
                "Pilihlah jalur penerimaan yang sesuai dengan minat dan "
                "potensi ananda untuk bergabung bersama Pesantren Tahfidz "
                "Qur'an dan Digital Ar-Rahman."
            ),
            "kurikulum_title": "Kurikulum Holistik Masa Depan",
            "kurikulum_desc": (
                "Keseimbangan antara ilmu ukhrawi dan bekal teknologi "
                "kontemporer"
            ),
            "alur_kicker": "Langkah Mudah",
            "alur_title": "Alur Pendaftaran PPDB",
            "cta_title": "Konsultasi Pendaftaran Santri Baru?",
            "cta_desc": (
                "Tim panitia PPDB siap melayani pertanyaan mengenai "
                "kurikulum, program beasiswa, dan kunjungan kampus pesantren."
            ),
            "cta_primary_label": "Hubungi Panitia",
            "cta_primary_href": "/contact",
            "cta_secondary_label": "Lihat Fasilitas & Asrama",
            "cta_secondary_href": "/programs",
        },
    },
]


def _create_tables(bind: sa.engine.Connection) -> None:
    existing = set(sa.inspect(bind).get_table_names())

    if "ppdb_jalur_cards" not in existing:
        op.create_table(
            "ppdb_jalur_cards",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("icon", sa.String(length=255), nullable=True),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    if "ppdb_pillars" not in existing:
        op.create_table(
            "ppdb_pillars",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("icon", sa.String(length=255), nullable=True),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    if "ppdb_steps" not in existing:
        op.create_table(
            "ppdb_steps",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    if "ppdb_page_copy" not in existing:
        op.create_table(
            "ppdb_page_copy",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )


def _seed_rows(bind: sa.engine.Connection, table_name: str, rows: list[dict]) -> None:
    """Isi tabel hanya bila masih kosong, supaya suntingan admin tidak tertimpa."""
    if table_name not in set(sa.inspect(bind).get_table_names()):
        return
    table = sa.Table(table_name, sa.MetaData(), autoload_with=bind)
    if bind.execute(sa.select(table.c.id).limit(1)).first():
        return
    now = datetime.now()
    for row in rows:
        values = dict(row)
        values["content"] = json.dumps(values.get("content") or {}, ensure_ascii=False)
        values["created_at"] = now
        values["updated_at"] = now
        bind.execute(table.insert().values(**values))


def _ensure_pages(bind: sa.engine.Connection) -> None:
    """Daftarkan halaman permission baru agar bisa di-grant dari Superadmin."""
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

    now = datetime.now()
    for key, label, icon, sort_order in PPDB_PAGES:
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
    _create_tables(bind)
    _seed_rows(bind, "ppdb_jalur_cards", SEED_JALUR)
    _seed_rows(bind, "ppdb_pillars", SEED_PILLARS)
    _seed_rows(bind, "ppdb_steps", SEED_STEPS)
    _seed_rows(bind, "ppdb_page_copy", SEED_COPY)
    _ensure_pages(bind)


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())

    if "pages" in tables:
        pages = sa.Table("pages", sa.MetaData(), autoload_with=bind)
        for key, _label, _icon, _sort in PPDB_PAGES:
            bind.execute(pages.delete().where(pages.c.key == key))

    for table_name in ("ppdb_page_copy", "ppdb_steps", "ppdb_pillars", "ppdb_jalur_cards"):
        if table_name in set(sa.inspect(bind).get_table_names()):
            op.drop_table(table_name)
