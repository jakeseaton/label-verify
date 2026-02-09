# Technical Specification: AI-Powered Alcohol Label Verification App

**Prototype Solution Specification**
TTB Compliance Division
DRAFT | February 2026

---

## 1. Executive Summary

This document defines the technical specification for a standalone, AI-powered prototype that automates the routine verification steps in TTB alcohol label compliance review. Agents upload any number of files — label images and COLA application documents, in any combination — into a single drop zone. The system uses AI to classify each file, extract structured data, automatically match labels to their corresponding applications, and produce a verification report flagging matches, mismatches, and missing elements.

The prototype is scoped as a proof-of-concept to demonstrate value and inform future procurement decisions. It does not integrate with the existing COLA system.

### 1.1 Key Constraints from Discovery

| Constraint | Requirement |
|------------|-------------|
| Performance | Results in ~5 seconds or less per label (Sarah Chen) |
| Usability | Extremely simple UI; accessible to non-technical agents aged 50+ (Sarah Chen) |
| Batch Processing | Support upload of 200–300 labels at once for peak-season importers (Sarah Chen / Janet). Single and batch workflows should be unified. |
| Fuzzy Matching | Handle case-insensitive and stylistic variations (e.g. "STONE'S THROW" vs "Stone's Throw") without false-flagging (Dave Morrison) |
| Warning Precision | Government Warning must be exact: word-for-word, all-caps bold header, correct font size (Jenny Park) |
| Standalone | No COLA integration; no PII storage; standard web deployment (Marcus Williams) |

---

## 2. Architecture Overview

The application follows a clean three-tier architecture designed for simplicity, speed, and deployability.

### 2.1 Proposed Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js (React) + Tailwind CSS | Fast to build; SSR for performance; accessible component patterns |
| Backend / API | Next.js API Routes (Node.js) | Unified deployment; serverless-friendly; simple routing |
| OCR | Google Cloud Vision API or Claude Vision | High accuracy on curved/angled labels; fast response times; handles glare and poor lighting |
| AI / Verification | Claude API (Anthropic) | File classification, structured extraction from both labels and COLA applications, intelligent fuzzy matching, and pair-matching logic |
| Hosting | Vercel (free Hobby tier) | Zero-config deployment; free tier sufficient for prototype-scale usage. See Section 8.1 for production migration path. |
| Storage | None (stateless) or Vercel Blob for temp batch files | No PII retention requirement; simplifies compliance |

### 2.2 System Flow

The application uses a unified upload model. Whether an agent is verifying one label or three hundred, the flow is the same:

1. **Upload:** Agent drops any number of files into a single drop zone — label images, COLA application documents (PDF or image), or a mix of both.
2. **Classification:** Each file is sent to Claude Vision, which classifies it as either a "label" or a "COLA application" and extracts structured data (brand name, ABV, class/type, etc.) from each.
3. **Pair Matching:** The system matches each label to its corresponding COLA application based on extracted field similarity (primarily brand name, then ABV and class/type as tiebreakers).
4. **Verification:** For each matched pair, every field is compared using field-specific matching rules (see Section 4). Government warning is validated against the exact statutory text.
5. **Results:** A results list displays all pairs sorted by severity: unmatched files and mismatches at the top, needs-review in the middle, clean matches at the bottom. The agent reviews exceptions and is done.

This design collapses what was previously separate single-label and batch workflows into one unified experience. Uploading two files works the same as uploading two hundred.

---

## 3. Feature Specification

### 3.1 Unified Upload

The entire application centers on a single, prominent drop zone. There are no separate modes for single-label vs. batch processing — the system handles any volume through the same interface.

#### 3.1.1 Drop Zone

- One large, visually prominent drag-and-drop area with a clear "Drop files here" label and a fallback "Browse files" button
- Accepts any number of files in a single drop (1 file, 2 files, or 300 files)
- Accepted formats: JPEG, PNG, WebP, PDF (for COLA application documents)
- Max file size: 10 MB per file
- Files appear as thumbnails/chips immediately after upload with a "Processing..." indicator
- Agent can add more files after the initial drop without restarting
- A "Clear All" button removes all files and resets the view

#### 3.1.2 AI Classification

As files are uploaded, each one is sent to Claude Vision for classification and extraction:

- **Classification:** The AI determines whether each file is a label image or a COLA application document. Labels are product artwork on bottles/cans; COLA applications are structured government forms.
- **Extraction:** Regardless of type, the AI extracts structured fields: brand name, class/type, ABV, net contents, producer/bottler info, country of origin, and beverage type.
- **Confidence indicator:** Each classified file shows a tag (e.g., "Label" or "Application") so the agent can see at a glance what the system identified. A "⚠ Unrecognized" tag appears if the AI cannot confidently classify a file.
- **Override:** The agent can manually reclassify a file if the AI gets it wrong (e.g., click a chip and toggle between "Label" and "Application").

#### 3.1.3 Automatic Pair Matching

Once files are classified and extracted, the system matches each label to its corresponding COLA application:

- **Primary match key:** Brand name (fuzzy, case-insensitive).
- **Tiebreakers:** ABV, class/type, and net contents used to disambiguate when multiple files share similar brand names.
- **Match confidence:** Each pair is assigned a confidence level. High-confidence matches proceed automatically. Low-confidence matches are flagged for the agent to confirm.
- **Unmatched files:** Any label without a matching application (or vice versa) is surfaced prominently so the agent can add the missing counterpart or verify manually.

#### 3.1.4 Results View

The results view is a sorted list of matched pairs, prioritized so the agent spends time only where it matters:

**Sort order (top to bottom):**

1. **Unmatched files** — labels or applications with no counterpart found
2. **Mismatches (red)** — matched pairs with one or more field-level mismatches
3. **Needs Review (yellow)** — matched pairs with low-confidence matches or stylistic variations
4. **Clean matches (green)** — all fields verified, no issues found

Each pair row shows: label thumbnail, application thumbnail, brand name, overall status, and a count of issues. Clicking a row expands the full field-by-field verification report using the traffic-light system:

- **🟢 Green / Match:** Extracted value matches application data.
- **🟡 Yellow / Needs Review:** Possible match but with variations (e.g., capitalization difference). Shows both values for agent to decide.
- **🔴 Red / Mismatch:** Clear mismatch or required field missing from label.
- **⚪ Gray / Not Found:** OCR could not confidently extract this field. Agent should verify manually.

Additional results view features:

- Summary bar at top: total pairs, pass count, fail count, needs-review count, unmatched count
- Filter buttons to show only mismatches, only needs-review, etc.
- Export results as CSV for record-keeping
- Within an expanded pair, the agent can edit the application-side values and re-run verification for that pair if the AI parsed something incorrectly

### 3.2 Government Warning Verification

This gets its own section because it has stricter requirements than other fields (per Jenny Park). The government health warning must be validated against the exact statutory text:

> **"GOVERNMENT WARNING:** (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems."

Verification checks:

- **Exact text match:** Word-for-word comparison of the full warning statement.
- **Header formatting:** "GOVERNMENT WARNING:" must be in all caps and bold.
- **Presence check:** Flag if the warning is entirely absent.
- **Common violations flagged:** Title case instead of all caps, missing bold, altered wording, truncated text.

### 3.3 Processing Pipeline

Files are processed in parallel to maximize throughput, especially for large batch uploads:

- Classification and extraction run concurrently across all uploaded files (up to a concurrency limit based on API rate limits)
- Pair matching begins as soon as at least one label and one application have been extracted
- Real-time progress visualization with four stages: "Classifying files → Extracting data → Matching pairs → Verifying labels"
- Processing continues if individual files fail; errors are surfaced per-file rather than blocking the entire batch
- For large batches (50+ files), a progress bar shows completed/total count

---

## 4. Verification & Matching Logic

The matching engine is the core intelligence of the application. Different fields require different matching strategies to avoid the false-positive problem Dave Morrison described.

| Field | Matching Strategy | Notes |
|-------|------------------|-------|
| Brand Name | Case-insensitive fuzzy match; ignore stylistic differences (all-caps vs title case). Flag only semantic differences. | "STONE'S THROW" vs "Stone's Throw" = Match. "Stone's Throw" vs "Stone Throw" = Mismatch. |
| Class/Type | Case-insensitive match with known synonym normalization. | E.g., "Bourbon" and "Kentucky Straight Bourbon Whiskey" should be flagged as needs-review, not outright mismatch. |
| ABV | Numeric extraction and comparison. Parse percentage value from varied formats. | "45% Alc./Vol. (90 Proof)" and "45%" = Match. "45%" vs "40%" = Mismatch. |
| Net Contents | Numeric extraction with unit normalization. | "750 mL" and "750ml" = Match. |
| Gov. Warning | Exact string match against statutory text. Format checks for caps + bold header. | Zero tolerance for wording changes. Any deviation is a mismatch. |
| Producer Info | Fuzzy address matching with normalization (St./Street, abbreviations). | Must match entity name; address can have minor format variation. |

The AI layer (Claude) handles the nuanced judgment calls, such as distinguishing stylistic differences from substantive ones, which is the key gap that pure regex or string matching cannot fill.

---

## 5. UX Design Principles

Guided by Sarah Chen's directive that the tool should be usable by someone with minimal tech experience, the UI follows these principles:

### 5.1 Layout

- **Single-page application:** No navigation, no modes to switch between. Drop files, see results.
- **One drop zone, one action:** The upload area dominates the initial view. After files are processed, the results list takes over. No multi-step wizards or forms to fill out.
- **Large click targets:** Minimum 44px tap targets per WCAG guidelines. Large buttons, generous spacing.
- **Progressive disclosure:** Results list shows summary-level info per pair; click to expand the full field-by-field report. Keeps the screen uncluttered for large batches.
- **No jargon:** Button labels say "Drop files here" and "Verify" not "Run Analysis Pipeline."

### 5.2 Accessibility

- WCAG 2.1 AA compliance (contrast ratios, keyboard navigation, screen reader labels)
- High-contrast color coding for the traffic-light status indicators
- Font size minimum 16px for body text
- Descriptive error messages ("The image is too blurry to read. Please upload a clearer photo." rather than "OCR Error 422")

### 5.3 Loading & Feedback

- Four-stage progress visualization: Classifying → Extracting → Matching → Verifying
- File thumbnails/chips update in real time as classification completes (tag appears: "Label" or "Application")
- For small uploads (1–4 files), target total processing under 5 seconds
- For large batches, progress bar with completed/total count and estimated time remaining
- Clear success/failure states with obvious next actions

---

## 6. Error Handling & Edge Cases

| Scenario | Handling | User Message |
|----------|---------|--------------|
| Blurry/unreadable image | Return confidence scores per field; flag low-confidence fields as "Not Found" | "Some fields couldn't be read clearly. Please review manually or upload a better image." |
| File not recognized as label or application | Tag file as "⚠ Unrecognized" and exclude from auto-matching; agent can manually classify | "We couldn't identify this file. Is it a label or an application? Click to classify it." |
| Misclassification (label tagged as application or vice versa) | Agent can click any file chip and toggle its classification; re-matching runs automatically | Classification tags are always visible and clickable for correction |
| Unmatched files (label with no application or vice versa) | Surface at the top of results with "No match found" status; agent can add the missing file or verify manually | "This label has no matching application. Drop the application file to pair it, or review manually." |
| Ambiguous match (multiple possible pairs) | Show candidate matches with confidence scores; let agent confirm the correct pairing | "We found 2 possible matches for this label. Please confirm which application it belongs to." |
| API timeout (>8s per file) | Retry once, then mark file as failed; don't block other files | "This file couldn't be processed. Click to retry." |
| Angled/glare photo | AI vision models handle moderate distortion; flag if confidence is low | Partial results shown with advisory to re-photograph |

---

## 7. Performance Budget

Based on Sarah Chen's 5-second mandate and the failed scanning vendor pilot:

| Operation | Target | Fallback |
|-----------|--------|----------|
| File upload + thumbnail preview | < 500ms | Client-side preview before upload completes |
| Classification + extraction (per file) | < 3 seconds | Files processed in parallel; chips update as each completes |
| Pair matching + verification (per pair) | < 2 seconds | Runs client-side once extraction data is available |
| Total end-to-end (single pair: 2 files) | < 5 seconds | Progress indicator after 2s |
| Batch (per pair, amortized with parallelism) | < 6 seconds | Parallel processing; progress bar with count |

---

## 8. Security & Compliance Considerations

Per Marcus Williams, this is a prototype with minimal security requirements. However, the following baseline measures are included:

- **No persistent storage of uploaded images:** Images are processed in-memory and discarded after verification. No database.
- **No PII collection:** The form captures label data only, not applicant information.
- **HTTPS only:** Enforced by Vercel by default.
- **API keys secured:** All third-party API keys stored as environment variables, never exposed client-side.
- **Rate limiting:** Basic rate limiting on API routes to prevent abuse of the prototype.

### 8.1 Production Migration Path: Vercel → Azure

The prototype is hosted on Vercel's free Hobby tier for speed of development and ease of deployment. **If this prototype were to move into production or be integrated with the COLA system, hosting would need to migrate to Azure.** This is driven by several factors:

- **Existing contracts:** TTB already has Azure infrastructure and contracts in place following the 2019 migration. Using Azure avoids new vendor procurement, which could significantly delay timelines.
- **FedRAMP compliance:** The Azure environment has already completed FedRAMP certification. Vercel does not hold FedRAMP authorization, making it unsuitable for production federal workloads.
- **COLA integration:** The existing COLA system runs on .NET within Azure. Co-locating the verification tool on Azure simplifies future integration by keeping traffic within the same network boundary and avoiding the firewall/outbound traffic issues Marcus Williams flagged.
- **Data retention and PII:** A production deployment would likely need persistent storage, audit logging, and document retention policies—all of which are better managed within TTB's existing Azure governance framework.

The migration itself is straightforward. The Next.js application can be deployed to Azure App Service or Azure Static Web Apps with minimal code changes—the application logic, API routes, and AI integrations remain identical. Only the deployment target and environment variable configuration would change.

---

## 9. Assumptions & Trade-Offs

### 9.1 Assumptions

- This is a standalone prototype; no COLA system integration is required or attempted.
- Agents upload files (label images and COLA application documents) directly. No COLA system API integration is attempted.
- COLA application documents and label images are visually distinct enough for AI classification to be reliable in the vast majority of cases.
- Internet access is available for API calls (OCR and AI).
- The government warning statutory text is fixed and known.
- Prototype will be tested with English-language labels only.
- Test data will be high quality and representative of typical submissions. The prototype is not designed to handle adversarial edge cases such as multiple label images for a single application, intentionally misleading files, or trick inputs. The focus is on demonstrating the core verification workflow with clean, realistic data.

### 9.2 Trade-Offs

**Key design decision:** A foundational choice in this design was to treat every upload as a batch process, regardless of whether the agent drops in 2 files or 200. We believed that designing for batch-first would streamline the single-label experience (no forms to fill, no modes to switch) while also covering the batch processing use case, which is clearly where the greatest efficiency gains are. An agent verifying one label pair gets the same zero-friction drop-and-verify flow that scales seamlessly when Janet in Seattle needs to process 300 importer applications at once. This eliminated the need for separate single-label and batch interfaces, reducing UI complexity and development scope simultaneously.

| Decision | Benefit | Trade-Off |
|----------|---------|-----------|
| Claude Vision for OCR + extraction (single API call) | Simpler architecture; AI handles both OCR and intelligent field parsing | Slightly less OCR accuracy than dedicated OCR on some edge cases; API cost per call |
| Stateless design (no database) | Zero compliance overhead; simple deployment; no data retention risk | No historical audit trail; no saved verification records |
| Next.js monorepo (frontend + API) | Single deployment; fast development; easy to demo | Less separation of concerns than a dedicated backend |
| AI-based matching over rule-based | Handles nuanced cases (Dave's example); adapts to varied label formats | Non-deterministic; results may vary slightly between runs |
| Unified drop zone (AI classifies and matches files) | Minimal user friction; one interaction model for 1 file or 300; no forms to fill; faster than manual review | Relies on accurate AI classification; misclassified files need manual correction; less explicit user control than a form-based flow |

---

## 10. Out of Scope (for Prototype)

- COLA system API integration or direct database access
- Manual form-based data entry (agents upload documents instead; editing is available post-extraction within the results view)
- User authentication or role-based access
- Persistent storage or audit logging
- Multi-language label support
- Production-grade FedRAMP compliance
- Automated label image rectification (deskewing, perspective correction)

---

## 11. Development Plan

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| Phase 1 | Core upload + classification + extraction pipeline: single drop zone, Claude Vision integration, file classification (label vs. application), structured data extraction | Working file upload with AI classification and extraction |
| Phase 2 | Pair matching + verification engine: auto-matching logic, field-by-field comparison, Government Warning deep verification, results view with traffic-light status and sort-by-severity | End-to-end verification for a single label-application pair |
| Phase 3 | Batch scaling + UX polish: parallel processing for large uploads, progress visualization, summary bar, CSV export, manual override controls (reclassify, edit, re-match), error handling for all edge cases | Complete prototype handling 1–300+ files through unified flow |
| Phase 4 | Testing with sample labels, UX polish, deploy to Vercel, write documentation | Deployed URL + GitHub repo + README |

---

## 12. Success Metrics

The prototype demonstrates value if:

- A single label-application pair verifies end-to-end in under 5 seconds from file drop to results
- AI correctly classifies labels vs. COLA applications in 95%+ of uploads
- Automatic pair matching correctly links labels to their applications based on extracted data
- Brand name, ABV, and government warning matching is accurate on test labels
- Fuzzy matching correctly handles stylistic variations without false-flagging
- Government warning catches common violations (title case, missing bold, altered wording)
- Non-technical users can complete a verification by dropping files with no other interaction required
- A batch of 50+ files processes with clear progress and a severity-sorted results view
