import { apiUrl } from "@/game/session/api";
import { useMessages } from "@/i18n/i18n";

/** The website's privacy policy, in a new tab (the app opens it in the system browser). */
export function PrivacyLink({ className = "" }: { className?: string }) {
  const t = useMessages();
  return (
    <a
      href={apiUrl("/privacy")}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-xs text-amber-100/60 underline underline-offset-2 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-amber-300 ${className}`}
      data-testid="privacy-link"
    >
      {t.privacy.link}
    </a>
  );
}
