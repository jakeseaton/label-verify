"use client";

import { useState } from "react";
import { MatchedPair, FieldVerification, FieldStatus } from "@/lib/types";

interface PairCardProps {
  pair: MatchedPair;
}

const statusConfig: Record<FieldStatus, { bg: string; text: string; icon: string; dot: string }> = {
  match: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "✓", dot: "bg-emerald-500" },
  needs_review: { bg: "bg-amber-50", text: "text-amber-700", icon: "?", dot: "bg-amber-500" },
  mismatch: { bg: "bg-red-50", text: "text-red-700", icon: "✗", dot: "bg-red-500" },
  not_found: { bg: "bg-gray-50", text: "text-gray-500", icon: "—", dot: "bg-gray-400" },
};

const pairStatusConfig = {
  pass: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", label: "Pass" },
  needs_review: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", label: "Needs Review" },
  fail: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700", label: "Fail" },
  unmatched: { bg: "bg-gray-50", border: "border-gray-300 border-dashed", badge: "bg-gray-100 text-gray-600", label: "Unmatched" },
};

export default function PairCard({ pair }: PairCardProps) {
  const [expanded, setExpanded] = useState(pair.pairStatus === "fail" || pair.pairStatus === "unmatched");
  const config = pairStatusConfig[pair.pairStatus];
  const brandName =
    pair.label?.extractedFields.brandName ||
    pair.application?.extractedFields.brandName ||
    "Unknown";

  return (
    <div className={`rounded-xl border ${config.border} overflow-hidden transition-all duration-200`}>
      {/* Header row */}
      <div
        className={`flex items-center gap-3 p-4 cursor-pointer hover:opacity-90 ${config.bg}`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Thumbnails */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Thumbnail file={pair.label} type="label" />
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <Thumbnail file={pair.application} type="application" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{brandName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
              {config.label}
            </span>
            {pair.pairStatus !== "unmatched" && (
              <>
                {pair.issueCount > 0 && (
                  <span className="text-xs text-red-600">
                    {pair.issueCount} mismatch{pair.issueCount !== 1 ? "es" : ""}
                  </span>
                )}
                {pair.reviewCount > 0 && (
                  <span className="text-xs text-amber-600">
                    {pair.reviewCount} to review
                  </span>
                )}
                {pair.issueCount === 0 && pair.reviewCount === 0 && (
                  <span className="text-xs text-emerald-600">All fields verified</span>
                )}
              </>
            )}
            {pair.pairStatus === "unmatched" && (
              <span className="text-xs text-gray-500">
                {pair.label && !pair.application
                  ? "No matching application found"
                  : "No matching label found"}
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        {pair.verifications.length > 0 && (
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Expanded verification details */}
      {expanded && pair.verifications.length > 0 && (
        <div className="border-t border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {pair.verifications.map((v) => (
              <VerificationRow key={v.field} verification={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Thumbnail({ file, type }: { file?: { previewUrl: string; file: { type: string; name: string } }; type: string }) {
  if (!file) {
    return (
      <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
        <span className="text-[10px] text-gray-400 text-center leading-tight">
          No {type}
        </span>
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
      {file.file.type === "application/pdf" ? (
        <div className="w-full h-full flex items-center justify-center bg-red-50">
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 3.5L18.5 8H14V3.5zM6 20V4h7v5h5v11H6z" />
          </svg>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.previewUrl} alt={file.file.name} className="w-full h-full object-cover" />
      )}
    </div>
  );
}

function VerificationRow({ verification: v }: { verification: FieldVerification }) {
  const config = statusConfig[v.status];

  return (
    <div className={`px-4 py-3 ${config.bg}`}>
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">{v.label}</span>
            <span className={`text-xs font-medium ${config.text}`}>
              {v.status === "match" && "Match"}
              {v.status === "needs_review" && "Needs Review"}
              {v.status === "mismatch" && "Mismatch"}
              {v.status === "not_found" && "Not Found"}
            </span>
          </div>

          {/* Values comparison */}
          {(v.appValue || v.labelValue) && v.status !== "match" && (
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {v.appValue && (
                <div className="bg-white/60 rounded px-2 py-1.5">
                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Application</span>
                  <p className="text-gray-700 mt-0.5 break-words">{v.appValue}</p>
                </div>
              )}
              {v.labelValue && (
                <div className="bg-white/60 rounded px-2 py-1.5">
                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Label</span>
                  <p className="text-gray-700 mt-0.5 break-words">{v.labelValue}</p>
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          {v.explanation && (
            <p className={`text-xs mt-1 ${config.text}`}>{v.explanation}</p>
          )}
        </div>
      </div>
    </div>
  );
}
