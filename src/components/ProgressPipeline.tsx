"use client";

export type PipelineStage = "classifying" | "extracting" | "matching" | "verifying" | "complete";

interface ProgressPipelineProps {
  stage: PipelineStage;
  filesTotal: number;
  filesProcessed: number;
  filesErrored: number;
}

const stages: { key: PipelineStage; label: string }[] = [
  { key: "classifying", label: "Classifying files" },
  { key: "extracting", label: "Extracting data" },
  { key: "matching", label: "Matching pairs" },
  { key: "verifying", label: "Verifying labels" },
];

const stageOrder: Record<PipelineStage, number> = {
  classifying: 0,
  extracting: 1,
  matching: 2,
  verifying: 3,
  complete: 4,
};

export default function ProgressPipeline({
  stage,
  filesTotal,
  filesProcessed,
  filesErrored,
}: ProgressPipelineProps) {
  const currentIdx = stageOrder[stage];
  const pct = filesTotal > 0 ? Math.round((filesProcessed / filesTotal) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Processing {filesTotal} file{filesTotal !== 1 ? "s" : ""}...
          </span>
          <span className="text-gray-500 tabular-nums">
            {filesProcessed}/{filesTotal}
            {filesErrored > 0 && (
              <span className="text-red-500 ml-1">({filesErrored} failed)</span>
            )}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stage indicators */}
      <div className="flex items-center justify-between">
        {stages.map((s, i) => {
          const isActive = currentIdx === i;
          const isDone = currentIdx > i;
          const isFuture = currentIdx < i;

          return (
            <div key={s.key} className="flex items-center gap-2">
              {/* Connector line (before, except first) */}
              {i > 0 && (
                <div className={`hidden sm:block w-8 h-0.5 ${isDone ? "bg-emerald-400" : "bg-gray-200"}`} />
              )}
              {/* Stage dot + label */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? "bg-emerald-100 text-emerald-600"
                      : isActive
                      ? "bg-blue-100 text-blue-600 ring-2 ring-blue-300 ring-offset-1"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    isDone ? "text-emerald-600" : isActive ? "text-blue-600" : isFuture ? "text-gray-400" : ""
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
