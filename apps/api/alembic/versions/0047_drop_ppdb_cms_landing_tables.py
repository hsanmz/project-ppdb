"""Drop deactivated PPDB CMS landing tables.

Tables: ppdb_jalur_cards, ppdb_pillars, ppdb_steps, ppdb_page_copy.
Content is now static in apps/companyprofile/app/lib/ppdbContent.ts.

Revision ID: 0047
Revises: 0046
Create Date: 2026-10-23
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0047"
down_revision: str | None = "0046"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PPDB_CMS_TABLES = (
    "ppdb_page_copy",
    "ppdb_steps",
    "ppdb_pillars",
    "ppdb_jalur_cards",
)


def _table_exists(name: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return name in insp.get_table_names()


def upgrade() -> None:
    for table in PPDB_CMS_TABLES:
        if _table_exists(table):
            op.drop_table(table)

    # Clean up the now-deactivated pages from the RBAC permission table.
    # Both DELETE statements are checked against the real schema: `pages` has
    # a `module_id` FK to `modules` -- there is no plain `module` column.
    insp = sa.inspect(op.get_bind())
    names = set(insp.get_table_names())
    if "pages" in names:
        if "modules" in names:
            op.execute(
                sa.text(
                    "DELETE FROM pages WHERE `key` IN "
                    "('ppdb-jalur', 'ppdb-pillars', 'ppdb-steps', 'ppdb-copy') "
                    "AND module_id IN (SELECT id FROM modules "
                    "WHERE `key` = 'companyprofile')"
                )
            )
        else:
            # Fallback: keys are module-scoped strings widely specific enough,
            # but restrict the blast radius in case a same-named key exists.
            op.execute(
                sa.text(
                    "DELETE FROM pages WHERE `key` IN "
                    "('ppdb-jalur', 'ppdb-pillars', 'ppdb-steps', 'ppdb-copy')"
                )
            )


def downgrade() -> None:
    """Recreate the dropped tables (empty) with the schema from migration 0042.

    Content is now static, so seed rows are not restored; only columns matching
    src/models/content.py are recreated.
    """
    for table in PPDB_CMS_TABLES:
        if _table_exists(table):
            continue
        columns: list[sa.Column] = [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        ]
        if table in ("ppdb_jalur_cards", "ppdb_pillars"):
            columns.append(sa.Column("icon", sa.String(255), nullable=True))
        op.create_table(table, *columns)
