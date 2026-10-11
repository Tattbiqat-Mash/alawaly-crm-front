"use client";

import { FileUp, X } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FileDropLabels = {
  prompt: string;
  hint: string;
  remove: string;
  tooLarge: string;
  wrongType: string;
};

/**
 * File picker with drag-and-drop, type and size checks and upload progress. The upload itself
 * goes through lib/api/files.uploadMultipart with the field names the endpoint documents.
 */
export function FileDrop({
  accept,
  maxBytes,
  value,
  onChange,
  progress,
  disabled,
  labels,
}: {
  /** MIME types, e.g. ["application/pdf", "image/jpeg", "image/png"]. */
  accept: string[];
  maxBytes: number;
  value: File | null;
  onChange: (file: File | null) => void;
  /** 0–100 while uploading. */
  progress?: number;
  disabled?: boolean;
  labels: FileDropLabels;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!accept.includes(file.type)) return setError(labels.wrongType);
    if (file.size > maxBytes) return setError(labels.tooLarge);
    setError(null);
    onChange(file);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) pick(e.dataTransfer.files[0]);
  };

  return (
    <div className="grid gap-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <FileUp aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate" dir="auto">
            {value.name}
          </span>
          {progress !== undefined ? (
            <span className="num text-muted-foreground">{progress}%</span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={labels.remove}
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              <X />
            </Button>
          )}
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm transition-colors",
            "focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted/40",
            dragging && "border-primary bg-accent",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <FileUp aria-hidden className="size-5 text-muted-foreground" />
          <span className="font-medium">{labels.prompt}</span>
          <span className="text-xs text-muted-foreground">{labels.hint}</span>
          <input
            ref={inputRef}
            id={id}
            type="file"
            className="sr-only"
            accept={accept.join(",")}
            disabled={disabled}
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {progress !== undefined && (
        <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
