"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  name: string;
  label: string;
  defaultUrl: string | null;
  userId: string;
  storagePath: string; // e.g. "logo" | "hero"
  previewShape?: "square" | "wide";
}

export function ImageUpload({
  name,
  label,
  defaultUrl,
  userId,
  storagePath,
  previewShape = "wide",
}: Props) {
  const [url, setUrl] = useState<string | null>(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/${storagePath}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("partner-assets")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Upload failed. Please try again.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("partner-assets").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <p className="text-size-2 font-medium text-neutral-12">{label}</p>

      {/* Preview */}
      {url && (
        <div className="overflow-hidden rounded-3 border border-neutral-6 bg-neutral-2 inline-flex">
          <img src={url} alt={label} className="h-[72px] w-auto object-contain" />
        </div>
      )}

      {/* Hidden input carries the URL into the server action */}
      <input type="hidden" name={name} value={url ?? ""} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center px-3 py-1.5 rounded-3 border border-neutral-7 text-size-2 font-medium text-neutral-12 hover:bg-neutral-3 transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading…" : url ? "Replace" : "Upload"}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => setUrl(null)}
            className="text-size-1 text-neutral-10 hover:text-error-11 transition-colors"
          >
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {error && <p className="text-size-1 text-error-11">{error}</p>}
    </div>
  );
}
