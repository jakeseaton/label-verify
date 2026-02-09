# TTB Label Verification

AI-powered alcohol label compliance verification tool for the Alcohol and Tobacco Tax and Trade Bureau (TTB). Agents upload label images and COLA application documents — the system automatically classifies each file, matches labels to applications, and runs field-by-field verification with a traffic-light results view.

Built as a prototype to demonstrate how AI can accelerate the 150,000+ label reviews processed annually by TTB's 47 compliance agents.

## Demo Walkthrough

1. **Drop files** into the upload zone — any mix of label images (JPEG/PNG) and COLA application PDFs
2. **Watch AI classify** each file as "Label" or "Application" with extracted data
3. **Auto-matching** pairs labels to applications by brand name, ABV, class/type
4. **Results view** shows verification status sorted by severity — mismatches first, clean matches last
5. **Click any pair** to expand field-by-field comparison with green/yellow/red/gray indicators
6. **Export CSV** for record-keeping

## Quick Start

### Prerequisites
- Node.js 18+
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com/))

### Install & Run

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and add your API key:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Start the dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test with Sample Data

The `test_data/` directory contains 10 test pairs (10 label PNGs + 10 COLA application PDFs). Drag all 20 files into the drop zone to see the full pipeline in action. See [TEST_VALIDATION.md](./TEST_VALIDATION.md) for expected outcomes per test case.

**Expected results:** 3 Pass, 1 Needs Review, 6 Fail — covering clean matches, ABV mismatches, government warning violations, brand name case variations, class/type mismatches, and net contents discrepancies.

## Deploy to Vercel

The app is configured for one-click Vercel deployment.

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel
```

When prompted, add your `ANTHROPIC_API_KEY` as an environment variable.

### Option B: GitHub Integration

1. Push this repo to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add `ANTHROPIC_API_KEY` in the Environment Variables section
4. Deploy

The `vercel.json` configuration is already included with a 60-second function timeout for the classify API route.

### Production Migration (Azure)

For production deployment within TTB's existing Azure infrastructure:
- The app is a standard Next.js application — deploy to Azure App Service or Azure Static Web Apps
- Only the deployment target changes; no application code modifications needed
- Benefits: existing FedRAMP-certified infrastructure, no new vendor contracts, data governance compliance

## Features

### Core Pipeline
- **Unified drag-and-drop upload** — single drop zone handles 1 to 300+ files
- **AI classification** — Claude Vision identifies each file as Label or Application
- **Structured data extraction** — brand name, class/type, ABV, net contents, producer, address, country of origin, government warning
- **Automatic pair matching** — weighted scoring: brand name (60%), ABV (15%), class/type (15%), net contents (10%)
- **Field-by-field verification** with traffic-light status indicators

### Verification Rules
| Field | Strategy | Example |
|-------|----------|---------|
| Brand Name | Fuzzy, case-insensitive; case-only differences = yellow | "STONE'S THROW" ↔ "Stone's Throw" = Needs Review |
| Class/Type | Case-insensitive; partial containment = yellow | "Bourbon" ↔ "Kentucky Straight Bourbon Whiskey" = Needs Review |
| ABV | Numeric extraction; format differences = green | "40% Alc./Vol." ↔ "40% Alc./Vol. (80 Proof)" = Match |
| Net Contents | Numeric extraction with unit normalization | "750 mL" ↔ "750ml" = Match |
| Gov. Warning | Exact match against statutory text; zero tolerance | Title case header, truncation, altered wording = Mismatch |
| Producer | Fuzzy string matching | Minor formatting differences tolerated |
| Country of Origin | Normalized (strips "Product of", "Made in", etc.) | "Product of France" ↔ "France" = Match |

### Government Warning Verification
The statutory text must appear exactly as:

> **GOVERNMENT WARNING:** (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

Detects: missing warning, title case header, truncated text, altered wording.

### Batch & UX
- **Parallel processing** — up to 5 concurrent API calls with queued overflow
- **Four-stage progress visualization** — Classifying → Extracting → Matching → Verifying
- **Manual override controls** — click classification badges to reclassify; retry failed files
- **CSV export** — full verification results downloadable as spreadsheet
- **Severity-sorted results** — unmatched → fail → needs review → pass
- **Filter chips** — show only specific result types
- **30-second timeout** per API call with automatic error isolation

## Architecture

```
src/
├── app/
│   ├── api/classify/route.ts   # Claude Vision API (classification + extraction)
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Main page (upload → progress → results)
│   └── globals.css              # Tailwind CSS imports
├── components/
│   ├── DropZone.tsx             # Drag-and-drop file upload with validation
│   ├── FileCard.tsx             # Per-file card with reclassify + retry controls
│   ├── PairCard.tsx             # Matched pair with field-by-field verification
│   ├── ProgressPipeline.tsx     # Four-stage progress visualization
│   ├── ResultsSummary.tsx       # Summary bar with filter chips
│   └── SummaryBar.tsx           # File classification counts
└── lib/
    ├── csv-export.ts            # CSV generation and browser download
    ├── matcher.ts               # Pair matching engine (weighted scoring)
    ├── parallel.ts              # Concurrency-limited parallel processor
    ├── types.ts                 # Shared TypeScript types
    └── verify.ts                # Field-by-field verification engine

test_data/                       # 10 test pairs (20 files)
vercel.json                      # Vercel deployment configuration
TEST_VALIDATION.md               # Expected outcomes for all test cases
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router) + React 19 | Single-page app, no navigation |
| Styling | Tailwind CSS 4 | Utility-first, WCAG 2.1 AA colors |
| AI | Claude Sonnet (Anthropic) | Vision API for classification + extraction |
| Backend | Next.js API Routes | Serverless, stateless |
| Hosting | Vercel (prototype) | Free tier; Azure for production |

## Design Decisions

1. **Every upload is a batch.** No separate single-label vs. batch modes. Uploading 2 files and 200 files use the same flow, which streamlines the common case while covering batch processing where the most efficiency is gained.

2. **Unified drop zone, no forms.** Instead of multi-step wizards (upload label → fill form → upload application → verify), agents drop everything in one zone and the AI handles classification, extraction, matching, and verification automatically.

3. **AI handles the nuance.** Pure regex or string matching can't distinguish "STONE'S THROW" vs "Stone's Throw" (stylistic, acceptable) from "Stone's Throw" vs "Stone Throw" (substantive, flag it). Claude Vision handles these judgment calls.

4. **Government warning is strict.** Per stakeholder requirements, the gov warning uses exact text matching against the statutory language — any deviation (title case, truncation, rewording) is flagged as a mismatch.

5. **Client-side matching.** Pair matching and verification run client-side after extraction. Only classification/extraction hits the API. This keeps verification fast and reduces API costs.

## Limitations (Prototype)

- **No persistent storage** — results are lost on page refresh
- **No user authentication** — open access, no role-based permissions
- **No COLA system integration** — agents upload documents manually
- **English labels only** — no multi-language support
- **No image rectification** — angled or distorted photos may reduce extraction accuracy
- **API key required** — each deployment needs an Anthropic API key
- **Not FedRAMP certified** — prototype only; production would use TTB's certified Azure infrastructure

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude Vision |

## License

Prototype — for demonstration and evaluation purposes.
