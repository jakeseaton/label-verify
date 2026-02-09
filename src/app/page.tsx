"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import DropZone from "@/components/DropZone";
import FileCard from "@/components/FileCard";
import SummaryBar from "@/components/SummaryBar";
import PairCard from "@/components/PairCard";
import ResultsSummary from "@/components/ResultsSummary";
import { ProcessedFile, ClassifyResponse, MatchedPair, PairStatus } from "@/lib/types";
import { matchFiles } from "@/lib/matcher";

type AppView = "upload" | "results";

export default function Home() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [pairs, setPairs] = useState<MatchedPair[]>([]);
  const [view, setView] = useState<AppView>("upload");
  const [filter, setFilter] = useState<PairStatus | "all">("all");
  const prevAllExtractedRef = useRef(false);

  const allExtracted = files.length > 0 && files.every(
    (f) => f.status === "extracted" || f.status === "error"
  );
  const hasExtractedFiles = files.some((f) => f.status === "extracted");

  // Auto-trigger matching when all files are done processing
  useEffect(() => {
    if (allExtracted && hasExtractedFiles && !prevAllExtractedRef.current) {
      const matched = matchFiles(files);
      setPairs(matched);
      setView("results");
    }
    prevAllExtractedRef.current = allExtracted;
  }, [allExtracted, hasExtractedFiles, files]);

  const classifyFile = useCallback(async (processedFile: ProcessedFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === processedFile.id ? { ...f, status: "classifying" as const } : f
      )
    );

    try {
      const formData = new FormData();
      formData.append("file", processedFile.file);

      const response = await fetch("/api/classify", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const result: ClassifyResponse = await response.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === processedFile.id
            ? {
                ...f,
                status: "extracted" as const,
                classification: result.classification,
                confidence: result.confidence,
                extractedFields: result.extractedFields,
              }
            : f
        )
      );
    } catch (error) {
      console.error("Classification failed:", error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === processedFile.id
            ? {
                ...f,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Processing failed",
              }
            : f
        )
      );
    }
  }, []);

  const handleFilesAdded = useCallback(
    (newFiles: File[]) => {
      // Reset to upload view if adding more files
      setView("upload");
      setPairs([]);
      prevAllExtractedRef.current = false;

      const processed: ProcessedFile[] = newFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : "",
        status: "uploading" as const,
        classification: "unrecognized" as const,
        extractedFields: {},
        confidence: 0,
      }));

      setFiles((prev) => [...prev, ...processed]);
      processed.forEach((f) => classifyFile(f));
    },
    [classifyFile]
  );

  const handleClearAll = useCallback(() => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFiles([]);
    setPairs([]);
    setView("upload");
    setFilter("all");
    prevAllExtractedRef.current = false;
  }, [files]);

  const handleBackToUpload = useCallback(() => {
    setView("upload");
  }, []);

  const isProcessing = files.some(
    (f) => f.status === "uploading" || f.status === "classifying"
  );

  // Sort files: errors first, then processing, then unrecognized, then extracted
  const sortedFiles = [...files].sort((a, b) => {
    const order = { error: 0, uploading: 1, classifying: 1, extracted: 2 };
    const aOrder = order[a.status];
    const bOrder = order[b.status];
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.status === "extracted" && b.status === "extracted") {
      if (a.classification === "unrecognized" && b.classification !== "unrecognized") return -1;
      if (b.classification === "unrecognized" && a.classification !== "unrecognized") return 1;
    }
    return 0;
  });

  // Sort pairs by severity: unmatched > fail > needs_review > pass
  const sortedPairs = [...pairs].sort((a, b) => {
    const order: Record<PairStatus, number> = { unmatched: 0, fail: 1, needs_review: 2, pass: 3 };
    return order[a.pairStatus] - order[b.pairStatus];
  });

  const filteredPairs = filter === "all"
    ? sortedPairs
    : sortedPairs.filter((p) => p.pairStatus === filter);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              TTB Label Verification
            </h1>
            <p className="text-sm text-gray-500">
              AI-powered alcohol label compliance checker
            </p>
          </div>
          <div className="flex items-center gap-2">
            {view === "results" && (
              <button
                onClick={handleBackToUpload}
                className="text-sm text-gray-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
              >
                ← Add files
              </button>
            )}
            {files.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ===== UPLOAD VIEW ===== */}
        {view === "upload" && (
          <>
            <DropZone onFilesAdded={handleFilesAdded} disabled={false} />
            <SummaryBar files={files} />

            {isProcessing && (
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                <svg className="w-5 h-5 animate-spin text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div>
                  <span className="text-sm text-blue-700 font-medium">
                    Classifying and extracting data...
                  </span>
                  <span className="text-xs text-blue-500 ml-2">
                    {files.filter((f) => f.status === "extracted").length} / {files.length} complete
                  </span>
                </div>
              </div>
            )}

            {sortedFiles.length > 0 && (
              <div className="space-y-3">
                {sortedFiles.map((file) => (
                  <FileCard key={file.id} file={file} />
                ))}
              </div>
            )}

            {files.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <div className="flex justify-center gap-8">
                  <StepIndicator step={1} title="Drop files" desc="Label images + COLA application PDFs" />
                  <StepIndicator step={2} title="AI classifies" desc="Each file identified & data extracted" />
                  <StepIndicator step={3} title="Auto-verify" desc="Pairs matched & fields compared" />
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== RESULTS VIEW ===== */}
        {view === "results" && pairs.length > 0 && (
          <>
            <ResultsSummary pairs={pairs} activeFilter={filter} onFilterChange={setFilter} />

            <div className="space-y-3">
              {filteredPairs.map((pair) => (
                <PairCard key={pair.id} pair={pair} />
              ))}
            </div>

            {filteredPairs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No pairs match the selected filter.</p>
              </div>
            )}

            {/* Add more files */}
            <div className="pt-4">
              <DropZone onFilesAdded={handleFilesAdded} disabled={false} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StepIndicator({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center max-w-[160px]">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 mb-2">
        {step}
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5 text-center">{desc}</p>
    </div>
  );
}
