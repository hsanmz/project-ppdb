export interface NewsContent {
  title?: string
  excerpt?: string
  author?: string
  content?: string
}

export interface ProgramContent {
  title?: string
  tagline?: string
  desc?: string
  duration?: string
  level?: string
  highlights?: string[]
  curriculum?: string[]
  outcomes?: string[]
}

export interface FacilityContent {
  name?: string
  desc?: string
  features?: string[]
}

export interface StaffContent {
  name?: string
  position?: string
  bio?: string
  expertise?: string[]
  parentId?: string
  order?: number
}

export interface AchievementContent {
  title?: string
  desc?: string
  scope?: string
}

export interface GalleryContent {
  title?: string
  desc?: string
}

export interface TestimonialContent {
  quote?: string
  text?: string
}

export interface NewsArticle {
  id: string
  slug: string
  image: string
  category: string
  date: string
  gallery?: string[]
  content: NewsContent | null
}

export interface Program {
  id: string
  slug: string
  icon: string
  image: string
  /** Urutan tampil (ASC) untuk menu Program & daftar program. */
  order?: number
  content: ProgramContent | null
}

export interface Facility {
  id: string
  image: string
  category: string
  content: FacilityContent | null
}

export interface Staff {
  id: string
  image: string
  role: string
  content: StaffContent | null
}

export interface Achievement {
  id: string
  year: number
  image: string
  content: AchievementContent | null
}

export interface GalleryItem {
  id: string
  image: string
  category: string
  content: GalleryContent | null
}

export interface Testimonial {
  id: string
  name: string
  child: string
  image: string
  order: number
  content: TestimonialContent | null
}

// ── Hero beranda (dikelola dari CMS Company Profile) ────────────────────

export interface HeroSlideContent {
  label?: string
  title?: string
  subtitle?: string
  button_label?: string
  button_href?: string
}

export interface HeroSlide {
  id: string
  image?: string | null
  order?: number
  content: HeroSlideContent | null
}

export interface SocialLink {
  id: string
  label: string
  href: string
  path: string
}

// ── Konten landing PPDB (dikelola dari CMS Company Profile) ─────────────

export interface PpdbJalurContent {
  order?: number
  accent?: string
  kicker?: string
  title?: string
  desc?: string
  items?: string[]
  cta_label?: string
  cta_href?: string
}

export interface PpdbJalurCard {
  id: string
  icon?: string | null
  content: PpdbJalurContent | null
}

export interface PpdbPillarContent {
  order?: number
  title?: string
  desc?: string
}

export interface PpdbPillar {
  id: string
  icon?: string | null
  content: PpdbPillarContent | null
}

export interface PpdbStepContent {
  order?: number
  title?: string
  desc?: string
}

export interface PpdbStep {
  id: string
  content: PpdbStepContent | null
}

export interface PpdbCopyContent {
  // Copy hero 3D `/ppdb` — dikelola lewat entitas `ppdb-copy` (dipindah dari
  // hardcode `components/ui/orbit-delivery-hero.tsx`).
  hero_title?: string
  hero_desc?: string
  /** Poin unggulan, item dipisah `|` — mis. "30 Juz | 2 Jenjang | 1 Ekosistem". */
  hero_proof?: string
  hero_cta_label?: string
  hero_cta_href?: string
  hero_register_label?: string
  hero_register_href?: string
  jalur_title?: string
  jalur_desc?: string
  kurikulum_title?: string
  kurikulum_desc?: string
  alur_kicker?: string
  alur_title?: string
  cta_title?: string
  cta_desc?: string
  cta_primary_label?: string
  cta_primary_href?: string
  cta_secondary_label?: string
  cta_secondary_href?: string
}

export interface PpdbPageCopy {
  id: string
  content: PpdbCopyContent | null
}

export interface ContactInfo {
  id: string
  address: string
  phone_primary: string
  phone_secondary: string
  whatsapp: string
  email_primary: string
  email_admission: string
  office_hours: string | null
  maps_embed?: string | null
}

export interface SettingsItem {
  key: string
  value: string
}
