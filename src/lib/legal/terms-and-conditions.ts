import type { LegalDocument } from "./types";

export const termsAndConditions: LegalDocument = {
  title: "Terms and Conditions",
  effectiveDate: "August 30, 2026",
  lastUpdated: "August 30, 2026",
  intro: [
    'Welcome to The Laundry ("we," "us," or "our"). These Terms and Conditions ("Terms") govern your use of our laundromat services, branch facilities, pick-up and delivery arrangements, and our website.',
    "By entering our premises, leaving laundry with us, placing an order, or using our website, you agree to these Terms. If you do not agree, please do not use our services.",
    "These Terms are intended to set clear expectations for both customers and our team, consistent with common practices of established laundry service providers in the Philippines and applicable consumer protection laws.",
  ],
  sections: [
    {
      id: "services",
      title: "1. Our Services",
      paragraphs: [
        "The Laundry provides self-service and assisted laundry services, including wash, dry, and fold, at our registered branches in Negros Occidental.",
        "Services, machines, pricing, and operating hours may vary by branch. Current branch hours are generally 7:00 AM to 7:00 PM unless otherwise posted at the branch or on our official channels.",
      ],
      list: [
        "The Laundry Poblacion — Cauayan, Negros Occidental",
        "The Laundry Dancalan — Ilog, Negros Occidental",
        "The Laundry Tuyom — Cauayan, Negros Occidental",
      ],
    },
    {
      id: "customer-responsibilities",
      title: "2. Customer Responsibilities",
      paragraphs: ["To help us serve you safely and efficiently, you agree to:"],
      list: [
        "Check all pockets and remove valuables, money, electronics, keys, jewelry, and personal items before submitting laundry",
        "Disclose delicate, colored, new, or special-care items and provide washing instructions when needed",
        "Use machines properly in self-service areas and follow posted branch rules",
        "Keep your claim stub, receipt, or order reference until your laundry is claimed",
        "Inspect your laundry upon pick-up or delivery and report concerns promptly",
        "Treat our staff, equipment, and premises with respect",
      ],
    },
    {
      id: "pricing-payment",
      title: "3. Pricing and Payment",
      paragraphs: [
        "Prices are displayed at the branch or communicated before service is rendered. We reserve the right to update pricing at any time, but the price shown or agreed upon at the time of service will apply to that transaction.",
        "Payment is due as posted for your selected service. We may accept cash and other payment methods made available at the branch.",
        "For pick-up and delivery orders, additional fees may apply based on distance, weight, service type, and branch policy.",
      ],
    },
    {
      id: "pickup-delivery",
      title: "4. Pick-up and Delivery",
      paragraphs: [
        "If pick-up and delivery is available at your branch, schedules and service areas are subject to staff availability, weather, and operational conditions.",
        "You are responsible for providing an accurate address and reachable contact number. If we cannot complete pick-up or delivery due to incorrect details, unavailability, or refusal to accept delivery, standard service charges may still apply.",
        "Someone of legal age must be available to receive delivered laundry unless otherwise agreed in writing.",
      ],
    },
    {
      id: "care-liability",
      title: "5. Care of Garments and Limitation of Liability",
      paragraphs: [
        "We exercise reasonable care in handling laundry entrusted to us. Like other professional laundry businesses in the Philippines, we cannot guarantee results for every fabric, dye, trim, or pre-existing condition.",
        "We are not responsible for damage caused by hidden defects, improper manufacturer labels, color bleeding between customer-provided items, normal wear, shrinkage where care labels permit machine processing, or loss of buttons and minor attachments unless caused by our proven negligence.",
        "Blanket disclaimers do not excuse liability for loss or damage caused by our fault or negligence. Nothing in these Terms limits rights that cannot be waived under the Consumer Act of the Philippines (Republic Act No. 7394), the Civil Code, or other applicable law.",
      ],
      subsections: [
        {
          title: "5.1 Recommended declaration of valuable items",
          paragraphs: [
            "We strongly recommend that designer, luxury, sentimental, or high-value garments be declared in writing before service. For such items, we may decline service or require separate handling terms.",
            "As a general policy, extremely valuable or branded items are best washed personally by the owner when special care is required.",
          ],
        },
        {
          title: "5.2 Maximum compensation for proven loss",
          paragraphs: [
            "If an item is proven lost while in our custody through our fault or negligence, and after proper verification, our maximum liability for that order shall be the lesser of:",
          ],
          list: [
            "The documented fair replacement value supported by proof of purchase or reasonable estimate",
            "Two (2) times the service charge paid for the affected order",
            "Five thousand pesos (₱5,000.00) per order, unless a higher declared value was agreed in writing before service",
          ],
        },
      ],
    },
    {
      id: "claims",
      title: "6. Lost, Damaged, or Missing Items — Claims Procedure",
      paragraphs: [
        "If you believe an item is missing or damaged, notify the branch immediately and provide your receipt or claim stub.",
      ],
      list: [
        "Quality or damage concerns: report within twenty-four (24) hours from pick-up or delivery",
        "Missing items: report within forty-eight (48) hours from pick-up or delivery",
        "Include a description of the item, estimated value, and any supporting proof if available",
      ],
      subsections: [
        {
          title: "6.1 How claims are handled",
          paragraphs: [
            "We will review branch records, staff notes, and available CCTV where applicable. We may request additional information before approving repair, replacement, or compensation.",
            "Claims reported after the stated periods may be difficult to verify and may be declined, except where required by law.",
            "Unresolved concerns may be raised through our Facebook page or by calling 0951 885 4540. Customers may also seek assistance from the Department of Trade and Industry (DTI) or other lawful remedies available under Philippine law.",
          ],
        },
      ],
    },
    {
      id: "unclaimed",
      title: "7. Unclaimed Laundry",
      paragraphs: [
        "Laundry left unclaimed for more than thirty (30) days after completion notice may be considered abandoned, subject to prior reasonable notice through the contact details you provided.",
        "We may dispose of or donate unclaimed items after such period, without liability, except to the extent otherwise required by law.",
      ],
    },
    {
      id: "prohibited",
      title: "8. Prohibited Items",
      paragraphs: ["We may refuse items that pose safety, health, or operational risks, including:"],
      list: [
        "Items contaminated with hazardous chemicals, fuel, solvents, or biohazardous substances",
        "Items with uncontrolled pests or strong unsafe odors",
        "Materials that may damage machines or other customers' laundry",
        "Items prohibited by law",
        "Fur, leather, suede, or specialty materials requiring processes we do not offer, unless expressly accepted",
      ],
    },
    {
      id: "refunds",
      title: "9. Refunds and Cancellations",
      paragraphs: [
        "If we are unable to complete a paid service due to our fault, we will provide a refund, credit, or re-service as appropriate.",
        "If you cancel a pick-up or delivery request before processing begins, we will apply branch policy on cancellation fees, if any.",
        "Refunds are processed using the original payment method where possible, or through another reasonable method agreed at the branch.",
      ],
    },
    {
      id: "website-staff-portal",
      title: "10. Website and Staff Portal",
      paragraphs: [
        "Our website provides public information about The Laundry and a secure login area for authorized staff and administrators.",
        "Staff accounts are for authorized personnel only. You must not attempt to access areas of the site without permission, interfere with site security, or misuse business data.",
        "We may suspend or terminate portal access for violations of these Terms or internal policies.",
      ],
    },
    {
      id: "privacy",
      title: "11. Privacy",
      paragraphs: [
        "Our collection and use of personal information is described in our Privacy Policy, which forms part of these Terms.",
        "By using our services, you acknowledge our Privacy Policy.",
      ],
    },
    {
      id: "force-majeure",
      title: "12. Force Majeure",
      paragraphs: [
        "We are not liable for delays or failure to perform caused by events beyond our reasonable control, including typhoons, floods, power outages, government restrictions, equipment failure despite proper maintenance, or other force majeure events.",
        "We will make reasonable efforts to resume normal operations as soon as practicable.",
      ],
    },
    {
      id: "governing-law",
      title: "13. Governing Law and Disputes",
      paragraphs: [
        "These Terms are governed by the laws of the Republic of the Philippines.",
        "We encourage you to contact us first so we can try to resolve concerns informally in good faith. If a dispute remains unresolved, the courts of Negros Occidental shall have jurisdiction, without prejudice to your rights under applicable consumer protection laws.",
      ],
    },
    {
      id: "changes-contact",
      title: "14. Changes and Contact Information",
      paragraphs: [
        "We may update these Terms from time to time. Updated Terms will be posted on this page with a revised date.",
        "For questions about these Terms, contact us at 0951 885 4540 or through our official Facebook page linked on this website.",
      ],
    },
  ],
};
