import {
  Clock,
  MapPin,
  Phone,
  Truck,
  Sparkles,
  Wind,
  Shirt,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { BUSINESS } from "@/lib/constants";
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
  { icon: Shirt, title: "Wash", desc: "Gentle, thorough cleaning for all fabrics" },
  { icon: Wind, title: "Dry", desc: "Fast, efficient drying with care" },
  { icon: Sparkles, title: "Fold", desc: "Neatly folded and ready to wear" },
  { icon: Truck, title: "Pick-up & Delivery", desc: "We come to you — hassle-free" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("*");

  const displayBranches =
    branches && branches.length > 0
      ? branches.map((b) => ({
          name: b.name,
          location: `${b.location}, Negros Occidental`,
          slug: b.slug,
        }))
      : BRANCHES;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-light/40 via-white to-brand-blue/10">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-brand-light/50 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-brand-blue/20 blur-3xl" />
        </div>

        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <Logo size="sm" showTagline={false} />
          <Button href="/login" size="sm">
            Login
          </Button>
        </nav>

        <section className="relative z-10 flex flex-col items-center text-center px-6 pt-12 pb-24 max-w-4xl mx-auto">
          <Logo size="lg" />
          <p className="mt-6 text-lg text-brand-text/70 max-w-xl">
            {BUSINESS.bio}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-brand-text/80">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-blue" />
              {BUSINESS.hours}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand-blue" />
              {BUSINESS.phone}
            </span>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 justify-center">
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
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-brand-text mb-4">
            Our Services
          </h2>
          <p className="text-center text-brand-text/60 mb-12 max-w-lg mx-auto">
            Professional laundry care with pick-up and delivery across all three branches.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <section id="branches" className="py-20 px-6 bg-brand-light/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-brand-text mb-4">
            Our Branches
          </h2>
          <p className="text-center text-brand-text/60 mb-12">
            Three convenient locations to serve you
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayBranches.map((branch) => (
              <div
                key={branch.slug}
                className="rounded-2xl bg-white border border-brand-blue/10 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center mb-4">
                  <MapPin className="w-5 h-5 text-brand-blue" />
                </div>
                <h3 className="font-semibold text-brand-text text-lg mb-1">
                  {branch.name}
                </h3>
                <p className="text-sm text-brand-text/60">{branch.location}</p>
                <p className="mt-3 text-sm text-brand-blue font-medium">
                  {BUSINESS.hours}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-brand-blue text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Fresh, Clean Laundry?</h2>
          <p className="text-white/80 mb-8">
            Visit any of our branches or call us for pick-up and delivery services.
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

      {/* Footer */}
      <footer className="py-8 px-6 bg-brand-text text-white/70 text-center text-sm">
        <Logo size="sm" showTagline />
        <p className="mt-4">
          &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
