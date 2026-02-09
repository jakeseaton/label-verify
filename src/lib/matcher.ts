import { ProcessedFile, MatchedPair } from "./types";
import { verifyPair } from "./verify";

/**
 * Normalize a string for fuzzy comparison:
 * lowercase, collapse whitespace, strip punctuation except apostrophes
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Simple similarity score between two strings (0-1).
 * Uses normalized exact match + token overlap for fuzzy cases.
 */
function stringSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1.0;
  if (!na || !nb) return 0;

  // Token overlap (Jaccard-like)
  const tokensA = new Set(na.split(" "));
  const tokensB = new Set(nb.split(" "));
  const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = intersection / union;

  // Also check if one contains the other
  const containsBonus = na.includes(nb) || nb.includes(na) ? 0.2 : 0;

  return Math.min(1, jaccard + containsBonus);
}

/**
 * Extract the numeric ABV percentage from varied formats.
 * "45% Alc./Vol. (90 Proof)" -> 45
 */
function parseAbvNumber(abv: string): number | null {
  const match = abv.match(/([\d.]+)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Extract numeric value from net contents.
 * "750 mL" -> 750, "1 L" -> 1000, "12 fl oz" -> 12
 */
function parseNetContents(nc: string): { value: number; unit: string } | null {
  const match = nc.match(/([\d.]+)\s*(ml|l|fl\s*oz|oz|cl)/i);
  if (!match) return null;
  let value = parseFloat(match[1]);
  let unit = match[2].toLowerCase().replace(/\s/g, "");
  // Normalize to mL
  if (unit === "l") { value *= 1000; unit = "ml"; }
  if (unit === "cl") { value *= 10; unit = "ml"; }
  return { value, unit };
}

/**
 * Compute a match score between a label and an application (0-1).
 * Primary: brand name. Tiebreakers: ABV, class/type, net contents.
 */
function pairScore(label: ProcessedFile, app: ProcessedFile): number {
  const lf = label.extractedFields;
  const af = app.extractedFields;

  // Brand name is primary (weighted 60%)
  const brandScore = lf.brandName && af.brandName
    ? stringSimilarity(lf.brandName, af.brandName)
    : 0;

  // ABV tiebreaker (weighted 15%)
  let abvScore = 0;
  if (lf.abv && af.abv) {
    const lAbv = parseAbvNumber(lf.abv);
    const aAbv = parseAbvNumber(af.abv);
    abvScore = lAbv !== null && aAbv !== null && lAbv === aAbv ? 1.0 : 0;
  }

  // Class/type tiebreaker (weighted 15%)
  const classScore = lf.classType && af.classType
    ? stringSimilarity(lf.classType, af.classType)
    : 0;

  // Net contents tiebreaker (weighted 10%)
  let ncScore = 0;
  if (lf.netContents && af.netContents) {
    const lNc = parseNetContents(lf.netContents);
    const aNc = parseNetContents(af.netContents);
    ncScore = lNc && aNc && lNc.value === aNc.value ? 1.0 : 0;
  }

  return brandScore * 0.6 + abvScore * 0.15 + classScore * 0.15 + ncScore * 0.1;
}

/**
 * Match labels to applications using a greedy best-match approach.
 * Returns matched pairs + unmatched files.
 */
export function matchFiles(files: ProcessedFile[]): MatchedPair[] {
  const labels = files.filter(
    (f) => f.classification === "label" && f.status === "extracted"
  );
  const apps = files.filter(
    (f) => f.classification === "application" && f.status === "extracted"
  );

  const usedLabels = new Set<string>();
  const usedApps = new Set<string>();
  const pairs: MatchedPair[] = [];

  // Build score matrix
  const scores: { label: ProcessedFile; app: ProcessedFile; score: number }[] = [];
  for (const label of labels) {
    for (const app of apps) {
      scores.push({ label, app, score: pairScore(label, app) });
    }
  }

  // Sort by score descending, greedily assign best matches
  scores.sort((a, b) => b.score - a.score);

  for (const { label, app, score } of scores) {
    if (usedLabels.has(label.id) || usedApps.has(app.id)) continue;
    if (score < 0.2) continue; // Too low to be a plausible match

    usedLabels.add(label.id);
    usedApps.add(app.id);

    const verifications = verifyPair(label, app);
    const issueCount = verifications.filter((v) => v.status === "mismatch").length;
    const reviewCount = verifications.filter((v) => v.status === "needs_review").length;

    let pairStatus: MatchedPair["pairStatus"] = "pass";
    if (issueCount > 0) pairStatus = "fail";
    else if (reviewCount > 0) pairStatus = "needs_review";

    pairs.push({
      id: `pair-${label.id}-${app.id}`,
      label,
      application: app,
      pairStatus,
      matchConfidence: score,
      verifications,
      issueCount,
      reviewCount,
    });
  }

  // Add unmatched labels
  for (const label of labels) {
    if (!usedLabels.has(label.id)) {
      pairs.push({
        id: `unmatched-label-${label.id}`,
        label,
        application: undefined,
        pairStatus: "unmatched",
        matchConfidence: 0,
        verifications: [],
        issueCount: 0,
        reviewCount: 0,
      });
    }
  }

  // Add unmatched applications
  for (const app of apps) {
    if (!usedApps.has(app.id)) {
      pairs.push({
        id: `unmatched-app-${app.id}`,
        label: undefined,
        application: app,
        pairStatus: "unmatched",
        matchConfidence: 0,
        verifications: [],
        issueCount: 0,
        reviewCount: 0,
      });
    }
  }

  return pairs;
}

export { parseAbvNumber, parseNetContents, normalize, stringSimilarity };
