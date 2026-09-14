/* eslint-disable @next/next/no-img-element -- native img is required for QR/data/user-provided image sources. */
"use client";

import { ChangeEvent, useRef, useState } from "react";
import { api } from "@/lib/api";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";

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
  const { t } = usePresentationLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  async function upload(file: File) {
    setError("");
    setPreviewError(false);

    if (file.size > MAX_BYTES) {
      setError(t("Ảnh áp phích tối đa 5 MB.", "Poster image must be 5 MB or smaller."));
      return;
    }
    if (file.type && !ACCEPTED_TYPES.has(file.type)) {
      setError(t("Chỉ hỗ trợ JPG, PNG hoặc WebP.", "Only JPG, PNG, or WebP is supported."));
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
    if (file) { setSelectedFileName(file.name); void upload(file); }
  }

  function clearPoster() {
    onChange("");
    setError("");
    setPreviewError(false);
    if (inputRef.current) inputRef.current.value = "";
    setSelectedFileName("");
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
      <div>
        <div className="text-sm font-semibold">{t("Áp phích phim", "Movie poster")}</div>
        <div className="mt-1 text-xs text-slate-400">{t("Tải JPG, PNG hoặc WebP từ máy, tối đa 5 MB.", "Upload JPG, PNG, or WebP from your computer, up to 5 MB.")}</div>
      </div>

      <input
        ref={inputRef}
        className="sr-only"
        data-testid="movie-poster-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={chooseFile}
        disabled={uploading}
      />
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" className="btn btn-secondary shrink-0" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {t("Chọn tệp", "Choose file")}
        </button>
        <span className="min-w-0 truncate text-sm text-slate-400" data-testid="movie-poster-file-name">
          {selectedFileName || t("Chưa chọn tệp", "No file selected")}
        </span>
      </div>

      {uploading && <div className="text-sm text-amber-300">{t("Đang tải áp phích lên...", "Uploading poster...")}</div>}
      {error && <div className="text-sm text-rose-300">{error}</div>}

      <div className="text-xs text-slate-500">{t("Hoặc nhập đường dẫn ảnh có sẵn:", "Or enter an existing image URL:")}</div>
      <input
        className="input"
        placeholder={t("https://... hoặc /uploads/movies/...", "https://... or /uploads/movies/...")}
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
                alt={t("Xem trước áp phích", "Poster preview")}
                className="h-64 w-full object-cover"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-rose-300">
                {t("Không tải được ảnh từ đường dẫn này.", "Unable to load an image from this URL.")}
              </div>
            )}
          </div>
          <button type="button" className="btn btn-secondary w-full" onClick={clearPoster}>
            {t("Gỡ áp phích khỏi phim", "Remove poster from movie")}
          </button>
        </div>
      )}
    </div>
  );
}
