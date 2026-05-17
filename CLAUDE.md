# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SmartDeck is a vanilla-JS Single Page Application (no framework, no bundler, no `package.json`) for studying flashcards with spaced repetition. The HTML page loads every JS file directly via `<script defer>` tags in `index.html` in strict dependency order. Tailwind, Font Awesome, and highlight.js come from CDN.

## Running and developing

- **Serve locally:** Open the folder in VS Code and use the Live Server extension (configured to port 5501 in `.vscode/settings.json`). Any static-file server pointed at the repo root works — there is no build step.
- **No tests, lint, or build commands exist.** Verifying changes means loading the page in a browser and exercising the affected screen. The console is heavily instrumented (`console.log("DEBUG: ...")`, `VERIFY: ...`); use it.
- **Adding a new JS file:** also add a matching `<script src="..." defer>` line to `index.html`. Order matters — services before components, components before `core/App.js` (last).
- **Bumping the version:** edit `version.json` (read by `VersionService.js`).

## Architecture

`src/core/App.js` is the single state machine and entry point. `App.state.currentScreen` (`'deckList' | 'deckDetail' | 'quiz' | 'audioChoiceQuiz' | 'flippableQuiz' | 'glossary'`) drives a `switch` in `App.render()` that mounts the corresponding component into `#app-container` (or `#glossary-screen-container`). Every user action is a handler on `App` (e.g. `handleQuizAnswer`, `handleCardAssessment`, `handleMarkCardForImprovement`); components receive these handlers as constructor callbacks rather than emitting events.

Layers:
- **`src/core/`** — `App.js` (state + routing), `Quiz.js` (multipleChoice / audioChoice), `SpacedRepetitionQuiz.js` (flippable). `handleStartQuiz` dispatches on `deck.deckType` to pick the quiz class and target screen.
- **`src/services/`** — static-method singletons. `StorageService` is the only thing that touches `localStorage` (keys all prefixed `smart-decks-v3-…`). `TTSService` does device speech synth with hybrid fallback to pre-generated audio. `ApiService` calls OpenAI to generate AI decks. `GlossaryService` lazy-loads glossary JSON. `MusicService`, `UnlockService`, `ImprovementService`, `VersionService` are similarly scoped.
- **`src/components/`** — one folder per screen/modal, each owning its HTML+JS. Components are stateless renderers; they call back into `App`.
- **`public/data/`** — deck JSON files, audio MP3s under `audio/<deck-slug>/`, and `glossary/*.json`. The list of bundled decks is hard-coded in `App.loadDecks()` (`deckFiles` array); to add a static deck you must add it both as a file and in that array. AI-generated decks live only in `localStorage` under `smart-decks-v3-decks`.
- **`public/data/deck_unlock_codes.json`** — maps unlock codes to deck IDs; used by `UnlockService` so most static decks stay hidden until unlocked. Defaults visible in the dashboard are hard-coded in `App.render()` (`defaultVisibleDeckFiles`).

Deck visibility flow: static deck files are fetched at startup, merged with user (AI) decks from `localStorage`, then filtered in `render()` to show only (a) the two default-visible files, (b) decks the user has unlocked, or (c) AI-generated decks.

## Deck schema (critical)

Decks are polymorphic; every card must have a unique `cardId`. The full schema lives in **`CARDS.MD`** and **`README_REAL.MD`** (both git-ignored, kept locally as the content-author reference) — consult them before adding or modifying cards. The runtime behavior in `App.handleStartQuiz` and the screen components is the source of truth; the markdown docs may lag.

Three deck types:
- `flippable` → `SpacedRepetitionQuiz` + `FlippableCardScreen`. Cards use `sideA` / `sideB` (string, object with `conversation`, or object with `visualContent`) plus a `note` field for explanations. `sideB` can be an array of `{text, audioSrc}` objects for hybrid audio.
- `multipleChoice` → `Quiz` + `QuizScreen`. Cards have `question`, `options`, `correctAnswer`, optional `content` (code/image/none), optional `hint`.
- `audioChoice` → `Quiz` + `AudioChoiceScreen`. Cards have `sentenceParts.{prefix, suffix}`, `options[{text, isCorrect}]`, `correctAnswer`, `audioSrc`, `hint`, optional `content`.

`note` formatting markers consumed by the UI: `[text]` → blue (correct/highlight), `~text~` → yellow (incorrect/warning), `\n\n` → paragraph break. Plain TTS-bound fields (`text`, raw `sideB` strings) must avoid quotes and `* _ #` — the speech engine reads them literally.

## Python content scripts

The repo ships content-authoring scripts at the root. Most are git-ignored (treated as personal tools) but stay in the working tree. Run with `py <script>.py [args]`:

- `generate_audios.py <deck.json>` — Azure Cognitive Services TTS; reads `audioSrc` paths from a deck and produces MP3s. **Contains a hard-coded API key** — never commit changes that expose it; the file is in `.gitignore` for that reason.
- `generate_audios_google.py` — free gTTS alternative.
- `delete_audios.py` — prunes MP3s no longer referenced by a deck.
- `update_deck.py <deck.json> <improved_cards.json>` — replaces cards by `cardId` and writes a timestamped backup to `public/data/backups/`. This is the pipeline used to apply LLM-improved cards exported by the in-app "Improvement" flow.
- `merge_decks_smart.py` — moves cards (and their audio) from a source deck into a target deck, renaming `cardId` prefixes and honoring a `IDS_TO_KEEP` exclusion list. Configuration is edited in the script header.
- `upgrade_glossary.py`, `add_phrasal_verb_modals.py`, `update_plsql_paths.py`, `refactor_values.py`, `remove_categories.py` — one-shot deck/glossary transforms; read the file header before re-running, several are tailored to specific decks.

## Conventions seen in this codebase

- `localStorage` keys are versioned (`smart-decks-v3-…`); preserve the prefix when adding new keys via `StorageService`.
- Logging style is `console.log("DEBUG: [Class] method -> message.")` for traces and `console.log("VERIFY: ...")` for milestone confirmations. Match it when adding code so the existing flow stays readable.
- Components don't emit events — they call handlers passed via the constructor. When adding a new interaction, wire the handler in `App.setupComponents` / `App.render` and the corresponding `handle*` method on `App`.
- The "Improvement" feature lets users flag cards/modals; the data is stored in `localStorage` and exported via `ImprovementService.handleExport` as a prompt for an external LLM, whose JSON output is fed back through `update_deck.py`.

## Recent decisions

### Multi-glossary modal link system (2026-05-16)
Cards now reference modals with a qualified syntax `**[alias:id]**` (e.g. `**[er:5]**`, `**[pv:188]**`) instead of the old bare `**[N]**`. Aliases are registered in `GlossaryService.GLOSSARY_ALIASES` (`er` → `english_rules`, `pv` → `phrasal_verbs`). Adding a new glossary is one line there. The regex everywhere is `/\*\*\[([a-z]{1,8}):(\d+)\]\*\*/g`.

- `App.handleShowInfoModal(termKey)` — `termKey` is now the qualified string (`"pv:188"`). The old deck-based router that guessed the glossary from `deckId` is gone.
- `FlippableCardScreen` and `AudioChoiceScreen` both use the same qualified regex; neither hard-codes a glossary name anymore.
- All existing `**[N]**` markup in every deck JSON was migrated to `**[er:N]**` or `**[pv:N]**` by `migrate_modal_links_qualified.py` (routing rule: `'phrasal' in deck.id` → `pv`, otherwise `er`).

### Modal-improvement localStorage key fix (2026-05-16)
Keys in `smart-decks-v3-modal-improvements` changed from bare numeric strings (`"188"`) to qualified strings (`"pv:188"`). This fixes a silent collision where the same numeric ID could exist in both glossaries. `StorageService.migrateModalImprovementKeys()` runs once at startup and backfills the `er:` prefix on any legacy keys (flag: `smart-decks-v3-modal-improvements-migrated-v1`).

### Optimized improvement export — Modal Catalog (2026-05-16)
`ImprovementService.handleExport` no longer sends the full glossary HTML to the LLM. Instead it builds a **Modal Catalog**: every modal across every glossary is sent as `{ title, description }` (minified). Only modals the user explicitly flagged for improvement are overlaid with full `{ title, description, content, user_comment }`. This dramatically reduces prompt size when the user has no modal improvement requests.

The `description` field (a 1-line plain-English summary) was added to every entry in both glossary files via `migrate_glossary_add_description.py`. Descriptions were populated by Gemini and applied with `apply_modal_descriptions.py`.

### Live reference examples in the improvement prompt (2026-05-16)
`ImprovementService._generateImprovementPrompt` now receives 6 real modals (`er:9`, `er:33`, `er:68`, `er:82`, `pv:1`, `pv:61`) pulled from the cached glossary at export time and injects them into §7G of the prompt. The LLM uses them as ground-truth format reference when creating or improving modals. They are never hard-coded — updating those glossary entries automatically updates the examples in future exports.

### Improvement prompt V10.4 — per-file Part 2 blocks + bare numeric IDs (2026-05-17)

Two fixes for LLM output confusion:

1. **Part 2 format change:** Replaced single JSON block with qualified keys (`"er:218"`) with one labeled JSON block per glossary file (`📁 english_rules.json` / `📁 phrasal_verbs.json`), each using bare numeric keys (`"218"`). The file label above the block replaces the need for the alias prefix in the key. The alias is now marked as an internal-only tool — clearly flagged `⚠️ KEY FORMAT RULE (INTERNAL — NEVER REPEAT THIS IN OUTPUT)` so LLMs don't echo it back.

2. **E. Next Steps Step 2:** Removed the confusing internal CRITICAL warning (which the LLM was copying verbatim into user-facing output). Replaced with a simple user-facing instruction: "copy the block into the labeled file."

### Improvement prompt V10.3 — mandatory paragraph break on append (2026-05-17)

Added a "Mandatory Paragraph Break on Append" rule to §4.1: whenever any new content is appended to an existing `note` field, the LLM **must** prefix it with `\n\n`. This is now a CRITICAL/NON-NEGOTIABLE rule so the reader never sees ideas running together without separation. Also cross-referenced from rule #2 of §4 ("Preserve Existing Content"). Prompt version bumped from V10.2 → V10.3.

### Improvement prompt V10.2 — modal file attribution + glossary key rule (2026-05-16)
Two additions to `ImprovementService._generateImprovementPrompt`:

1. **File attribution (Part 2, item 5):** After the Improved Modals JSON block the LLM must now write a plain-text `📁 File to update:` line per alias (`er:` → `english_rules.json`, `pv:` → `phrasal_verbs.json`). The JSON itself stays clean; the file name appears outside it so the user knows which file to edit without reading the alias prefix.

2. **Glossary file key rule (Step E, critical warning):** The alias prefix (`er:`, `pv:`) lives **only** in the LLM's Part 2 output for routing. Keys inside the actual glossary JSON files (`english_rules.json`, `phrasal_verbs.json`) are always **bare numeric strings** — never `"er:218"`, always `"218"`. Writing the qualified ID as a file key breaks `GlossaryScreen` search (which does a plain `indexOf` on the numeric key array). Current prompt version: **V10.2 (Modal File Attribution)**.
