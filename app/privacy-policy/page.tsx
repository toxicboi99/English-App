import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const privacySections: LegalSection[] = [
  {
    title: "1. Information We Collect",
    items: [
      "Name and email address.",
      "YouTube account data when you give permission.",
      "Uploaded videos and other content you share in the app.",
      "Messages and interactions with other users.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    items: [
      "Upload videos to your YouTube account.",
      "Connect users for English learning.",
      "Improve app performance and features.",
      "Provide support and communication.",
    ],
  },
  {
    title: "3. Third-Party Services",
    items: [
      "We use third-party services such as the YouTube API for video uploads.",
      "Those services may collect data according to their own privacy policies.",
    ],
  },
  {
    title: "4. Data Security",
    items: ["We take reasonable measures to protect your data, but no system is 100% secure."],
  },
  {
    title: "5. User Communication",
    items: [
      "Messages between users may be stored to improve service quality.",
      "We do not sell your personal data to third parties.",
    ],
  },
  {
    title: "6. Your Rights",
    items: [
      "You can request deletion of your account and data.",
      "You can disconnect your YouTube account at any time.",
    ],
  },
  {
    title: "7. Changes to Policy",
    items: [
      "We may update this policy from time to time.",
      "Continued use of the platform means you accept the updated policy.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Privacy Policy | SpeakUp",
  description: "Learn how SpeakUp collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      badge="Privacy Policy"
      intro="This page explains what information SpeakUp collects, how we use it, and the choices you have while using our English learning platform."
      lastUpdated="March 26, 2026"
      sections={privacySections}
      title="Privacy Policy"
    />
  );
}
