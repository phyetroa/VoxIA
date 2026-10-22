"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type VoxiaTheme = "normal" | "dark" | "classic";

type ThemeContextValue = { theme: VoxiaTheme; setTheme: (theme: VoxiaTheme) => void };

const ThemeContext = createContext<ThemeContextValue>({ theme: "normal", setTheme: () => undefined });
const storageKey = "voxia-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<VoxiaTheme>("normal");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const nextTheme: VoxiaTheme = saved === "dark" || saved === "classic" ? saved : "normal";
    setThemeState(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function setTheme(nextTheme: VoxiaTheme) {
    setThemeState(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(storageKey, nextTheme);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useVoxiaTheme() {
  return useContext(ThemeContext);
}
