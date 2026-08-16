"use client";

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
  savedAt: string;
};

const DB_NAME = "cinebooking-pwa-v26";
const DB_VERSION = 1;
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

export async function saveOfflineTicket(ticket: OfflineTicketSnapshot) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(ticket);
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
    return (result as OfflineTicketSnapshot | undefined) ?? null;
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
    const rows = (await requestAsPromise(req)) as OfflineTicketSnapshot[];
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

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được ảnh QR."));
    reader.readAsDataURL(blob);
  });
}
