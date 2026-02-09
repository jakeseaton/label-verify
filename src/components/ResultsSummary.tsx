"use client";

import { MatchedPair, PairStatus } from "@/lib/types";
import { downloadCsv } from "@/lib/csv-export";

interface ResultsSummaryProps {
  pairs: MatchedPair[];
  activeFilter: PairStatus | "all";
  onFilterChange: (filter: PairStatus | "all") => void;
}

export default function ResultsSummary({ pairs, activeFilter, onFilterChange }: ResultsSummaryProps) {
  const pass = pairs.filter((p) => p.pairStatus === "pass").length;
  const review = pairs.filter((p) => p.pairStatus === "needs_review").length;
  const fail = pairs.filter((p) => p.pairStatus === "fail").length;
  const unmatched = pairs.filter((p) => p.pairStatus === "unmatched").length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Verification Results
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {pairs.length} pair{pairs.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => downloadCsv(pairs)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All"
          count={pairs.length}
          color="gray"
          active={activeFilter === "all"}
          onClick={() => onFilterChange("all")}
        />
        {pass > 0 && (
          <FilterChip
            label="Pass"
            count={pass}
            color="emerald"
            active={activeFilter === "pass"}
            onClick={() => onFilterChange("pass")}
          />
        )}
        {review > 0 && (
          <FilterChip
            label="Needs Review"
            count={review}
            color="amber"
            active={activeFilter === "needs_review"}
            onClick={() => onFilterChange("needs_review")}
          />
        )}
        {fail > 0 && (
          <FilterChip
            label="Fail"
            count={fail}
            color="red"
            active={activeFilter === "fail"}
            onClick={() => onFilterChange("fail")}
          />
        )}
        {unmatched > 0 && (
          <FilterChip
            label="Unmatched"
            count={unmatched}
            color="slate"
            active={activeFilter === "unmatched"}
            onClick={() => onFilterChange("unmatched")}
          />
        )}
      </div>
    </div>
  );
}

const chipColors = {
  gray: { active: "bg-gray-800 text-white", inactive: "bg-gray-100 text-gray-600 hover:bg-gray-200" },
  emerald: { active: "bg-emerald-600 text-white", inactive: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  amber: { active: "bg-amber-500 text-white", inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  red: { active: "bg-red-600 text-white", inactive: "bg-red-50 text-red-700 hover:bg-red-100" },
  slate: { active: "bg-slate-600 text-white", inactive: "bg-slate-100 text-slate-600 hover:bg-slate-200" },
};

function FilterChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: keyof typeof chipColors;
  active: boolean;
  onClick: () => void;
}) {
  const c = chipColors[color];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
        active ? c.active : c.inactive
      }`}
    >
      {label}
      <span className={`font-bold ${active ? "opacity-80" : ""}`}>{count}</span>
    </button>
  );
}
