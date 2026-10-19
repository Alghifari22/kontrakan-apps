"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("kontrakan-theme");
    const selected: Theme = saved === "dark" ? "dark" : "light";
    setTheme(selected);
    document.documentElement.dataset.theme = selected;
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("kontrakan-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Aktifkan mode ${theme === "dark" ? "terang" : "gelap"}`}
      title={`Aktifkan mode ${theme === "dark" ? "terang" : "gelap"}`}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      <span className="hidden sm:inline">{theme === "dark" ? "Mode terang" : "Mode gelap"}</span>
    </button>
  );
}
