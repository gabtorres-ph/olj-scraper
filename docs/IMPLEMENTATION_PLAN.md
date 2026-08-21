# Job Scraper 3-Day Implementation Plan

This project is a small TypeScript and Playwright scraper for a job site. It is written for a
senior Python backend developer who is new to TypeScript and web scraping, so the plan favors
small checkpoints, typed boundaries, and fast feedback over clever abstractions.

The repo already has the core runtime dependencies:

```text
playwright
typescript
tsx
dotenv
zod
```

## Target Outcome

By the end of 3 working days, one command should scrape job listings from one target site,
follow pagination, optionally visit detail pages, validate and deduplicate records, and write
JSON plus CSV output.

## Operating Principles

1. Build one reliable target before designing for many sites.
2. Keep Playwright code thin: navigation, waits, and DOM reads only.
3. Keep data shaping in pure functions that feel familiar from Python service code.
4. Use TypeScript types for developer feedback and `zod` schemas for runtime validation.
5. Prefer explicit configuration over hidden constants.
6. Treat scraping as an unreliable integration: log decisions, skip bad rows, and make reruns cheap.

## Python-To-TypeScript Translation Notes

Use these mental mappings while coding:

| Python habit | TypeScript equivalent in this repo |
| --- | --- |
| `dataclass` / Pydantic model | `type` or `interface` plus a `zod` schema |
| `requests` session | Playwright `BrowserContext` / `Page` |
| `BeautifulSoup.select()` | Playwright `locator()` / `page.$$eval()` |
| `argparse` / environment settings | `config.ts` with `dotenv` |
| `Path.write_text()` | `fs/promises.writeFile()` |
| `logging.info()` | Small local logger wrapper or structured `console.info()` |
| `pytest` pure-function tests | Node test runner or simple fixture-driven parser tests |

## Recommended Structure

Keep the first production version boring and modular:

```text
src/
  config.ts
  index.ts
  scraper/
    browser.ts
    listings.ts
    details.ts
    pagination.ts
  storage/
    csv.ts
    json.ts
  types/
    job.ts
data/
  jobs.json
  jobs.csv
```

Suggested module responsibilities:

1. `config.ts`: read `.env`, parse numbers and booleans, validate with `zod`.
2. `types/job.ts`: define `JobListing`, `JobDetail`, `JobRecord`, and schemas.
3. `scraper/browser.ts`: launch and close Playwright cleanly.
4. `scraper/listings.ts`: extract summary data from the listing page.
5. `scraper/pagination.ts`: advance pages and detect stop conditions.
6. `scraper/details.ts`: enrich a listing from its detail URL.
7. `storage/json.ts` and `storage/csv.ts`: serialize validated records.
8. `index.ts`: orchestrate the run, log progress, and handle process exit.

## Day 1: Baseline And One-Page Scrape

**Goal:** A developer can run the project locally and scrape visible listings from one page into
`data/jobs.json`.

### Milestone 1.1: Runtime Baseline

Tasks:

1. Add `tsconfig.json` with strict-enough settings for backend code.
2. Add `package.json` scripts:
   - `scrape`: run `src/index.ts` with `tsx`.
   - `typecheck`: run `tsc --noEmit`.
3. Add `.env.example` with:
   - `TARGET_URL`
   - `HEADLESS=true`
   - `MAX_PAGES=1`
   - `SCRAPE_DETAILS=false`
   - `OUTPUT_JSON=data/jobs.json`
   - `OUTPUT_CSV=data/jobs.csv`
4. Add `src/config.ts` that loads `.env` and returns a typed config object.
5. Add `src/index.ts` that prints the parsed config and exits successfully.

Exit criteria:

1. `npm run typecheck` passes.
2. `npm run scrape` starts and prints a sanitized config summary.
3. A new developer can copy `.env.example` to `.env` and run the same commands.

TypeScript notes:

1. Use `export type Config = z.infer<typeof ConfigSchema>` instead of manually duplicating types.
2. Environment variables are strings; parse booleans and numbers explicitly.

### Milestone 1.2: Browser Proof-Of-Life

Tasks:

1. Implement `src/scraper/browser.ts` with `createBrowserContext(config)` and cleanup helpers.
2. Open `TARGET_URL` with Playwright from `src/index.ts`.
3. Wait for the document to reach a usable state.
4. Log page title and final URL.

Exit criteria:

1. `npm run scrape` opens the target URL without crashing.
2. Browser cleanup happens in a `finally` block.
3. Navigation timeout errors are readable.

Scraping notes:

1. Prefer specific waits for site content once selectors are known.
2. Avoid fixed sleeps on Day 1 except while discovering behavior.

### Milestone 1.3: First Listing Extractor

Tasks:

1. Inspect the target page in headed mode.
2. Identify stable selectors for job cards, title, company, location, and URL.
3. Create `src/types/job.ts` with a minimal `JobListingSchema`.
4. Create `src/scraper/listings.ts` with `extractListings(page, config)`.
5. Normalize whitespace and convert relative links to absolute URLs.
6. Validate each extracted listing with `zod`; skip invalid cards and log why.
7. Write valid listings to `data/jobs.json`.

Exit criteria:

1. One listing page produces JSON records.
2. Bad or partial cards do not crash the run.
3. The JSON is formatted with stable indentation.

Day 1 done means:

1. A single command scrapes one page.
2. The shape of the core job record is typed and runtime-validated.
3. There is enough logging to know how many cards were seen, saved, and skipped.

## Day 2: Pagination, Deduplication, And Detail Pages

**Goal:** The scraper collects multiple pages, avoids duplicates, and enriches each job from its
detail page without overwhelming the target site.

### Milestone 2.1: Pagination Loop

Tasks:

1. Add `src/scraper/pagination.ts`.
2. Support `MAX_PAGES` from config.
3. Implement next-page detection using the target site's actual next button or URL pattern.
4. Track visited page URLs to avoid loops.
5. Stop cleanly when no next page exists, the next control is disabled, or `MAX_PAGES` is reached.

Exit criteria:

1. The scraper collects listings across more than one page.
2. The run logs current page number, URL, and listing count.
3. Repeated pagination state stops the run instead of looping forever.

Scraping notes:

1. Prefer clicking the site's real pagination control if URLs are not predictable.
2. After each page transition, wait for either URL change or listing-card refresh.

### Milestone 2.2: Stable IDs And Deduplication

Tasks:

1. Add a stable `id` or `key` field derived from the job URL or site-provided job ID.
2. Deduplicate in memory before writing output.
3. Preserve the first valid record when duplicates appear.
4. Add summary counts:
   - pages visited
   - raw listings found
   - valid listings
   - duplicates removed
   - final records written

Exit criteria:

1. Duplicate records do not appear in `jobs.json`.
2. Summary logs match the output count.
3. Deduplication is isolated in a pure function.

TypeScript notes:

1. A `Map<string, JobListing>` is the direct equivalent of a Python dict keyed by job ID.
2. Use a pure helper like `dedupeListings(listings): JobListing[]`.

### Milestone 2.3: Detail Page Enrichment

Tasks:

1. Add `SCRAPE_DETAILS` and `DETAIL_DELAY_MS` config support.
2. Create `src/scraper/details.ts` with `extractJobDetails(page, listing, config)`.
3. Visit each listing URL when `SCRAPE_DETAILS=true`.
4. Extract detail fields where available:
   - description
   - salary
   - employment type
   - tags
   - posted date
5. Merge detail data into the listing record without overwriting better listing-page values.
6. Add a small delay or pacing function between detail visits.

Exit criteria:

1. Detail scraping can be turned on and off from `.env`.
2. A detail-page failure skips or partially enriches one job without failing the whole run.
3. The final record schema is stable.

Day 2 done means:

1. The scraper can crawl several listing pages.
2. Output is deduplicated.
3. Detail pages are supported behind a config flag.

## Day 3: Reliability, Exports, And Handoff

**Goal:** The scraper is usable by someone else, understandable when it fails, and easy to extend.

### Milestone 3.1: Logging And Error Handling

Tasks:

1. Add a small logging helper with `info`, `warn`, and `error`.
2. Add `VERBOSE=false` config support.
3. Wrap navigation and extraction steps with contextual error messages.
4. Add retry handling for transient navigation failures.
5. Capture a screenshot into `data/debug/` when an important page step fails.

Exit criteria:

1. Failed runs explain which page or job failed.
2. Debug screenshots are only written for failures.
3. Expected scrape misses are warnings, not uncaught exceptions.

Scraping notes:

1. Do not retry validation failures; fix selectors or schemas instead.
2. Retry only operations likely to be transient, such as navigation and load waits.

### Milestone 3.2: CSV Export And Output Hygiene

Tasks:

1. Implement `src/storage/csv.ts`.
2. Keep `src/storage/json.ts` responsible only for JSON output.
3. Create output directories automatically.
4. Escape CSV fields correctly for commas, quotes, and newlines.
5. Write both JSON and CSV from the same validated records.

Exit criteria:

1. `data/jobs.json` and `data/jobs.csv` are generated by one run.
2. CSV opens cleanly in a spreadsheet.
3. Missing optional fields serialize consistently.

TypeScript notes:

1. Use `fs/promises.mkdir(path.dirname(filePath), { recursive: true })`.
2. Keep serialization functions pure where possible, then write files at the edge.

### Milestone 3.3: Minimal Tests And Developer Handoff

Tasks:

1. Add focused tests for pure helpers:
   - config parsing
   - URL normalization
   - deduplication
   - CSV escaping
2. Add scripts:
   - `test`
   - `check`, which runs typecheck and tests
3. Document the target site's selectors in code comments near the extractor.
4. Update `README.md` or add `DEVELOPER_NOTES.md` with:
   - setup commands
   - `.env` fields
   - scrape command examples
   - how to run headed mode for debugging
   - how to add a second target site later

Exit criteria:

1. `npm run check` passes.
2. A fresh developer can set `.env`, run the scraper, and understand the output.
3. The code has obvious extension points but no premature multi-site framework.

Day 3 done means:

1. The scraper runs end to end with JSON and CSV output.
2. Failures are diagnosable without a debugger.
3. The next developer has setup, debug, and extension notes.

## Suggested Daily Schedule

### Day 1

1. Hour 1: create scripts, config, and entry point.
2. Hour 2: launch Playwright and open the target page.
3. Hours 3-5: discover selectors and extract one page.
4. Hours 6-7: add validation and JSON output.
5. Hour 8: typecheck, rerun, clean up rough edges.

### Day 2

1. Hours 1-2: implement pagination and loop protection.
2. Hour 3: add stable IDs and deduplication.
3. Hours 4-6: implement detail-page extraction.
4. Hour 7: add pacing and partial-failure behavior.
5. Hour 8: run with low page limits and inspect output.

### Day 3

1. Hours 1-2: improve logging, retries, and failure screenshots.
2. Hours 3-4: add CSV output.
3. Hours 5-6: add focused tests for pure helpers.
4. Hour 7: write developer notes.
5. Hour 8: final `npm run check` and end-to-end scrape.

## Risk Register

| Risk | Mitigation |
| --- | --- |
| Selectors are brittle | Keep selectors isolated in extractor modules and document why each one was chosen. |
| Site blocks automation | Use headed debugging, realistic waits, low concurrency, and respectful pacing. |
| Detail pages are inconsistent | Treat detail fields as optional and preserve valid listing-page values. |
| TypeScript slows initial progress | Type only module boundaries first; tighten internals after behavior works. |
| Output changes between runs | Sort records by stable key before writing when deterministic diffs matter. |

## Definition Of Done

The 3-day implementation is complete when:

1. `npm run scrape` runs the scraper end to end.
2. `npm run check` passes.
3. The scraper reads config from `.env`.
4. Listings are typed, validated, deduplicated, and written to JSON and CSV.
5. Pagination is supported with a page limit and loop protection.
6. Detail pages are supported behind a config flag.
7. Failures produce useful logs and, where appropriate, debug screenshots.
8. Developer notes explain setup, debugging, and how to adapt the scraper for another target.
