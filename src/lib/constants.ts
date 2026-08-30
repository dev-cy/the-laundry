export const BRAND = {
  lightBlue: "#7EC8E3",
  blue: "#3A8CC9",
  white: "#FFFFFF",
  text: "#0B1D2E",
} as const;

export const BUSINESS = {
  name: "The Laundry",
  tagline: "WASH · DRY · FOLD",
  phone: "0951 885 4540",
  hours: "7:00 AM – 7:00 PM",
  bio: "Professional laundry care at three convenient branches in Cauayan and Ilog, Negros Occidental.",
  services: ["Wash", "Dry", "Fold", "Pick-up & Delivery"],
} as const;

/** Open Graph / social preview image in /public */
export const SOCIAL_SHARE = {
  image: "/social-share.jpg",
  imageAlt: "The Laundry — Wash · Dry · Fold. Three branches in Negros Occidental.",
} as const;

/** Full-width homepage map (Google My Maps — all branches). */
export const MAP_EMBED_URL =
  "https://www.google.com/maps/d/embed?mid=1P1YW0Fk8xbitSigGymUl-4F_xGfc_FU&hl=en&ehbc=2E312F";

/** Storefront images and hours keyed by branch slug. */
export const BRANCH_DETAILS: Record<
  string,
  { storefront: string; hours: string }
> = {
  poblacion: {
    storefront: "/store-front/poblacion-front.jpg",
    hours: "7:00 AM – 7:00 PM",
  },
  dancalan: {
    storefront: "/store-front/dancalan-front.jpg",
    hours: "8:00 AM – 6:00 PM",
  },
  tuyom: {
    storefront: "/store-front/tuyom-front.jpg",
    hours: "8:00 AM – 6:00 PM",
  },
};

export function getBranchDetails(slug: string) {
  return (
    BRANCH_DETAILS[slug] ?? {
      storefront: "",
      hours: BUSINESS.hours,
    }
  );
}

export const DENOMINATIONS = [1, 5, 10, 20, 50, 100, 200, 500, 1000] as const;

/** Earliest month included in payroll history (semi-monthly cut-offs). */
export const PAYROLL_HISTORY_START_MONTH = "2026-08";

export type Denomination = (typeof DENOMINATIONS)[number];

export const SERVICE_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "blankets", label: "Blankets" },
  { value: "comforters", label: "Comforters" },
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number]["value"];

/** Stable IDs — must match supabase/schema.sql seed */
export const DEFAULT_BRANCHES = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "The Laundry Poblacion",
    location: "Cauayan",
    slug: "poblacion",
    created_at: "",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "The Laundry Dancalan",
    location: "Ilog",
    slug: "dancalan",
    created_at: "",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "The Laundry Tuyom",
    location: "Cauayan",
    slug: "tuyom",
    created_at: "",
  },
] as const;
