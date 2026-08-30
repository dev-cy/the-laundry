import type { LegalDocument } from "./types";

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  effectiveDate: "August 30, 2026",
  lastUpdated: "August 30, 2026",
  intro: [
    'Welcome to The Laundry ("we," "us," or "our"). We operate registered laundromat branches in Cauayan and Ilog, Negros Occidental, offering wash, dry, fold, and related laundry services.',
    "We respect your privacy and are committed to protecting your personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173), its Implementing Rules and Regulations, and relevant issuances of the National Privacy Commission (NPC).",
    "This Privacy Policy explains what information we collect, how we use it, how we protect it, and what choices you have when you visit our branches, use our services, contact us, or browse our website.",
    "By using our services or website, you acknowledge that you have read and understood this Privacy Policy.",
  ],
  sections: [
    {
      id: "information-we-collect",
      title: "1. Information We Collect",
      paragraphs: [
        "We collect only the information reasonably necessary to operate our laundry business, serve customers, and maintain our staff portal.",
      ],
      subsections: [
        {
          title: "1.1 Information you provide at our branches",
          paragraphs: ["When you use our laundry services, you may voluntarily provide:"],
          list: [
            "Name and contact number (for pick-up, delivery, or order follow-up)",
            "Delivery or pick-up address (if you use pick-up and delivery)",
            "Special washing instructions or notes about your laundry",
            "Payment details handled at the counter (we do not store full card numbers on our systems)",
          ],
        },
        {
          title: "1.2 Staff and admin portal information",
          paragraphs: [
            "Authorized employees and administrators who access our internal portal may have account information such as name, work email, assigned branch, role, and login credentials managed through our authentication provider.",
          ],
        },
        {
          title: "1.3 Website and technical information",
          paragraphs: ["When you visit our website, we may automatically collect limited technical data such as:"],
          list: [
            "Browser type, device type, and general usage information",
            "IP address and approximate location derived from it",
            "Pages viewed and time spent on the site",
            "Cookies or similar technologies needed for site functionality and security",
          ],
        },
        {
          title: "1.4 Information from third parties",
          paragraphs: [
            "We may receive information from service providers that help us operate our website, authentication, and business systems. These providers process data only as instructed by us and under appropriate safeguards.",
          ],
        },
      ],
    },
    {
      id: "how-we-use",
      title: "2. How We Use Your Information",
      paragraphs: ["We use personal information for legitimate business purposes, including:"],
      list: [
        "Processing and fulfilling laundry orders and branch services",
        "Coordinating pick-up, delivery, and customer notifications",
        "Issuing receipts, resolving concerns, and handling claims",
        "Operating and securing our staff and admin portal",
        "Improving service quality, branch operations, and customer experience",
        "Complying with applicable laws, regulations, and lawful requests",
        "Preventing fraud, misuse, and unauthorized access",
      ],
    },
    {
      id: "legal-basis",
      title: "3. Legal Basis for Processing",
      paragraphs: [
        "Under the Data Privacy Act of 2012, we process personal data based on one or more of the following, as applicable:",
      ],
      list: [
        "Performance of a contract or service you requested (for example, completing your laundry order)",
        "Compliance with a legal obligation",
        "Legitimate interests in operating a safe and efficient laundry business, balanced against your privacy rights",
        "Your consent, where required (for example, optional marketing messages through Facebook Messenger or SMS)",
      ],
    },
    {
      id: "how-we-share",
      title: "4. How We Share Information",
      paragraphs: [
        "We do not sell your personal information. We may share information only when necessary:",
      ],
      list: [
        "With staff assigned to your branch to fulfill your service",
        "With technology providers that host our website, database, and authentication systems",
        "With payment processors or banks when you pay through supported channels",
        "When required by law, court order, or government authority",
        "To protect the rights, safety, and property of our customers, staff, and business",
      ],
      subsections: [
        {
          title: "4.1 Cross-border processing",
          paragraphs: [
            "Some of our service providers may store or process data outside the Philippines. When this occurs, we require appropriate contractual and security safeguards consistent with applicable data protection requirements.",
          ],
        },
      ],
    },
    {
      id: "retention",
      title: "5. Data Retention",
      paragraphs: [
        "We retain personal information only for as long as needed for the purposes described in this policy, unless a longer period is required or permitted by law.",
        "Transaction records, claim files, and staff records may be kept for accounting, tax, labor, and dispute-resolution purposes. When information is no longer needed, we take reasonable steps to delete, anonymize, or securely dispose of it.",
      ],
    },
    {
      id: "security",
      title: "6. Security Measures",
      paragraphs: [
        "We implement organizational, physical, and technical safeguards appropriate to the nature of our operations, including access controls for staff accounts, secure hosting, and branch procedures for handling customer information.",
        "No method of transmission or storage is completely secure. While we work to protect your information, we cannot guarantee absolute security.",
      ],
    },
    {
      id: "your-rights",
      title: "7. Your Rights as a Data Subject",
      paragraphs: [
        "Under the Data Privacy Act of 2012, you may have the right to:",
      ],
      list: [
        "Be informed about how your personal data is collected and processed",
        "Reasonably access your personal data",
        "Dispute inaccuracies and request correction",
        "Object to processing in certain circumstances",
        "Suspend, withdraw, or order blocking, removal, or destruction of your data where applicable",
        "File a complaint with the National Privacy Commission",
      ],
      subsections: [
        {
          title: "How to exercise your rights",
          paragraphs: [
            "To submit a privacy request, contact us using the details in Section 11. We may need to verify your identity before responding. We aim to address valid requests within a reasonable period, subject to applicable law.",
          ],
        },
      ],
    },
    {
      id: "cookies",
      title: "8. Cookies and Website Technologies",
      paragraphs: [
        "Our website may use essential cookies and similar technologies for authentication, security, and basic functionality. We do not use invasive tracking for unrelated advertising purposes.",
        "You can control cookies through your browser settings. Disabling certain cookies may affect site functionality, including staff login.",
      ],
    },
    {
      id: "children",
      title: "9. Children's Privacy",
      paragraphs: [
        "Our services are intended for general customers. If you are under 18, please use our services with the guidance of a parent or guardian.",
        "We do not knowingly collect personal information from children without appropriate consent. If you believe we have collected information from a child improperly, please contact us so we can review and take appropriate action.",
      ],
    },
    {
      id: "changes",
      title: "10. Changes to This Privacy Policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time to reflect changes in our practices, services, or legal requirements. The updated version will be posted on this page with a revised \"Last Updated\" date.",
        "Material changes may also be communicated through our branches or Facebook page where appropriate.",
      ],
    },
    {
      id: "contact",
      title: "11. Contact Us",
      paragraphs: [
        "For privacy-related questions, requests, or concerns, you may contact:",
      ],
      list: [
        "The Laundry — Privacy Contact",
        "Phone: 0951 885 4540",
        "Branches: The Laundry Poblacion (Cauayan), The Laundry Dancalan (Ilog), The Laundry Tuyom (Cauayan)",
        "Facebook: via the link on our website header or footer",
      ],
    },
  ],
};
