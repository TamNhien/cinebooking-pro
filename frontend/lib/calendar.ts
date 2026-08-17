"use client";

import { apiBlob } from "./api";

export async function downloadBookingCalendar(bookingId: string) {
  const blob = await apiBlob(`/bookings/${bookingId}/calendar.ics`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cinebooking-${bookingId}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyBookingCode(bookingId: string) {
  await navigator.clipboard.writeText(bookingId);
}
