"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { SiteHeaderActions } from "@/components/SiteHeaderActions";
import { cn } from "@/lib/cn";

const SCROLL_THRESHOLD = 8;
const TOP_OFFSET = 16;

type SiteHeaderProps = {
  className?: string;
  /** On homepage: transparent at scroll top so the bar feels part of the hero. */
  heroBlend?: boolean;
};

export function SiteHeader({ className, heroBlend = false }: SiteHeaderProps) {
  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    setAtTop(window.scrollY <= TOP_OFFSET);

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;

        setAtTop(currentY <= TOP_OFFSET);

        if (currentY <= TOP_OFFSET) {
          setVisible(true);
        } else if (delta > SCROLL_THRESHOLD) {
          setVisible(true);
        } else if (delta < -SCROLL_THRESHOLD) {
          setVisible(false);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const blendedIntoHero = heroBlend && atTop;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[transform,background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-in-out",
        visible ? "translate-y-0" : "-translate-y-full",
        blendedIntoHero
          ? "border-b border-transparent bg-transparent shadow-none backdrop-blur-none"
          : "border-b border-brand-blue/10 bg-white/95 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="The Laundry home">
          <Logo size="sm" showTagline={false} />
        </Link>
        <SiteHeaderActions />
      </nav>
    </header>
  );
}

/** Reserve space below the fixed header so content is not covered. */
export const SITE_HEADER_OFFSET_CLASS = "pt-24";
