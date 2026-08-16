"use client";

import { ChangeEvent, useRef, useState } from "react";
import { api } from "@/lib/api";

type PosterUploadResponse = {
  url: string;
  fileName: string;
  size: number;
};

type Props = {
  value: string;
  onChange: (url: string) => void;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function PosterUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState(false);

  async function upload(file: File) {
    setError("");
    setPreviewError(false);

    if (file.size > MAX_BYTES) {
      setError("Ảnh poster tối đa 5 MB.");
      return;
    }
    if (file.type && !ACCEPTED_TYPES.has(file.type)) {
      setError("Chỉ hỗ trợ JPG, PNG hoặc WebP.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    setUploading(true);
    try {
      const result = await api<PosterUploadResponse>("/admin/uploads/posters", {
        method: "POST",
        body: form,
      });
      onChange(result.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  }

  function clearPoster() {
    onChange("");
    setError("");
    setPreviewError(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
      <div>
        <div className="text-sm font-semibold">Poster phim</div>
        <div className="mt-1 text-xs text-slate-400">Upload JPG, PNG hoặc WebP từ máy, tối đa 5 MB.</div>
      </div>

      <input
        ref={inputRef}
        className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-600"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={chooseFile}
        disabled={uploading}
      />

      {uploading && <div className="text-sm text-amber-300">Đang tải poster lên...</div>}
      {error && <div className="text-sm text-rose-300">{error}</div>}

      <div className="text-xs text-slate-500">Hoặc nhập URL ảnh có sẵn:</div>
      <input
        className="input"
        placeholder="https://... hoặc /uploads/movies/..."
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setPreviewError(false);
        }}
      />

      {value && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-black/30">
            {!previewError ? (
              <img
                src={value}
                alt="Xem trước poster"
                className="h-64 w-full object-cover"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-rose-300">
                Không tải được ảnh từ đường dẫn này.
              </div>
            )}
          </div>
          <button type="button" className="btn btn-secondary w-full" onClick={clearPoster}>
            Gỡ poster khỏi phim
          </button>
        </div>
      )}
    </div>
  );
}
