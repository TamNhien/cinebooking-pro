"use client";

import { api, apiBlob, ApiError } from "@/lib/api";
import type { Booking, TicketInfo } from "@/lib/types";

export type OfflineTicketSyncState="FRESH"|"STALE"|"UNKNOWN";
export type OfflineTicketSnapshot = {
  bookingId: string;
  ownerUserId: string;
  movieTitle: string;
  showtimeStart: string;
  status: string;
  seats: { code: string; price: number }[];
  totalAmount: number;
  checkedInAt?: string;
  qrDataUrl: string;
  qrUrl: string;
  publicBaseUrl: string;
  ticketVersion: number;
  syncState: OfflineTicketSyncState;
  lastValidatedAt: string;
  invalidReason?: string;
  savedAt: string;
};

export type OfflineTicketSyncResult={checked:number;refreshed:number;stale:number;failed:number};

const DB_NAME = "cinebooking-pwa-v26";
const DB_VERSION = 2;
const STORE = "offline_tickets";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Trình duyệt không hỗ trợ lưu vé offline."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "bookingId" });
        store.createIndex("ownerUserId", "ownerUserId", { unique: false });
        store.createIndex("showtimeStart", "showtimeStart", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Không mở được bộ nhớ offline."));
  });
}

function requestAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Lỗi IndexedDB."));
  });
}

function normalize(ticket:OfflineTicketSnapshot):OfflineTicketSnapshot{
  return {
    ...ticket,
    ticketVersion:ticket.ticketVersion||1,
    syncState:ticket.syncState||"UNKNOWN",
    lastValidatedAt:ticket.lastValidatedAt||ticket.savedAt||new Date(0).toISOString()
  };
}

export async function saveOfflineTicket(ticket: OfflineTicketSnapshot) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(normalize(ticket));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Không lưu được vé offline."));
      tx.onabort = () => reject(tx.error ?? new Error("Lưu vé offline bị hủy."));
    });
  } finally {
    db.close();
  }
}

export async function getOfflineTicket(bookingId: string): Promise<OfflineTicketSnapshot | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const result = await requestAsPromise(tx.objectStore(STORE).get(bookingId));
    return result ? normalize(result as OfflineTicketSnapshot) : null;
  } finally {
    db.close();
  }
}

export async function listOfflineTickets(ownerUserId?: string): Promise<OfflineTicketSnapshot[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = ownerUserId ? store.index("ownerUserId").getAll(ownerUserId) : store.getAll();
    const rows = ((await requestAsPromise(req)) as OfflineTicketSnapshot[]).map(normalize);
    return rows.sort((a, b) => new Date(a.showtimeStart).getTime() - new Date(b.showtimeStart).getTime());
  } finally {
    db.close();
  }
}

export async function deleteOfflineTicket(bookingId: string) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(bookingId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Không xóa được vé offline."));
      tx.onabort = () => reject(tx.error ?? new Error("Xóa vé offline bị hủy."));
    });
  } finally {
    db.close();
  }
}

export async function syncOfflineTickets(ownerUserId:string):Promise<OfflineTicketSyncResult>{
  const rows=await listOfflineTickets(ownerUserId);
  const result:OfflineTicketSyncResult={checked:0,refreshed:0,stale:0,failed:0};
  if(typeof navigator==="undefined"||!navigator.onLine)return {...result,failed:rows.length};
  for(const current of rows){
    result.checked++;
    try{
      const [booking,ticket]=await Promise.all([api<Booking>(`/bookings/${current.bookingId}`),api<TicketInfo>(`/tickets/${current.bookingId}`)]);
      const qrDataUrl=await blobToDataUrl(await apiBlob(`/tickets/${current.bookingId}/qr`));
      const refreshed:OfflineTicketSnapshot={
        ...current,
        movieTitle:booking.movieTitle,showtimeStart:booking.showtimeStart,status:booking.status,
        seats:booking.seats.map(s=>({code:s.code,price:s.price})),totalAmount:booking.totalAmount,
        checkedInAt:booking.checkedInAt||ticket.checkedInAt||undefined,qrDataUrl,qrUrl:ticket.qrUrl,publicBaseUrl:ticket.publicBaseUrl,
        ticketVersion:ticket.ticketVersion||1,syncState:"FRESH",lastValidatedAt:new Date().toISOString(),invalidReason:undefined
      };
      await saveOfflineTicket(refreshed);result.refreshed++;
    }catch(error){
      if(error instanceof ApiError&&[403,404,409].includes(error.status)){
        await saveOfflineTicket({...current,syncState:"STALE",lastValidatedAt:new Date().toISOString(),invalidReason:error.message||"Vé không còn hợp lệ trên máy chủ."});
        result.stale++;
      }else result.failed++;
    }
  }
  return result;
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageEstimate(){
  try{return await navigator.storage?.estimate?.();}catch{return undefined;}
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được ảnh QR."));
    reader.readAsDataURL(blob);
  });
}
