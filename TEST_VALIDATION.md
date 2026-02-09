# Test Validation Guide

This document describes the 10 test case pairs in `test_data/` and their expected verification outcomes. Use this to validate the system is working correctly.

## How to Test

1. Start the app: `npm run dev`
2. Open http://localhost:3000
3. Drag all 20 files from `test_data/` into the drop zone (or test individual pairs)
4. Wait for classification → matching → verification to complete
5. Compare results against the expected outcomes below

## Test Cases

### TC-01: Clean Match — Bourbon
**Files:** `COLA_Application_01_clean_match_bourbon.pdf` + `Label_01_clean_match_bourbon.png`
**Expected pair status:** ✅ Pass
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | ✅ Match | "OLD TOM DISTILLERY" |
| Class/Type | ✅ Match | "Kentucky Straight Bourbon Whiskey" |
| ABV | ✅ Match | "45% Alc./Vol. (90 Proof)" |
| Net Contents | ✅ Match | "750 mL" |
| Gov. Warning | ✅ Match | Full statutory text present |
| Producer | ✅ Match | "Old Tom Distillery Co." |
| Origin | ✅ Match | "United States" |

---

### TC-02: Clean Match — French Wine
**Files:** `COLA_Application_02_clean_match_wine.pdf` + `Label_02_clean_match_wine.png`
**Expected pair status:** ✅ Pass
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | ✅ Match | "CHATEAU BELLE ROCHE" |
| Class/Type | ✅ Match | "Red Table Wine" |
| ABV | ✅ Match | "13.5% Alc./Vol." |
| Net Contents | ✅ Match | "750 mL" |
| Gov. Warning | ✅ Match | Full statutory text present |
| Producer | ✅ Match | "Chateau Belle Roche SARL" |
| Origin | ✅ Match | "France" / "Product of France" (normalized) |

---

### TC-03: Brand Name Case Variation
**Files:** `COLA_Application_03_case_variation_beer.pdf` + `Label_03_case_variation_beer.png`
**Expected pair status:** 🟡 Needs Review
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | 🟡 Needs Review | App: "Stone's Throw" vs Label: "STONE'S THROW" — case difference only |
| Class/Type | ✅ Match | "American Pale Ale" |
| ABV | ✅ Match | "5.8% Alc./Vol." |
| Net Contents | ✅ Match | "12 fl oz" |
| Gov. Warning | ✅ Match | Full statutory text present |
| Producer | ✅ Match | "Stone's Throw Brewing Co." |
| Origin | ✅ Match | "United States" |

---

### TC-04: ABV Mismatch
**Files:** `COLA_Application_04_abv_mismatch.pdf` + `Label_04_abv_mismatch.png`
**Expected pair status:** ❌ Fail
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | ✅ Match | "COPPER RIDGE" |
| Class/Type | ✅ Match | "Chardonnay" |
| ABV | ❌ Mismatch | App: "13.0%" vs Label: "14.5%" |
| Net Contents | ✅ Match | "750 mL" |
| Gov. Warning | ✅ Match | Full statutory text present |
| Producer | ✅ Match | "Copper Ridge Vineyards LLC" |
| Origin | ✅ Match | "United States" |

---

### TC-05: Government Warning — Title Case Header
**Files:** `COLA_Application_05_gov_warning_title_case.pdf` + `Label_05_gov_warning_title_case.png`
**Expected pair status:** ❌ Fail
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | ✅ Match | "HIGHLAND CREEK" |
| Class/Type | ✅ Match | "Blended Scotch Whisky" |
| ABV | ✅ Match | "40% Alc./Vol. (80 Proof)" |
| Net Contents | ✅ Match | "750 mL" |
| Gov. Warning | ❌ Mismatch | "Government Warning:" instead of "GOVERNMENT WARNING:" |
| Producer | ✅ Match | "Highland Creek Distillers Ltd." |
| Origin | ✅ Match | "United Kingdom" |

---

### TC-06: Government Warning Missing
**Files:** `COLA_Application_06_gov_warning_missing.pdf` + `Label_06_gov_warning_missing.png`
**Expected pair status:** ❌ Fail
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | ✅ Match | "PACIFIC CREST" |
| Class/Type | ✅ Match | "India Pale Ale" |
| ABV | ✅ Match | "6.7% Alc./Vol." |
| Net Contents | ✅ Match | "16 fl oz" |
| Gov. Warning | ❌ Mismatch | Warning entirely absent from label |
| Producer | ✅ Match | "Pacific Crest Brewing Inc." |
| Origin | ✅ Match | "United States" |

---

### TC-07: ABV Format Variation (Same Value)
**Files:** `COLA_Application_07_abv_format_variation.pdf` + `Label_07_abv_format_variation.png`
**Expected pair status:** ✅ Pass
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | ✅ Match | "SILVER CANYON" |
| Class/Type | ✅ Match | "Vodka" |
| ABV | ✅ Match | App: "40% Alc./Vol." vs Label: "40% Alc./Vol. (80 Proof)" — same numeric value |
| Net Contents | ✅ Match | "1 L" |
| Gov. Warning | ✅ Match | Full statutory text present |
| Producer | ✅ Match | "Silver Canyon Spirits Corp." |
| Origin | ✅ Match | "United States" |

---

### TC-08: Class/Type Mismatch
**Files:** `COLA_Application_08_class_type_mismatch.pdf` + `Label_08_class_type_mismatch.png`
**Expected pair status:** ❌ Fail
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | ✅ Match | "CASA DEL SOL" |
| Class/Type | ❌ Mismatch | App: "Tequila" vs Label: "Mezcal" |
| ABV | ✅ Match | "40% Alc./Vol. (80 Proof)" |
| Net Contents | ✅ Match | "750 mL" |
| Gov. Warning | ✅ Match | Full statutory text present |
| Producer | ✅ Match | "Casa del Sol Destileria S.A. de C.V." |
| Origin | ✅ Match | "Mexico" |

---

### TC-09: Net Contents Mismatch
**Files:** `COLA_Application_09_net_contents_mismatch.pdf` + `Label_09_net_contents_mismatch.png`
**Expected pair status:** ❌ Fail
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | ✅ Match | "AMBER HILL" |
| Class/Type | ✅ Match | "Single Malt Scotch Whisky" |
| ABV | ✅ Match | "43% Alc./Vol. (86 Proof)" |
| Net Contents | ❌ Mismatch | App: "750 mL" vs Label: "375 mL" |
| Gov. Warning | ✅ Match | Full statutory text present |
| Producer | ✅ Match | "Amber Hill Distillery Ltd." |
| Origin | ✅ Match | "United Kingdom" |

---

### TC-10: Multiple Issues
**Files:** `COLA_Application_10_multiple_issues.pdf` + `Label_10_multiple_issues.png`
**Expected pair status:** ❌ Fail
**Expected field results:**
| Field | Status | Notes |
|-------|--------|-------|
| Brand Name | 🟡 Needs Review | App: "Rosewood Cellars" vs Label: "ROSEWOOD CELLARS" — case only |
| Class/Type | ✅ Match | "Cabernet Sauvignon" |
| ABV | ✅ Match | "14.2% Alc./Vol." |
| Net Contents | ✅ Match | "750 mL" |
| Gov. Warning | ❌ Mismatch | Warning truncated — missing second clause |
| Producer | ✅ Match | "Rosewood Cellars Winery" |
| Origin | ✅ Match | "United States" |

---

## Summary of Expected Results

| Test Case | Expected Status | Key Issue |
|-----------|----------------|-----------|
| TC-01 | ✅ Pass | Clean match |
| TC-02 | ✅ Pass | Clean match (import) |
| TC-03 | 🟡 Needs Review | Brand name case variation |
| TC-04 | ❌ Fail | ABV mismatch (13% vs 14.5%) |
| TC-05 | ❌ Fail | Gov warning title case |
| TC-06 | ❌ Fail | Gov warning missing |
| TC-07 | ✅ Pass | ABV format variation (same value) |
| TC-08 | ❌ Fail | Class/type mismatch (Tequila vs Mezcal) |
| TC-09 | ❌ Fail | Net contents mismatch (750 vs 375 mL) |
| TC-10 | ❌ Fail | Brand case + truncated gov warning |

**Totals:** 3 Pass, 1 Needs Review, 6 Fail

## Notes

- Results depend on Claude's extraction accuracy. Minor variations in how Claude reads text from images (e.g., extra spaces, slightly different formatting) may cause some fields to show as "Needs Review" instead of "Match" or vice versa.
- The government warning verification is strict by design (per stakeholder requirements). Any deviation from the exact statutory text flags as a mismatch.
- Country of origin matching normalizes phrases like "Product of France" to "France" before comparing.
