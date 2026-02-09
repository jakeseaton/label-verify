import { MatchedPair } from "./types";

/**
 * Generate a CSV string from verification results.
 */
export function exportResultsCsv(pairs: MatchedPair[]): string {
  const headers = [
    "Pair Status",
    "Match Confidence",
    "Label File",
    "Application File",
    "Brand Name (App)",
    "Brand Name (Label)",
    "Brand Status",
    "Class/Type (App)",
    "Class/Type (Label)",
    "Class/Type Status",
    "ABV (App)",
    "ABV (Label)",
    "ABV Status",
    "Net Contents (App)",
    "Net Contents (Label)",
    "Net Contents Status",
    "Gov Warning Status",
    "Gov Warning Detail",
    "Producer (App)",
    "Producer (Label)",
    "Producer Status",
    "Origin (App)",
    "Origin (Label)",
    "Origin Status",
    "Total Mismatches",
    "Total Needs Review",
  ];

  const rows = pairs.map((pair) => {
    const vMap = new Map(pair.verifications.map((v) => [v.field, v]));
    const get = (field: string) => vMap.get(field);

    return [
      pair.pairStatus,
      pair.matchConfidence.toFixed(2),
      pair.label?.file.name ?? "(none)",
      pair.application?.file.name ?? "(none)",
      get("brandName")?.appValue ?? "",
      get("brandName")?.labelValue ?? "",
      get("brandName")?.status ?? "",
      get("classType")?.appValue ?? "",
      get("classType")?.labelValue ?? "",
      get("classType")?.status ?? "",
      get("abv")?.appValue ?? "",
      get("abv")?.labelValue ?? "",
      get("abv")?.status ?? "",
      get("netContents")?.appValue ?? "",
      get("netContents")?.labelValue ?? "",
      get("netContents")?.status ?? "",
      get("governmentWarning")?.status ?? "",
      get("governmentWarning")?.explanation ?? "",
      get("producerName")?.appValue ?? "",
      get("producerName")?.labelValue ?? "",
      get("producerName")?.status ?? "",
      get("countryOfOrigin")?.appValue ?? "",
      get("countryOfOrigin")?.labelValue ?? "",
      get("countryOfOrigin")?.status ?? "",
      pair.issueCount.toString(),
      pair.reviewCount.toString(),
    ];
  });

  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [headers, ...rows].map((row) => row.map(escape).join(","));
  return lines.join("\n");
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCsv(pairs: MatchedPair[], filename: string = "ttb-verification-results.csv") {
  const csv = exportResultsCsv(pairs);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
