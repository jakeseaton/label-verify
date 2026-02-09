"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import DropZone from "@/components/DropZone";
import FileCard from "@/components/FileCard";
import SummaryBar from "@/components/SummaryBar";
import PairCard from "@/components/PairCard";
import ResultsSummary from "@/components/ResultsSummary";
import ProgressPipeline, { PipelineStage } from "@/components/ProgressPipeline";
import {
  ProcessedFile,
  ClassifyResponse,
  MatchedPair,
  PairStatus,
  FileClassification,
} from "@/lib/types";
import { downloadCsv } from "@/lib/csv-export";
import { matchFiles } from "@/lib/matcher";

const CONCURRENCY = 5;

type AppView = "upload" | "results";

export default function Home() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [pairs, setPairs] = useState<MatchedPair[]>([]);
  const [view, setView] = useState<AppView>("upload");
  const [filter, setFilter] = useState<PairStatus | "all">("all");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("classifying");
  const activeRequestsRef = useRef(0);
  const queueRef = useRef<ProcessedFile[]>([]);
  const hasTriggeredResults = useRef(false);

  // Derived state
  const filesProcessed = files.filter(
    (f) => f.status === "extracted" || f.status === "error"
  ).length;
  const filesErrored = files.filter((f) => f.status === "error").length;
  const isProcessing = files.some(
    (f) => f.status === "uploading" || f.status === "classifying"
  );
  const allDone =
    files.length > 0 &&
    files.every((f) => f.status === "extracted" || f.status === "error");
  const hasExtractedFiles = files.some((f) => f.status === "extracted");

  // --- Pipeline stage tracking ---
  useEffect(() => {
    if (files.length === 0) return;
    if (allDone && hasExtractedFiles) {
      setPipelineStage("complete");
    } else if (isProcessing) {
      setPipelineStage("classifying");
    }
  }, [files, allDone, hasExtractedFiles, isProcessing]);

  // --- Auto-trigger matching & switch to results when all done ---
  useEffect(() => {
    if (allDone && hasExtractedFiles && !hasTriggeredResults.current) {
      hasTriggeredResults.current = true;
      setPipelineStage("matching");

      // Small delay so the user sees the matching/verifying stages
      setTimeout(() => {
        setPipelineStage("verifying");
        setTimeout(() => {
          const matched = matchFiles(files);
          setPairs(matched);
          setPipelineStage("complete");
          setView("results");
        }, 300);
      }, 400);
    }
  }, [allDone, hasExtractedFiles, files]);

  // --- Classify a single file via API ---
  const classifyFile = useCallback(async (processedFile: ProcessedFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === processedFile.id
          ? { ...f, status: "classifying" as const }
          : f
      )
    );

    try {
      const formData = new FormData();
      formData.append("file", processedFile.file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/api/classify", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
      console.error(`Classification failed for ${processedFile.file.name}:`, error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === processedFile.id
            ? {
                ...f,
                status: "error" as const,
                error:
                  error instanceof Error
                    ? error.name === "AbortError"
                      ? "Request timed out"
                      : error.message
                    : "Processing failed",
              }
            : f
        )
      );
    }
  }, []);

  // --- Concurrency-limited queue processor ---
  const processQueue = useCallback(() => {
    while (
      queueRef.current.length > 0 &&
      activeRequestsRef.current < CONCURRENCY
    ) {
      const next = queueRef.current.shift()!;
      activeRequestsRef.current++;
      classifyFile(next).finally(() => {
        activeRequestsRef.current--;
        processQueue();
      });
    }
  }, [classifyFile]);

  // --- Handle new file uploads ---
  const handleFilesAdded = useCallback(
    (newFiles: File[]) => {
      // Reset results state when adding new files
      if (view === "results") {
        setView("upload");
      }
      setPairs([]);
      hasTriggeredResults.current = false;
      setPipelineStage("classifying");

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

      // Add to queue and start processing
      queueRef.current.push(...processed);
      processQueue();
    },
    [processQueue, view]
  );

  // --- Manual reclassification ---
  const handleReclassify = useCallback(
    (fileId: string, newClassification: FileClassification) => {
      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === fileId ? { ...f, classification: newClassification } : f
        );
        // Re-run matching with updated classifications
        const allExtracted = updated.every(
          (f) => f.status === "extracted" || f.status === "error"
        );
        if (allExtracted) {
          const matched = matchFiles(updated);
          setPairs(matched);
        }
        return updated;
      });
    },
    []
  );

  // --- Retry failed file ---
  const handleRetry = useCallback(
    (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      hasTriggeredResults.current = false;
      setPipelineStage("classifying");

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "uploading" as const, error: undefined }
            : f
        )
      );

      queueRef.current.push(file);
      processQueue();
    },
    [files, processQueue]
  );

  // --- Clear all ---
  const handleClearAll = useCallback(() => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    queueRef.current = [];
    setFiles([]);
    setPairs([]);
    setView("upload");
    setFilter("all");
    setPipelineStage("classifying");
    hasTriggeredResults.current = false;
  }, [files]);

  // --- Sorting ---
  const sortedFiles = [...files].sort((a, b) => {
    const order = { error: 0, uploading: 1, classifying: 1, extracted: 2 };
    if (order[a.status] !== order[b.status])
      return order[a.status] - order[b.status];
    if (a.status === "extracted" && b.status === "extracted") {
      if (
        a.classification === "unrecognized" &&
        b.classification !== "unrecognized"
      )
        return -1;
      if (
        b.classification === "unrecognized" &&
        a.classification !== "unrecognized"
      )
        return 1;
    }
    return 0;
  });

  const sortedPairs = [...pairs].sort((a, b) => {
    const order: Record<PairStatus, number> = {
      unmatched: 0,
      fail: 1,
      needs_review: 2,
      pass: 3,
    };
    return order[a.pairStatus] - order[b.pairStatus];
  });

  const filteredPairs =
    filter === "all"
      ? sortedPairs
      : sortedPairs.filter((p) => p.pairStatus === filter);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
                onClick={() => setView("upload")}
                className="text-sm text-gray-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
              >
                ← View files
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

            {/* Progress pipeline */}
            {isProcessing && files.length > 0 && (
              <ProgressPipeline
                stage={pipelineStage}
                filesTotal={files.length}
                filesProcessed={filesProcessed}
                filesErrored={filesErrored}
              />
            )}

            {/* File list */}
            {sortedFiles.length > 0 && (
              <div className="space-y-3">
                {sortedFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onReclassify={handleReclassify}
                    onRetry={handleRetry}
                  />
                ))}
              </div>
            )}

            {/* View results button — shown when processing is done and results exist */}
            {allDone && hasExtractedFiles && pairs.length > 0 && (
              <div className="text-center">
                <button
                  onClick={() => setView("results")}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm"
                >
                  View verification results →
                </button>
              </div>
            )}

            {/* Empty state */}
            {files.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <div className="flex justify-center gap-8">
                  <StepIndicator
                    step={1}
                    title="Drop files"
                    desc="Label images + COLA application PDFs"
                  />
                  <StepIndicator
                    step={2}
                    title="AI classifies"
                    desc="Each file identified & data extracted"
                  />
                  <StepIndicator
                    step={3}
                    title="Auto-verify"
                    desc="Pairs matched & fields compared"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== RESULTS VIEW ===== */}
        {view === "results" && pairs.length > 0 && (
          <>
            <ResultsSummary
              pairs={pairs}
              activeFilter={filter}
              onFilterChange={setFilter}
            />

            {/* Export button */}
            <div className="flex justify-end">
              <button
                onClick={() => downloadCsv(pairs)}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>

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

            {/* Drop zone at bottom of results for adding more files */}
            <div className="pt-4">
              <DropZone onFilesAdded={handleFilesAdded} disabled={false} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StepIndicator({
  step,
  title,
  desc,
}: {
  step: number;
  title: string;
  desc: string;
}) {
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
