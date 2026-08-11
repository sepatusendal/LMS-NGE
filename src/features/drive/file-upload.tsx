"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriveUpload } from "@/features/drive/use-drive-upload";

interface Props {
  onUploaded: (driveFileId: string, fileName: string) => void;
  currentFile?: string | null;
  accept?: string;
  label?: string;
}

export function FileUpload({
  onUploaded,
  currentFile,
  accept = "image/*",
  label = "Upload Foto",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useDriveUpload();
  const [preview, setPreview] = useState<{ url: string; isImage: boolean; name: string } | null>(null);

  // Revoke the previous blob URL whenever it's replaced or the component
  // unmounts — object URLs otherwise stay pinned in memory for the page's
  // lifetime (only fires when preview.url actually changes, not per keystroke).
  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview({ url: URL.createObjectURL(file), isImage: file.type.startsWith("image/"), name: file.name });

    try {
      const result = await upload.mutateAsync({ file });
      onUploaded(result.driveFileId, file.name);
    } catch {
      setPreview(null);
    }
  }

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative">
          {preview.isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt="Preview"
              className="w-full rounded-lg object-cover max-h-48"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-md px-3 py-2 text-xs">
              <FileText className="size-4 shrink-0" />
              <span className="truncate">{preview.name}</span>
            </div>
          )}
          <Button
            variant="destructive"
            size="icon-sm"
            className="absolute right-1 top-1"
            onClick={() => {
              setPreview(null);
              onUploaded("", "");
            }}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : currentFile ? (
        <div className="bg-muted text-muted-foreground flex items-center justify-between rounded-md px-3 py-2 text-xs">
          <span className="truncate">{currentFile}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onUploaded("", "")}
          >
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          <span className="ml-1.5">
            {upload.isPending ? "Mengupload..." : label}
          </span>
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
