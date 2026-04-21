import { useEffect, useState } from "react";

export function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function enterGameFullscreen(el: HTMLElement | null) {
  if (!el) return;
  const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  const requestFullscreen = el.requestFullscreen?.bind(el) ?? anyEl.webkitRequestFullscreen?.bind(el);
  if (requestFullscreen) void Promise.resolve(requestFullscreen()).catch(() => {});
}

export function useFullscreenFlag() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(!!getFullscreenElement());
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  return on;
}
