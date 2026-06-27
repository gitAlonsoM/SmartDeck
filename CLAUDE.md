# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SmartDeck is a vanilla-JS Single Page Application (no framework, no bundler, no `package.json`) for studying flashcards with spaced repetition. The HTML page loads every JS file directly via `<script defer>` tags in `index.html` in strict dependency order. Tailwind, Font Awesome, and highlight.js come from CDN.

## Shell environment

**Always use the PowerShell tool** for all shell commands on this machine (Windows 11). The Bash tool routes through `/usr/bin/bash` and does not have access to PowerShell cmdlets like `Get-Content`. Never use the Bash tool here.

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

- `generate_audios.py <deck.json>` — **DISABLED (Azure key inactive).** Do not run this. Use `generate_audios_google.py` instead.
- `generate_audios_google.py <deck.json>` — free gTTS TTS; skips files that already exist. **This is the active audio generation script.**
- `delete_audios.py` — prunes MP3s no longer referenced by a deck.
- `update_deck.py <deck.json> <improved_cards.json>` — replaces cards by `cardId` and writes a timestamped backup to `public/data/backups/`. This is the pipeline used to apply LLM-improved cards exported by the in-app "Improvement" flow.
- `merge_decks_smart.py` — moves cards (and their audio) from a source deck into a target deck, renaming `cardId` prefixes and honoring a `IDS_TO_MOVE` inclusion list. **Edit `IDS_TO_MOVE` in the script header before each run** — it is already pre-configured for `dummy → common_meeting`.
- `upgrade_glossary.py`, `add_phrasal_verb_modals.py`, `update_plsql_paths.py`, `refactor_values.py`, `remove_categories.py` — one-shot deck/glossary transforms; read the file header before re-running, several are tailored to specific decks.

### Running Python scripts on this machine

- **Always use the PowerShell tool** (not Bash) when running `py` commands that need env vars or contain emoji in print statements.
- Scripts with emoji in their output require UTF-8 encoding: `$env:PYTHONIOENCODING="utf-8"; py <script>.py [args]`
- The Bash tool routes through `/usr/bin/bash` which does not support `$env:VAR` syntax — PowerShell tool only for `py` invocations.

## Adding cards to a deck JSON

**Edit the JSON file directly with the Edit tool — never create a helper script just to insert cards.**

1. Read the last few lines of the target deck to find the closing `}` of the last card.
2. Replace that closing block with the new cards appended inside the `cards` array, ending with `  ]\n}`.
3. After saving the JSON, run `py generate_audios_google.py <deck.json>` (via PowerShell tool) to generate the MP3s. The script skips files that already exist, so it is safe to re-run.
4. Stage with `git add public/data/<deck>.json public/data/audio/<deck>/` — do **not** stage `.bak` files.

Audio path convention: `public/data/audio/<deck-slug>/<cardId>_sideB_<N>.mp3` (0-indexed).

## Conventions seen in this codebase

- `localStorage` keys are versioned (`smart-decks-v3-…`); preserve the prefix when adding new keys via `StorageService`.
- Logging style is `console.log("DEBUG: [Class] method -> message.")` for traces and `console.log("VERIFY: ...")` for milestone confirmations. Match it when adding code so the existing flow stays readable.
- Components don't emit events — they call handlers passed via the constructor. When adding a new interaction, wire the handler in `App.setupComponents` / `App.render` and the corresponding `handle*` method on `App`.
- The "Improvement" feature lets users flag cards/modals; the data is stored in `localStorage` and exported via `ImprovementService.handleExport` as a prompt for an external LLM, whose JSON output is fed back through `update_deck.py`.

## Recent decisions

### Session repetition counter on cards (2026-06-27)
A small amber badge (`↻ N`) on each quiz card shows how many times that card has appeared in the current **session** (the span from when the deck is first studied until it is completed or deliberately reset — *not* a single round). It is intentionally **reused from the existing per-card metrics** so it can never drift from the "Generate Progress Report" feature.

**The number's meaning & sync guarantee (critical):**
- The badge reads the same `attempts` value that the Progress Report uses: key `smart-decks-v3-metrics-<deckId>`, written only by `StorageService.updateCardMetric`. There is a single source of truth, so the two can never diverge.
- `App._getCardRepetition(cardId)` computes `displayed = (stored attempts) + 1`. Stored `attempts` counts *completed* assessments; the current (not-yet-answered) appearance is therefore `attempts + 1`.
- New card → `attempts=0` → value `1` → **badge hidden** (only shown when `>= 2`). So a card mastered on the first try never shows a badge.
- 2nd appearance → badge `2`; fail again → 3rd appearance shows `3`; etc.
- **Why it stays in sync with the report:** when the user passes a card (`I Knew It` / correct answer), `updateCardMetric` increments `attempts` then sets `masteredAt = attempts`. That final value equals exactly the number the badge was showing. So a card the user approves while the badge reads `5` is recorded as `masteredAt = 5` and lands in the report's `5_attempts` bucket. Always equal, regardless of how many fails preceded it.
- Once `masteredAt` is set, `updateCardMetric` stops counting and the card leaves the round pool (it's in `learned`), so no post-mastery render can desync it.

**Lifecycle / reset:** the "session" boundary is already handled — both the *Reset* button and the "Cycle Complete!" flow call `App.handleResetDeck → StorageService.clearDeckProgress`, which already calls `clearDeckMetrics`. So finishing or resetting the deck zeroes `attempts`/`masteredAt` and every card reappears "for the first time" with no badge. No new reset logic was needed.

**Files touched (all three quiz screens get the badge; flippable was the primary target):**
- **`src/core/App.js`** — added `_getCardRepetition(cardId)`; passes the value as a trailing arg to all three screen `render()` calls (`flippableCardScreen`, `audioChoiceScreen`, `quizScreenComponent`).
- **`FlippableCardScreen`** (`.js` + `.html`) — badge lives in `#flippable-card-header` to the **left of** `#card-progress-indicator` (`justify-end gap-3`), away from the absolutely-positioned flag / Ignore Card buttons. `_updateRepetitionCounter(repetition)` toggles `hidden`/`inline-flex`. **Flip behavior:** `flipCard()`/`resetViewState()` now toggle `invisible` on `#card-progress-indicator` only (previously the whole header), so the repetition badge stays **fixed and visible on side B** like the flag/Ignore buttons, while the `N / total` indicator still hides on flip.
- **`AudioChoiceScreen` + `QuizScreen`** (`.js` + `.html`) — badge is an absolute `top-3 left-3` pill on `#question-card` (the flag/Ignore buttons sit at `top-3 right-3` in these decks, so the left corner is free). Same `_updateRepetitionCounter` pattern with ids `rep-counter-audio` / `rep-counter-quiz`.

**To adjust the counter later:** the only logic is `App._getCardRepetition`; the three screens just render whatever number they're handed (showing it when `>= 2`). Do not duplicate the count anywhere else or it will desync from the report.

### New `miscellaneous` glossary — idioms & other uses (2026-06-20)
Added a third modal glossary alongside `english_rules` (`er`) and `phrasal_verbs` (`pv`): **`miscellaneous`** with alias **`misc`**, for content that is neither a grammar rule nor a phrasal verb — idioms, fixed expressions, business jargon, and tech terms (e.g. `misc:1` "Keep an eye out", `misc:8` "Technical debt"). Cards link to it with the same qualified syntax `**[misc:id]**`.

Files touched (the system is built to make this a small, additive change):
- **`public/data/glossary/miscellaneous.json`** — the new glossary file. Same schema as the others: object keyed by **bare numeric string id**, each entry `{ title, description, content }`, content is HTML following the "Anti-Shit Protocol" (§7 of `ImprovementService`).
- **`src/services/GlossaryService.js`** — registered `misc: 'miscellaneous'` in `GLOSSARY_ALIASES`. This one line is what enables card-link resolution, the Glossary screen, and the Improvement catalog — everything else iterates over `GLOSSARY_ALIASES`.
- **`src/core/App.js`** — added a `GlossaryService.loadGlossary('miscellaneous')` preload in `setupComponents`.
- **`public/data/glossary/glossary_manifest.json`** — added the manifest entry (`key: "miscellaneous"`, title "Idioms & Other Uses") so it appears in the in-app Glossary browser.
- **`src/services/ImprovementService.js`** — the Modal Catalog already includes `misc` automatically (it loops over `GLOSSARY_ALIASES`); only the **hardcoded prompt text** needed `misc` added: §3B note rule, §6 STEP C alias picker + file routing, §9 header + FORMAT DISTINCTION table, and a `📁 miscellaneous.json` block in Part 2 output. Prompt version bumped **V10.7 → V10.8**.

**To add another glossary in the future:** drop the JSON in `public/data/glossary/`, add one line to `GLOSSARY_ALIASES`, add a manifest entry, add a preload in `App.setupComponents`, and extend the alias mentions + Part 2 block in the `ImprovementService` prompt text. The alias must be 1–8 lowercase letters; ids are per-alias and never collide across glossaries.

### InfoModal scroll-to-top on open (2026-05-31)
`InfoModal.show()` (`src/components/InfoModal/InfoModal.js`) now resets `this.modalBody.scrollTop = 0` after injecting new content. The scrollable element is `#info-modal-body` (the `overflow-y-auto` div in `info-modal.html`); it retained the scroll position from the previous open, so card modals appeared scrolled to the bottom (most visible on mobile, which is the primary target). If you add any logic that re-renders modal content, reset scroll the same way so the user always starts reading from the top.

### Improvement prompt V10.7 — Generality Principle for new modals (2026-05-31)
Added a "GENERALITY PRINCIPLE (NON-NEGOTIABLE)" callout at the top of §6 STEP C (Creation) in `ImprovementService._generateImprovementPrompt`. Problem: when asked to create a modal for a phrasal verb / rule, the LLM scoped it to the *triggering card's* single use (e.g. "take off" = remove clothes only), making the modal useless for every other card. New rule: the card only tells the LLM *which* topic to document, not its scope — a new modal must cover the topic's **most common real-world uses**, with the card's specific case as just one section/example (cross-references §7F Clean Architecture for multi-meaning topics). Prompt version bumped V10.6 → V10.7.

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

### Modal links rendered as chips in cards + Improvement prompt V10.6 (2026-05-30)

UI fix and a prompt clarification:

1. **Modal link styling (cards):** A card's `note` modal link `**[alias:id]**` is rendered by `FlippableCardScreen.js` (inline links) and `AudioChoiceScreen.js` (both the "header" link at the top of the grammar note and inline links). It used to be a plain green dotted-underline `<a class="glossary-term">`, which the `.note-paragraph { text-align: justify }` rule stretched edge-to-edge ("Word justify" look) when the title wrapped to 2 lines. Now it renders as a **chip**: `<a class="glossary-term glossary-term-chip"><i class="fas fa-book-open glossary-term-chip-icon"></i><span>Title</span></a>`. The `.glossary-term-chip` class (in `public/css/style.css`) is `display: inline-flex` — an atomic inline box, so `text-align: justify` can no longer stretch it; green tint background + border + book icon, no underline. **Keep the `glossary-term` class on the element** — the click handlers do `event.target.closest('.glossary-term')`, so removing it breaks modal opening. Multiple chips per card flow inline and don't break.

2. **Removed the "Tip - " prefix** from the AudioChoiceScreen grammar-note header (it was hard-coded before the chip). Now `audioChoice` decks (Phrasal Verbs, Common Meeting) show just the chip, matching `flippable` decks.

3. **Improvement prompt V10.6:** §9 MODAL CATALOG now states the completeness rule both ways — *minified entry = reference-only (never modify); complete entry (has `content` + `user_comment`) = modification requested.* The decisive signal is `user_comment` (the §7G live examples also have full `content` but no `user_comment`, so they're format models, not edit targets).

### Improvement prompt V10.5 — format distinction table + §3B note-field rule fix (2026-05-21)

Two clarity fixes to prevent LLM confusion about when to use the alias prefix:

1. **§3B note-field CRITICAL RULE fix:** Removed a dangling backtick that was causing a broken bullet point. Now reads `- **CRITICAL RULE (note field):**` as a proper sub-bullet of the `note` field entry. Clarified that the qualified syntax `` `**[alias:id]**` `` is what the app parses and renders at runtime.

2. **§9 FORMAT DISTINCTION table (new):** Added an explicit 3-row table documenting the three distinct contexts where modal IDs appear, each with its own format:
   - Catalog keys (internal, LLM-only): `alias:id` (e.g. `er:12`) — routing tool, never written to files.
   - Card `note` field (UI reference): `**[alias:id]**` (e.g. `**[er:12]**`) — parsed by the app at runtime.
   - Glossary JSON file key / Part 2 output: bare numeric string (e.g. `"12"`) — mirrors the actual file format.

   This table makes unambiguous the rule the user articulated: the alias prefix exists only in the catalog the LLM reads; it disappears when writing JSON files, and appears as `**[alias:id]**` only when referencing a modal from a card's note.

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
