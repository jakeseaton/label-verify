import { ProcessedFile, FieldVerification, FieldStatus } from "./types";
import { normalize, parseAbvNumber, parseNetContents, stringSimilarity } from "./matcher";

const GOV_WARNING_TEXT =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

/**
 * Compare brand names with fuzzy, case-insensitive matching.
 * Pure case/capitalization differences = needs_review, not mismatch.
 */
function verifyBrandName(appVal?: string, labelVal?: string): FieldVerification {
  const base = { field: "brandName", label: "Brand Name", appValue: appVal, labelValue: labelVal };

  if (!labelVal) return { ...base, status: "not_found", explanation: "Brand name not found on label" };
  if (!appVal) return { ...base, status: "not_found", explanation: "Brand name not in application" };

  const normApp = normalize(appVal);
  const normLabel = normalize(labelVal);

  if (normApp === normLabel) {
    // Check if they differ only in case
    if (appVal !== labelVal) {
      return { ...base, status: "needs_review", explanation: "Matches but with different capitalization" };
    }
    return { ...base, status: "match" };
  }

  const sim = stringSimilarity(appVal, labelVal);
  if (sim >= 0.8) {
    return { ...base, status: "needs_review", explanation: "Very similar but not identical" };
  }

  return { ...base, status: "mismatch", explanation: "Brand names do not match" };
}

/**
 * Compare class/type with case-insensitive matching.
 * Partial containment (e.g. "Bourbon" in "Kentucky Straight Bourbon Whiskey") = needs_review.
 */
function verifyClassType(appVal?: string, labelVal?: string): FieldVerification {
  const base = { field: "classType", label: "Class / Type", appValue: appVal, labelValue: labelVal };

  if (!labelVal) return { ...base, status: "not_found", explanation: "Class/type not found on label" };
  if (!appVal) return { ...base, status: "not_found", explanation: "Class/type not in application" };

  const normApp = normalize(appVal);
  const normLabel = normalize(labelVal);

  if (normApp === normLabel) return { ...base, status: "match" };

  // Check containment (one is a substring of the other)
  if (normApp.includes(normLabel) || normLabel.includes(normApp)) {
    return { ...base, status: "needs_review", explanation: "One value contains the other — may be a more specific designation" };
  }

  const sim = stringSimilarity(appVal, labelVal);
  if (sim >= 0.6) {
    return { ...base, status: "needs_review", explanation: "Similar class/type but not identical" };
  }

  return { ...base, status: "mismatch", explanation: "Class/type does not match" };
}

/**
 * Compare ABV by extracting numeric percentage.
 * Format differences with same value = match.
 */
function verifyAbv(appVal?: string, labelVal?: string): FieldVerification {
  const base = { field: "abv", label: "Alcohol Content", appValue: appVal, labelValue: labelVal };

  if (!labelVal) return { ...base, status: "not_found", explanation: "ABV not found on label" };
  if (!appVal) return { ...base, status: "not_found", explanation: "ABV not in application" };

  const appNum = parseAbvNumber(appVal);
  const labelNum = parseAbvNumber(labelVal);

  if (appNum === null || labelNum === null) {
    return { ...base, status: "needs_review", explanation: "Could not parse numeric ABV from one or both values" };
  }

  if (appNum === labelNum) return { ...base, status: "match" };

  return {
    ...base,
    status: "mismatch",
    explanation: `ABV mismatch: application says ${appNum}%, label says ${labelNum}%`,
  };
}

/**
 * Compare net contents by extracting numeric value with unit normalization.
 */
function verifyNetContents(appVal?: string, labelVal?: string): FieldVerification {
  const base = { field: "netContents", label: "Net Contents", appValue: appVal, labelValue: labelVal };

  if (!labelVal) return { ...base, status: "not_found", explanation: "Net contents not found on label" };
  if (!appVal) return { ...base, status: "not_found", explanation: "Net contents not in application" };

  const appParsed = parseNetContents(appVal);
  const labelParsed = parseNetContents(labelVal);

  if (!appParsed || !labelParsed) {
    return { ...base, status: "needs_review", explanation: "Could not parse net contents from one or both values" };
  }

  if (appParsed.value === labelParsed.value) return { ...base, status: "match" };

  return {
    ...base,
    status: "mismatch",
    explanation: `Net contents mismatch: application says ${appVal}, label says ${labelVal}`,
  };
}

/**
 * Verify government warning against the exact statutory text.
 * Zero tolerance for wording changes. Header must be all caps.
 */
function verifyGovWarning(labelVal?: string): FieldVerification {
  const base = {
    field: "governmentWarning",
    label: "Government Warning",
    appValue: "(Required by law)",
    labelValue: labelVal,
  };

  if (!labelVal) {
    return { ...base, status: "mismatch", explanation: "Government warning is missing from label — required on all alcohol beverages" };
  }

  // Normalize whitespace for comparison
  const normLabel = labelVal.replace(/\s+/g, " ").trim();
  const normRequired = GOV_WARNING_TEXT.replace(/\s+/g, " ").trim();

  if (normLabel === normRequired) {
    return { ...base, status: "match" };
  }

  // Check specific violations
  const violations: string[] = [];

  // Check header capitalization
  if (normLabel.startsWith("Government Warning:") && !normLabel.startsWith("GOVERNMENT WARNING:")) {
    violations.push("Header uses title case instead of required all caps");
  }

  // Check if it's truncated
  if (normLabel.length < normRequired.length * 0.8 && normLabel.length > 20) {
    violations.push("Warning text appears to be truncated");
  }

  // Check for altered wording (has the header but body differs)
  if (normLabel.toUpperCase().startsWith("GOVERNMENT WARNING:")) {
    const labelBody = normLabel.slice(normLabel.indexOf(":") + 1).trim().toLowerCase();
    const requiredBody = normRequired.slice(normRequired.indexOf(":") + 1).trim().toLowerCase();
    if (labelBody !== requiredBody) {
      violations.push("Warning text wording differs from required statutory text");
    }
  }

  const explanation = violations.length > 0
    ? violations.join("; ")
    : "Government warning does not match required text";

  return { ...base, status: "mismatch", explanation };
}

/**
 * Compare producer/bottler name with fuzzy matching.
 */
function verifyProducer(appVal?: string, labelVal?: string): FieldVerification {
  const base = { field: "producerName", label: "Producer", appValue: appVal, labelValue: labelVal };

  if (!labelVal) return { ...base, status: "not_found", explanation: "Producer not found on label" };
  if (!appVal) return { ...base, status: "not_found", explanation: "Producer not in application" };

  const sim = stringSimilarity(appVal, labelVal);
  if (sim >= 0.9) return { ...base, status: "match" };
  if (sim >= 0.6) return { ...base, status: "needs_review", explanation: "Producer names are similar but not identical" };

  return { ...base, status: "mismatch", explanation: "Producer names do not match" };
}

/**
 * Compare country of origin with normalization for common label phrasing.
 */
function normalizeOrigin(s: string): string {
  return normalize(s)
    .replace(/^(product of|made in|imported from|produced in)\s+/, "")
    .trim();
}

function verifyOrigin(appVal?: string, labelVal?: string): FieldVerification {
  const base = { field: "countryOfOrigin", label: "Country of Origin", appValue: appVal, labelValue: labelVal };

  if (!appVal && !labelVal) return { ...base, status: "match", explanation: "Not applicable (domestic product)" };
  if (!labelVal && appVal) return { ...base, status: "needs_review", explanation: "Country of origin in application but not found on label" };
  if (!appVal && labelVal) return { ...base, status: "needs_review", explanation: "Country of origin on label but not in application" };

  if (normalizeOrigin(appVal!) === normalizeOrigin(labelVal!)) return { ...base, status: "match" };

  return { ...base, status: "mismatch", explanation: "Country of origin does not match" };
}

/**
 * Run all field verifications for a matched label-application pair.
 */
export function verifyPair(label: ProcessedFile, app: ProcessedFile): FieldVerification[] {
  const lf = label.extractedFields;
  const af = app.extractedFields;

  return [
    verifyBrandName(af.brandName, lf.brandName),
    verifyClassType(af.classType, lf.classType),
    verifyAbv(af.abv, lf.abv),
    verifyNetContents(af.netContents, lf.netContents),
    verifyGovWarning(lf.governmentWarning),
    verifyProducer(af.producerName, lf.producerName),
    verifyOrigin(af.countryOfOrigin, lf.countryOfOrigin),
  ];
}
