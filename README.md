# TTB Label Verification

AI-powered alcohol label compliance verification tool for the Alcohol and Tobacco Tax and Trade Bureau. Upload label images and COLA application documents — the system classifies, matches pairs, and verifies field-by-field compliance automatically.

## Current Status: Phase 3 Complete

### Features
- **Unified drag-and-drop upload** — drop 1 to 300+ files (labels and applications, any mix)
- **AI classification & extraction** — Claude Vision identifies each file and extracts structured data
- **Automatic pair matching** — labels matched to applications by brand name (fuzzy), ABV, class/type, net contents
- **Field-by-field verification** with traffic-light status (green/yellow/red/gray)
- **Government warning deep verification** — exact statutory text match, detects title case, truncation, altered wording
- **Parallel processing** with configurable concurrency (5 concurrent API calls)
- **Four-stage progress visualization** — Classifying → Extracting → Matching → Verifying
- **Manual override controls** — click classification badge to reclassify, retry failed files
- **CSV export** of verification results
- **Severity-sorted results** — unmatched → fail → needs review → pass
- **Filter chips** to show only specific result types
- **Retry with auto-retry** — failed API calls retry once automatically, plus manual retry button
- **30-second timeout** per API call to prevent hanging

### Matching Rules
| Field | Strategy |
|-------|----------|
| Brand Name | Fuzzy, case-insensitive; case-only differences = yellow |
| Class/Type | Case-insensitive; partial containment = yellow |
| ABV | Numeric extraction; format differences with same value = green |
| Net Contents | Numeric extraction with unit normalization |
| Gov. Warning | Exact match against statutory text; zero tolerance |
| Producer | Fuzzy string matching |
| Country of Origin | Normalized (strips "Product of", "Made in", etc.) |

## Setup

```bash
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test Data

The `test_data/` directory contains 10 pairs of test files (10 label PNGs + 10 COLA application PDFs) covering clean matches, ABV mismatches, gov warning violations, brand name case variations, and more.

## Architecture

```
src/
├── app/
│   ├── api/classify/route.ts   # Claude Vision API (classification + extraction)
│   ├── layout.tsx
│   ├── page.tsx                 # Main page (upload → progress → results)
│   └── globals.css
├── components/
│   ├── DropZone.tsx             # Drag-and-drop file upload
│   ├── FileCard.tsx             # Per-file card with reclassify + retry
│   ├── PairCard.tsx             # Matched pair with field-by-field verification
│   ├── ProgressPipeline.tsx     # Four-stage progress visualization
│   ├── ResultsSummary.tsx       # Summary bar with filters + CSV export
│   └── SummaryBar.tsx           # File classification counts
└── lib/
    ├── csv-export.ts            # CSV generation and download
    ├── matcher.ts               # Pair matching engine
    ├── parallel.ts              # Concurrency-limited parallel processor
    ├── types.ts                 # Shared TypeScript types
    └── verify.ts                # Field-by-field verification engine
```

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + React + Tailwind CSS
- **Backend:** Next.js API Routes
- **AI:** Claude Sonnet (Anthropic) — Vision for classification + extraction
- **Hosting:** Vercel free tier (prototype); migrates to Azure for production

## Roadmap

- **Phase 4:** Testing with sample labels, final UX polish, deploy to Vercel, documentation
