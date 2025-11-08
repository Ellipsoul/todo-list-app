"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  // resolvedTheme is only available after mount, so we can use it to check
  if (!resolvedTheme) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg bg-secondary text-secondary-foreground border border-border hover:bg-secondary-hover transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark"
        ? <SunIcon className="w-5 h-5" />
        : <MoonIcon className="w-5 h-5" />}
    </button>
  );
}
