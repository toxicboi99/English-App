import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const termsSections: LegalSection[] = [
  {
    title: "1. Use of Service",
    items: [
      "Our platform lets users upload videos to YouTube through our system.",
      "Our platform also connects users who want to practice and improve English speaking skills.",
      "You agree to use the platform only for lawful purposes and in a respectful manner.",
    ],
  },
  {
    title: "2. User Accounts",
    items: [
      "You are responsible for maintaining the confidentiality of your account.",
      "You must provide accurate information.",
      "You are responsible for all activities under your account.",
    ],
  },
  {
    title: "3. YouTube Integration",
    items: [
      "By connecting your YouTube account, you grant permission to upload videos on your behalf.",
      "You must comply with YouTube's terms and policies.",
      "We are not responsible for content violations on your YouTube channel.",
    ],
  },
  {
    title: "4. User Content",
    items: [
      "You retain ownership of your content.",
      "You grant us permission to process and publish content as needed for app functionality.",
      "You must not upload harmful, illegal, or copyrighted content without permission.",
    ],
  },
  {
    title: "5. Community Guidelines",
    items: [
      "Be respectful to other users.",
      "No harassment, abuse, or inappropriate behavior.",
      "Violations may result in account suspension.",
    ],
  },
  {
    title: "6. Limitation of Liability",
    items: [
      "We are not responsible for loss of data or content.",
      "We are not responsible for issues caused by third-party services such as YouTube.",
      "We are not responsible for user interactions outside our platform.",
    ],
  },
  {
    title: "7. Termination",
    items: [
      "We reserve the right to suspend or terminate accounts that violate these terms.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Terms & Conditions | SpeakUp",
  description: "Review the rules and responsibilities for using SpeakUp.",
};

export default function TermsConditionsPage() {
  return (
    <LegalPage
      badge="Terms & Conditions"
      intro="These terms describe how SpeakUp can be used, what users are responsible for, and the limits of the platform's liability."
      lastUpdated="March 26, 2026"
      sections={termsSections}
      title="Terms & Conditions"
    />
  );
}
