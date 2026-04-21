import { SITE_HREF } from "../../constants";

export function SiteLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={SITE_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-cyan-400/90 hover:text-cyan-300 underline-offset-4 hover:underline transition-colors ${className}`}
    >
      cemcakirlar.com
    </a>
  );
}
