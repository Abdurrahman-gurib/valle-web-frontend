// Data model: mirrors Database/seed/data.json and the GET /api/catalog response.

export type CatKey = 'adventure' | 'nature' | 'kids' | 'tours';
export type PriceMode = 'pp' | 'flat' | 'entry' | 'kiosk';
export type RateKey = 'rr' | 'nr';

export interface Category {
  name: string;
  badge: string;
  color: string;
  fg: string;
  pulse: string;
}

export interface Activity {
  id: string;
  name: string;
  cat: CatKey;
  thrill: number;           // 1..5
  dur: string;              // duration label e.g. "1–3 H"
  age: string;              // age label e.g. "8+"
  price: number;            // base "from" price (MUR)
  mode: PriceMode;
  flatLabel?: string;       // e.g. "/ buggy" when mode==='flat'
  img: string;
  blurb: string;
  detail?: string;
  gtk: { t: string }[];     // "good to know" bullets
}

export interface Pin {
  n: string;                // pin code e.g. "A", "GZ"
  px: number;               // % from left
  py: number;               // % from top
  kind: 'main' | 'sub';
  name: string;
  sub: string | null;
  img: string;
  btnLabel?: string;
  act: string | null;       // activity id
  go?: string;              // nav target: plan | chamouze | citronelle | kids
}

export interface MenuItem { n: string; note: string; p: string; }
export interface MenuGroup { title: string; items: MenuItem[]; }

export interface Restaurant {
  name: string;
  badge: string;
  img: string;
  tag: string;
  cuisine: string;
  hours: string;
  price: string;
  setting: string;
  about: string;
  detail: string;
  menuPdf: string;
  gallery: string[];
  menuGroups: MenuGroup[];
}

export interface PackItem { t: string; }

export interface PackTier {
  name: string;
  badge?: string;
  color: string;
  fg?: string;
  img: string;
  single: string;           // price label e.g. "Rs 11,100"
  dbl: string;
  note?: string;
  hero?: string;
  items: PackItem[];
}

export interface Packs {
  ls: PackTier[];
  ex: PackTier[];
  addons: { t: string; p: string }[];
  vip: PackItem[];
}

export interface GalleryShot { src: string; tag: string; cap: string; pos?: string; }

export interface Gallery {
  eyebrow: string;
  t1: string;
  t2: string;
  copy: string;
  foot: string;
  cta: string;
  shots: GalleryShot[];
}

export interface Combo {
  name: string;
  color: string;
  items: PackItem[];
  rr: [number, number];     // [single, double]
  nr: [number, number];
}

export interface CineItem { n: string; p: number; }

export interface PriceRow { n: string; rr: number; nr: number; }

export interface PhotoTier { name: string; color: string; act: string; single: string; dbl: string; }
export interface PhotoRate { tiers: PhotoTier[]; addons: { t: string; p: string }[]; }

export interface TeamPack { img: string; items: PackItem[]; }

export interface Catalog {
  CAT: Record<CatKey, Category>;
  ACTS: Activity[];
  PINS: Pin[];
  RESTOS: Record<string, Restaurant>;
  PACKS: Packs;
  GAL: Record<string, Gallery>;
  COMBO: Combo[];
  CINE: CineItem[];
  RATEP: Record<string, [number, number]>;   // id -> [rr, nr]
  PL: Record<string, PriceRow[]>;            // 'admission' + activity ids
  PHOTO: Record<RateKey, PhotoRate>;
  TEAM: TeamPack[];
  HERO: string[];
  ENTRY_A: number;
  ENTRY_C: number;
}

// ---- Cart / booking ----

export interface SelEntry { a?: number; k?: number; u?: number; }
export type Sel = Record<string, SelEntry>;

export interface BookingLine { label: string; amt: string; }

export interface BookingSummary {
  selActs: Activity[];
  lines: BookingLine[];
  hasDiscount: boolean;
  discount: number;
  total: number;
  advCount: number;
}

export interface BookingRequest {
  visitDate: string;         // ISO date
  slot: 'morning' | 'afternoon';
  adults: number;
  kids: number;
  rate: RateKey;
  items: { id: string; adults?: number; kids?: number; units?: number }[];
  name: string;
  phone?: string;
  email?: string;
  nationality?: string;
  payMode: 'gate' | 'online';
}

export interface BookingResponse {
  refCode: string;
  total: number;
  discount: number;
  lines: { label: string; amount: number }[];
  status: string;
}

export interface QuoteRequest {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  groupSize?: string;
  preferredDate?: string;
  message?: string;
}

// ---- Staff back office (see CONTRACT-v2 "Staff REST API") ----

export type StaffRole = 'admin' | 'agent';

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
}

export type BookingStatus = 'confirmed' | 'arrived' | 'cancelled';
export type SlotKey = 'morning' | 'afternoon';
export type PayMode = 'gate' | 'online';

/** One row of GET /api/staff/bookings. */
export interface BookingRow {
  id: string;
  refCode: string;
  visitDate: string;          // ISO date
  slot: SlotKey;
  adults: number;
  kids: number;
  rate: RateKey;
  guestName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  payMode: PayMode;
  status: BookingStatus;
  entryAmount: number;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  createdAt: string;          // ISO datetime
}

export interface BookingDetailLine {
  label: string;
  adults: number;
  kids: number;
  units: number;
  amount: number;
}

/** GET /api/staff/bookings/:refCode */
export type BookingDetail = BookingRow & { lines: BookingDetailLine[] };

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StaffStats {
  bookingsToday: number;
  arrivalsToday: number;
  openChats: number;
  revenueMonth: number;
}

/** One row of GET /api/staff/quotes. */
export interface QuoteRow {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  groupSize: string | null;
  preferredDate: string | null;
  message: string | null;
  createdAt: string;
}

// ---- Live chat ----

export type ChatSender = 'visitor' | 'staff' | 'system';

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: ChatSender;
  staffName?: string;
  body: string;
  createdAt: string;
}

export type ConversationStatus = 'open' | 'closed';

export interface ConversationSummary {
  id: string;
  visitorName: string;
  visitorEmail: string;
  subject: string;
  status: ConversationStatus;
  unreadStaff: number;
  lastMessageAt: string;
  createdAt: string;
  lastMessage?: string;
}

// ---- Careers, public side (see CONTRACT-v3 "Careers API") ----
// Values mirror the CHECK constraints on job_vacancies / job_applications.

export type EmploymentType = 'full-time' | 'part-time' | 'seasonal' | 'internship';
export type VacancyStatus = 'draft' | 'published' | 'closed';
export type ApplicationStatus =
  'new' | 'reviewing' | 'shortlisted' | 'interviewed' | 'offered' | 'rejected' | 'hired';

/** One row of GET /api/vacancies: everything the listing card shows. */
export interface VacancyCard {
  slug: string;
  title: string;
  department: string;
  location: string;
  employment: EmploymentType;
  summary: string;
  salaryRange: string;
  closesOn: string | null;    // ISO date, or null when the role stays open
}

/** GET /api/vacancies/:slug. `requirements` is plain text, one per line. */
export interface VacancyDetail extends VacancyCard {
  description: string;
  requirements: string;
  benefits: string;
}

/** Body of POST /api/vacancies/:slug/apply. */
export interface ApplicationRequest {
  fullName: string;
  email: string;
  phone?: string;
  cvUrl?: string;
  coverLetter?: string;
  yearsExperience?: number;
}
