from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    image: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    date: Mapped[str | None] = mapped_column(String(50))
    gallery: Mapped[dict | None] = mapped_column(Text)
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    icon: Mapped[str | None] = mapped_column(String(255))
    image: Mapped[str | None] = mapped_column(String(255))
    # Urutan tampil (ASC) untuk menu Program di navbar/footer dan daftar program.
    # NOT NULL tanpa server_default: nilai default create dikirim router lewat
    # `COLUMN_DEFAULTS` karena penulisan generik memakai INSERT mentah.
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    image: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    image: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    image: Mapped[str | None] = mapped_column(String(255))
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class GalleryItem(Base):
    __tablename__ = "gallery_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    image: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Testimonial(Base):
    __tablename__ = "testimonials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    child: Mapped[str] = mapped_column(String(255), nullable=False)
    image: Mapped[str | None] = mapped_column(String(255))
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SocialLink(Base):
    __tablename__ = "social_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    href: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PpdbJalurCard(Base):
    """Kartu "Jalur Pendaftaran" pada halaman publik `/ppdb`.

    Dikelola dari CMS Company Profile (tab Jalur PPDB). Isi kartu (judul,
    label, deskripsi, poin, label/tautan CTA, urutan, warna aksen) disimpan
    sebagai JSON di kolom `content`; hanya `icon` yang berupa kolom sendiri
    agar pola kolomnya sejalan dengan `Program`.
    """

    __tablename__ = "ppdb_jalur_cards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    icon: Mapped[str | None] = mapped_column(String(255))
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PpdbPillar(Base):
    """Kartu pilar kurikulum (mis. Tahfidz, Coding & AI) di halaman `/ppdb`."""

    __tablename__ = "ppdb_pillars"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    icon: Mapped[str | None] = mapped_column(String(255))
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PpdbStep(Base):
    """Langkah pada timeline "Alur Pendaftaran" di halaman `/ppdb`."""

    __tablename__ = "ppdb_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class PpdbPageCopy(Base):
    """Teks judul seksi & banner CTA halaman `/ppdb` (singleton satu baris).

    Router generik menolak pembuatan baris kedua untuk entitas `ppdb-copy`,
    sehingga selalu ada tepat satu sumber teks untuk halaman tersebut.
    """

    __tablename__ = "ppdb_page_copy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class HeroSlide(Base):
    """Satu slide hero di beranda.

    Urutan tampil ada di kolom `order` (ASC); teks dan tombol disimpan di
    `content` sebagai JSON (label, title, subtitle, button_label, button_href).
    `image` memakai kolom sendiri supaya tombol unggah gambar form admin bekerja
    seperti pada entitas konten lain.
    """

    __tablename__ = "hero_slides"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    image: Mapped[str | None] = mapped_column(String(255))
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[dict | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class ContactInfo(Base):
    __tablename__ = "contact_info"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    address: Mapped[str | None] = mapped_column(Text)
    phone_primary: Mapped[str | None] = mapped_column(String(50))
    phone_secondary: Mapped[str | None] = mapped_column(String(50))
    whatsapp: Mapped[str | None] = mapped_column(String(50))
    email_primary: Mapped[str | None] = mapped_column(String(255))
    email_admission: Mapped[str | None] = mapped_column(String(255))
    office_hours: Mapped[str | None] = mapped_column(String(255))
    maps_embed: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
