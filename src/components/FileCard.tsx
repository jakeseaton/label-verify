"use client";

import { ProcessedFile } from "@/lib/types";
import { useState } from "react";

interface FileCardProps {
  file: ProcessedFile;
}

const classificationColors = {
  label: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-100" },
  application: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "bg-blue-100" },
  unrecognized: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "bg-amber-100" },
};

const statusIcons = {
  uploading: (
    <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  classifying: (
    <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  extracted: (
    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function FileCard({ file }: FileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = classificationColors[file.classification] || classificationColors.unrecognized;
  const fields = file.extractedFields;
  const hasFields = Object.values(fields).some((v) => v);

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} transition-all duration-200`}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => file.status === "extracted" && setExpanded(!expanded)}
      >
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0">
          {file.file.type === "application/pdf" ? (
            <div className="w-full h-full flex items-center justify-center bg-red-50">
              <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 3.5L18.5 8H14V3.5zM6 20V4h7v5h5v11H6z" />
              </svg>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.previewUrl}
              alt={file.file.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {file.file.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {statusIcons[file.status]}
            {file.status === "extracted" ? (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge} ${colors.text}`}>
                {file.classification === "label"
                  ? "Label"
                  : file.classification === "application"
                  ? "Application"
                  : "⚠ Unrecognized"}
              </span>
            ) : file.status === "error" ? (
              <span className="text-xs text-red-600">{file.error || "Processing failed"}</span>
            ) : (
              <span className="text-xs text-gray-500">
                {file.status === "uploading" ? "Uploading..." : "Classifying..."}
              </span>
            )}
            {file.status === "extracted" && (
              <span className="text-xs text-gray-400">
                {Math.round(file.confidence * 100)}% confidence
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        {file.status === "extracted" && hasFields && (
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Expanded extracted fields */}
      {expanded && hasFields && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-200/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fields.brandName && (
              <FieldRow label="Brand Name" value={fields.brandName} />
            )}
            {fields.classType && (
              <FieldRow label="Class / Type" value={fields.classType} />
            )}
            {fields.abv && (
              <FieldRow label="ABV" value={fields.abv} />
            )}
            {fields.netContents && (
              <FieldRow label="Net Contents" value={fields.netContents} />
            )}
            {fields.beverageType && (
              <FieldRow label="Beverage Type" value={fields.beverageType} />
            )}
            {fields.producerName && (
              <FieldRow label="Producer" value={fields.producerName} />
            )}
            {fields.producerAddress && (
              <FieldRow label="Address" value={fields.producerAddress} />
            )}
            {fields.countryOfOrigin && (
              <FieldRow label="Origin" value={fields.countryOfOrigin} />
            )}
            {fields.governmentWarning && (
              <div className="col-span-full">
                <FieldRow label="Gov. Warning" value={fields.governmentWarning} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/60 rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
        {label}
      </p>
      <p className="text-sm text-gray-800 mt-0.5 break-words">{value}</p>
    </div>
  );
}
