"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Switches the full-page cinema background based on the active route.
 * Booking pages use the red auditorium image; all other pages use the
 * main cinema auditorium image.
 */
export default function BackgroundTheme() {
  const pathname = usePathname();

  useEffect(() => {
    const booking = pathname.startsWith("/booking/");
    document.body.classList.toggle("booking-background", booking);
    return () => document.body.classList.remove("booking-background");
  }, [pathname]);

  return null;
}
