"use client";

import { ProcessedFile } from "@/lib/types";

interface SummaryBarProps {
  files: ProcessedFile[];
}

export default function SummaryBar({ files }: SummaryBarProps) {
  if (files.length === 0) return null;

  const labels = files.filter((f) => f.classification === "label" && f.status === "extracted").length;
  const applications = files.filter((f) => f.classification === "application" && f.status === "extracted").length;
  const unrecognized = files.filter((f) => f.classification === "unrecognized" && f.status === "extracted").length;
  const processing = files.filter((f) => f.status === "classifying" || f.status === "uploading").length;
  const errors = files.filter((f) => f.status === "error").length;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm">
      <span className="text-sm font-medium text-gray-600">
        {files.length} file{files.length !== 1 ? "s" : ""}
      </span>
      <div className="h-4 w-px bg-gray-200" />
      {labels > 0 && (
        <Pill color="emerald" label="Labels" count={labels} />
      )}
      {applications > 0 && (
        <Pill color="blue" label="Applications" count={applications} />
      )}
      {unrecognized > 0 && (
        <Pill color="amber" label="Unrecognized" count={unrecognized} />
      )}
      {processing > 0 && (
        <Pill color="gray" label="Processing" count={processing} />
      )}
      {errors > 0 && (
        <Pill color="red" label="Errors" count={errors} />
      )}
    </div>
  );
}

const colorMap = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  gray: "bg-gray-100 text-gray-600",
  red: "bg-red-100 text-red-700",
};

function Pill({ color, label, count }: { color: keyof typeof colorMap; label: string; count: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${colorMap[color]}`}>
      {count} {label}
    </span>
  );
}
