"use client";

import { useEffect } from "react";

export function ThemeListener() {
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type !== "theme-preview") return;
      const el = document.querySelector<HTMLElement>("[data-theme-root]");
      if (!el) return;
      if (e.data.bgColor) {
        el.style.backgroundColor = e.data.bgColor;
        el.style.setProperty("--color-bg", e.data.bgColor);
        document.body.style.backgroundColor = e.data.bgColor;
      }
      if (e.data.fgColor) {
        el.style.color = e.data.fgColor;
        el.style.setProperty("--color-fg", e.data.fgColor);
      }
      if (e.data.accentColor) {
        el.style.setProperty("--color-accent", e.data.accentColor);
      }
      if (e.data.fontFamily) {
        el.style.fontFamily = e.data.fontFamily;
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  return null;
}
