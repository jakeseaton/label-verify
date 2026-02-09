"use client";

import { useCallback, useState } from "react";

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function DropZone({ onFilesAdded, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => {
        if (!ACCEPTED_TYPES.includes(f.type)) {
          console.warn(`Rejected ${f.name}: unsupported type ${f.type}`);
          return false;
        }
        if (f.size > MAX_SIZE) {
          console.warn(`Rejected ${f.name}: exceeds 10 MB`);
          return false;
        }
        return true;
      });
      if (files.length > 0) {
        onFilesAdded(files);
      }
    },
    [onFilesAdded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled) handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ACCEPTED_TYPES.join(",");
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) handleFiles(target.files);
    };
    input.click();
  }, [disabled, handleFiles]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`
        relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        transition-all duration-200 ease-in-out
        ${
          isDragging
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            isDragging ? "bg-blue-100" : "bg-gray-100"
          }`}
        >
          <svg
            className={`w-8 h-8 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <div>
          <p className="text-lg font-semibold text-gray-700">
            {isDragging ? "Drop files here" : "Drop your files here"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Label images and COLA applications — any number, any mix
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          Browse files
        </button>

        <p className="text-xs text-gray-400">
          JPEG, PNG, WebP, or PDF — up to 10 MB each
        </p>
      </div>
    </div>
  );
}
