import { Github, Globe, Linkedin } from "lucide-react";
import { useData } from "../context/DataContext";

const ICONS: Record<string, typeof Github> = {
  github: Github,
  linkedin: Linkedin,
};

export function SocialLinks({ className }: { className?: string }) {
  const { profile } = useData();
  if (!profile) return null;
  const socials = profile.socials ?? {};

  return (
    <ul className={`flex items-center gap-1 ${className ?? ""}`}>
      {Object.entries(socials).map(([key, url]) => {
        const Icon = ICONS[key] ?? Globe;
        return (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={key}
              className="grid size-9 place-items-center rounded-sm text-ink-faint transition-colors hover:bg-raised hover:text-ink"
            >
              <Icon className="size-4" aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
