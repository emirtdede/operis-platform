"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "black";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "fp_theme_pref";
const THEME_COOKIE_KEY = "fp_theme";

export function ThemeScript() {
  const code = `(function() {
    try {
      var cookieTheme = document.cookie.match(/(?:^|; )fp_theme=([^;]*)/);
      var theme = cookieTheme ? decodeURIComponent(cookieTheme[1]) : null;
      if (!theme) {
        theme = localStorage.getItem("${THEME_STORAGE_KEY}");
      }
      if (!theme) {
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      if (theme !== "light" && theme !== "dark" && theme !== "black") {
        theme = "light";
      }
      document.documentElement.setAttribute("data-theme", theme);
    } catch (e) {}
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored && (stored === "light" || stored === "dark" || stored === "black")) {
        setThemeState(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch {
      // Ignored in SSR or restricted storage environments
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      document.cookie = `${THEME_COOKIE_KEY}=${encodeURIComponent(newTheme)}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.setAttribute("data-theme", newTheme);
    } catch {
      // Ignored
    }
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
