# TTB Label Verification

AI-powered alcohol label compliance verification tool. Upload label images and COLA application documents — the system classifies each file, extracts structured data, and (in future phases) automatically matches and verifies label-application pairs.

## Current Status: Phase 1

**Working features:**
- Unified drag-and-drop upload zone (accepts any number of files)
- AI-powered file classification (label vs. COLA application) via Claude Vision
- Structured data extraction (brand name, ABV, class/type, net contents, producer info, government warning, etc.)
- Real-time processing status with progress indicators
- Expandable file cards showing extracted fields
- Summary bar with classification counts

## Setup

### Prerequisites
- Node.js 18+
- An Anthropic API key ([get one here](https://console.anthropic.com/))

### Install & Run

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + React + Tailwind CSS
- **Backend:** Next.js API Routes
- **AI:** Claude API (Anthropic) — Vision for classification + extraction
- **Hosting:** Vercel (prototype) — would migrate to Azure for production

## Test Data

The `/test_data` directory contains 10 pairs of test files (10 label PNGs + 10 COLA application PDFs) covering various scenarios including clean matches, ABV mismatches, government warning violations, and brand name case variations. See the Test Case Index PDF for details.

## Architecture

```
src/
├── app/
│   ├── api/classify/route.ts   # Claude Vision API endpoint
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page (unified upload)
│   └── globals.css              # Tailwind CSS
├── components/
│   ├── DropZone.tsx             # Drag-and-drop file upload
│   ├── FileCard.tsx             # Per-file classification + extraction display
│   └── SummaryBar.tsx           # File count summary
└── lib/
    └── types.ts                 # Shared TypeScript types
```

## Roadmap

- **Phase 2:** Pair matching + verification engine (auto-match labels to applications, field-by-field comparison, traffic-light results)
- **Phase 3:** Batch scaling + UX polish (parallel processing, progress viz, CSV export, manual overrides)
- **Phase 4:** Testing, deploy to Vercel, documentation
