"use client";

import { useEffect } from "react";

const KEYBOARD_NAV_KEYS = new Set([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Enter",
  " ",
]);

/**
 * Keeps pointer focus visually quiet while preserving a strong keyboard focus
 * indicator. Native Chromium form controls (especially <select>) may match
 * :focus-visible after a pointer click, so CSS alone is not sufficient.
 */
export default function InputModalityManager() {
  useEffect(() => {
    const root = document.documentElement;
    const markPointer = () => { root.dataset.inputModality = "pointer"; };
    const markKeyboard = (event: KeyboardEvent) => {
      if (KEYBOARD_NAV_KEYS.has(event.key)) root.dataset.inputModality = "keyboard";
    };

    window.addEventListener("pointerdown", markPointer, true);
    window.addEventListener("mousedown", markPointer, true);
    window.addEventListener("touchstart", markPointer, true);
    window.addEventListener("keydown", markKeyboard, true);

    return () => {
      window.removeEventListener("pointerdown", markPointer, true);
      window.removeEventListener("mousedown", markPointer, true);
      window.removeEventListener("touchstart", markPointer, true);
      window.removeEventListener("keydown", markKeyboard, true);
      delete root.dataset.inputModality;
    };
  }, []);

  return null;
}
