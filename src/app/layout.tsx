import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { BUSINESS, SOCIAL_SHARE } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteDescription =
  "Professional laundry care at three branches in Cauayan and Ilog, Negros Occidental.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${BUSINESS.name} — ${BUSINESS.tagline}`,
    template: `%s — ${BUSINESS.name}`,
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: getSiteUrl(),
    siteName: BUSINESS.name,
    title: `${BUSINESS.name} — ${BUSINESS.tagline}`,
    description: siteDescription,
    images: [
      {
        url: SOCIAL_SHARE.image,
        alt: SOCIAL_SHARE.imageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS.name} — ${BUSINESS.tagline}`,
    description: siteDescription,
    images: [SOCIAL_SHARE.image],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col bg-white text-brand-text">
        {children}
      </body>
    </html>
  );
}
