import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "editor-theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    let t = "light";
    try {
      t = localStorage.getItem(STORAGE_KEY) || "light";
    } catch (_) {}
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
    }
    return t;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      document.documentElement.setAttribute("data-theme", theme);
    } catch (e) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const setTheme = (value) => {
    setThemeState(value === "dark" ? "dark" : "light");
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
