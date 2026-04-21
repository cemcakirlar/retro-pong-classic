import { SITE_HREF } from "../../constants";

export function SiteLink() {
  return (
    <a
      href={SITE_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-400 underline-offset-4 transition-colors hover:text-cyan-300 hover:underline"
    >
      cemcakirlar.com
    </a>
  );
}
