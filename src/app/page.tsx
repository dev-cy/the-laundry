import { Clock, MapPin, Phone, Shirt, Sparkles, Wind } from "lucide-react";
import { BranchMapSection } from "@/components/BranchMapSection";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { BUSINESS, getBranchDetails } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

const BRANCHES = [
  {
    name: "The Laundry Poblacion",
    location: "Cauayan, Negros Occidental",
    slug: "poblacion",
  },
  {
    name: "The Laundry Dancalan",
    location: "Ilog, Negros Occidental",
    slug: "dancalan",
  },
  {
    name: "The Laundry Tuyom",
    location: "Cauayan, Negros Occidental",
    slug: "tuyom",
  },
];

const SERVICES = [
  {
    icon: Shirt,
    title: "Wash",
    desc: "Gentle, thorough cleaning for all fabrics",
  },
  { icon: Wind, title: "Dry", desc: "Fast, efficient drying with care" },
  { icon: Sparkles, title: "Fold", desc: "Neatly folded and ready to wear" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("*");

  const displayBranches =
    branches && branches.length > 0
      ? branches.map((b) => {
          const details = getBranchDetails(b.slug);
          return {
            name: b.name,
            location: `${b.location}, Negros Occidental`,
            slug: b.slug,
            storefront: details.storefront,
            hours: details.hours,
          };
        })
      : BRANCHES.map((branch) => {
          const details = getBranchDetails(branch.slug);
          return {
            ...branch,
            storefront: details.storefront,
            hours: details.hours,
          };
        });

  return (
    <div className="min-h-screen">
      <SiteHeader heroBlend />

      {/* Hero */}
      <header className="relative h-[min(85vh,720px)] min-h-[520px] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/75 to-brand-light/35" />

        <section className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-brand-text sm:text-5xl md:text-6xl">
            {BUSINESS.name}
          </h1>
          <p className="mt-3 text-sm font-medium tracking-[0.2em] text-brand-blue sm:text-base">
            {BUSINESS.tagline}
          </p>
          <p className="mt-6 max-w-xl text-lg text-brand-text/80">
            {BUSINESS.bio}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-brand-text/80">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-blue" />
              {BUSINESS.hours}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-brand-blue" />
              {BUSINESS.phone}
            </span>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} size="lg">
              Call Us
            </Button>
            <Button href="#branches" variant="secondary" size="lg">
              Find a Branch
            </Button>
          </div>
        </section>
      </header>

      {/* Services */}
      <section id="services" className="scroll-mt-24 py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-brand-text mb-4">
            Our Services
          </h2>
          <p className="text-center text-brand-text/60 mb-12 max-w-lg mx-auto">
            Done with care at every step.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {SERVICES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-brand-blue/10 bg-gradient-to-b from-brand-light/10 to-white p-6 text-center hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-light/30 mb-4">
                  <Icon className="w-6 h-6 text-brand-blue" />
                </div>
                <h3 className="font-semibold text-brand-text mb-2">{title}</h3>
                <p className="text-sm text-brand-text/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branches */}
      <section id="branches" className="scroll-mt-24 bg-brand-light/10 pt-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-center text-brand-text mb-4">
            Our Branches
          </h2>
          <p className="text-center text-brand-text/60 mb-12">
            Three convenient locations in Southern Negros Occidental to serve
            you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayBranches.map((branch) => (
              <div
                key={branch.slug}
                className="group relative min-h-100 overflow-hidden rounded-2xl border border-brand-blue/10 shadow-sm transition-shadow hover:shadow-lg"
              >
                {branch.storefront && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branch.storefront}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-text/95 via-brand-text/70 to-brand-text/30" />
                <div className="relative flex h-full flex-col justify-end p-6 text-white">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold drop-shadow-sm">
                    {branch.name}
                  </h3>
                  <p className="mt-1 text-sm text-white/85 drop-shadow-sm">
                    {branch.location}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-light drop-shadow-sm">
                    <Clock className="h-4 w-4 shrink-0" />
                    {branch.hours}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <BranchMapSection />
      </section>

      {/* CTA */}
      <section id="contact" className="scroll-mt-24 py-20 px-6 bg-brand-blue text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready for Fresh, Clean Laundry?
          </h2>
          <p className="text-white/80 mb-8">
            Visit any of our branches or call us to get started.
          </p>
          <Button
            href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}
            variant="inverse"
            size="lg"
          >
            <Phone className="w-4 h-4" />
            {BUSINESS.phone}
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
