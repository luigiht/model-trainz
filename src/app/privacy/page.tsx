import type { Metadata } from "next";
import { PrivacyPolicy } from "@/components/privacy/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy · Model Trainz",
  description: "What Model Trainz stores about you, why, and how to delete it.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
