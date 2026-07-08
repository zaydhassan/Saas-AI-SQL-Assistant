"use client";

import * as React from "react";

export type ThemeId =
  | "dark-luxury"
  | "midnight"
  | "emerald"
  | "sunset"
  | "royal"
  | "carbon";

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  /** Preview swatches: [bg, accent, accent-2, accent-3] */
  swatches: [string, string, string, string];
};

export const THEMES: Theme[] = [
  {
    id: "dark-luxury",
    name: "Dark Luxury",
    description: "Deep navy · indigo / violet / electric blue",
    swatches: ["#050816", "#6366f1", "#8b5cf6", "#3b82f6"],
  },
  {
    id: "midnight",
    name: "Midnight Ocean",
    description: "Deep teal base · cyan aqua accents",
    swatches: ["#04141c", "#06b6d4", "#22d3ee", "#0ea5e9"],
  },
  {
    id: "emerald",
    name: "Emerald Aurora",
    description: "Forest base · green / teal accents",
    swatches: ["#04140d", "#10b981", "#34d399", "#14b8a6"],
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm dusk base · orange / rose accents",
    swatches: ["#140a08", "#f97316", "#fb7185", "#f43f5e"],
  },
  {
    id: "royal",
    name: "Royal",
    description: "Plum base · purple / magenta accents",
    swatches: ["#0c0414", "#a855f7", "#d946ef", "#ec4899"],
  },
  {
    id: "carbon",
    name: "Carbon",
    description: "Neutral slate base · steel mono accents",
    swatches: ["#0a0b0f", "#64748b", "#94a3b8", "#475569"],
  },
];

export const DEFAULT_THEME: ThemeId = "dark-luxury";
export const THEME_STORAGE_KEY = "theme";

/** Inline script string run before paint to avoid a flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t&&t!=='${DEFAULT_THEME}'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

function applyTheme(id: ThemeId) {
  const el = document.documentElement;
  if (id === DEFAULT_THEME) {
    el.removeAttribute("data-theme");
  } else {
    el.setAttribute("data-theme", id);
  }
}

export function useTheme() {
  const [theme, setThemeState] = React.useState<ThemeId>(DEFAULT_THEME);
  const [ready, setReady] = React.useState(false);

  // Read the effective theme from the <html data-theme> attribute (set by the
  // init script) so SSR/hydration stay in sync without a flash.
  React.useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    const stored = (typeof localStorage !== "undefined"
      ? (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null)
      : null) || DEFAULT_THEME;
    setThemeState((attr as ThemeId) || stored || DEFAULT_THEME);
    setReady(true);
  }, []);

  const setTheme = React.useCallback((id: ThemeId) => {
    applyTheme(id);
    try {
      if (id === DEFAULT_THEME) localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    setThemeState(id);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: id }));
  }, []);

  return { theme, setTheme, ready };
}