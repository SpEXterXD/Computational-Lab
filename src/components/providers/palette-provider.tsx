"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CommandPalette } from "@/components/command-palette";

const PaletteContext = createContext<{ openPalette: () => void } | null>(null);

export function usePalette() {
  const context = useContext(PaletteContext);
  if (!context) throw new Error("usePalette must be used inside CommandPaletteProvider");
  return context;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openPalette = useCallback(() => setIsOpen(true), []);
  const closePalette = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (event.key === "/") {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
        ) {
          return;
        }
        event.preventDefault();
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PaletteContext.Provider value={{ openPalette }}>
      {children}
      {isOpen && <CommandPalette onClose={closePalette} />}
    </PaletteContext.Provider>
  );
}
