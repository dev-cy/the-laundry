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
  bio: "The 1st Registered Laundromat in Cauayan, Negros Occidental",
  services: ["Wash", "Dry", "Fold", "Pick-up & Delivery"],
} as const;

export const DENOMINATIONS = [1, 5, 10, 20, 50, 100, 200, 500, 1000] as const;

export type Denomination = (typeof DENOMINATIONS)[number];

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
