# =============================================================================
# !!! DO NOT DELETE THIS COMMENT !!!  (Keep it for every future check.)
# =============================================================================
# PURPOSE
#   Safety net to run at the END of any content operation (adding cards,
#   merge_decks_smart.py, update_deck.py, manual JSON edits). It answers ONE
#   question: are all cardIds inside each deck UNIQUE (and well-formed)?
#
#   cardIds do NOT need to be sequential or in order — gaps and out-of-order
#   ids are perfectly fine and expected after migrations. They only need to be
#   UNIQUE within their own deck, because everything the app persists is keyed
#   by cardId:
#     - smart-decks-v3-srs-<deckId>       (SRS schedule per card)
#     - smart-decks-v3-metrics-<deckId>   (attempts / masteredAt)
#     - update_deck.py replaces cards by cardId
#   A duplicate cardId means two cards silently share one schedule and one
#   metric record, and update_deck.py will patch the wrong card.
#
# USAGE
#   py check_deck_ids.py                      -> check every deck in public/data
#   py check_deck_ids.py public/data/dummy.json
#   py check_deck_ids.py dummy.json common_meeting.json   (bare names resolve
#                                                          inside public/data)
#
# EXIT CODE
#   0 = every deck is clean.  1 = at least one problem was found.
#   So it can gate a commit:  py check_deck_ids.py && git add ...
#
# WHAT IT REPORTS
#   [DUP]     the same cardId used by 2+ cards in one deck  (hard failure)
#   [MISSING] a card with no cardId / empty / not a string  (hard failure)
#   [DECKID]  two deck FILES sharing the same top-level deck "id" (hard
#             failure, only in scan-all mode) — they would collide on the
#             localStorage keys above.
#
#   No emoji is used on purpose, so it runs on Windows without needing
#   $env:PYTHONIOENCODING="utf-8".
# =============================================================================

import json
import os
import sys
from collections import Counter, defaultdict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')


def resolve_targets(args):
    """Turn CLI args into a list of absolute deck paths. No args = scan all."""
    if not args:
        print(f"DEBUG: No path given. Scanning every deck in {DATA_DIR}")
        if not os.path.isdir(DATA_DIR):
            print(f"DEBUG: Data directory not found at {DATA_DIR}")
            sys.exit(1)
        found = [os.path.join(DATA_DIR, f)
                 for f in sorted(os.listdir(DATA_DIR))
                 if f.endswith('.json')]
        return found, True

    paths = []
    for arg in args:
        candidate = arg if os.path.isabs(arg) else os.path.join(BASE_DIR, arg)
        if not os.path.exists(candidate):
            # Allow bare deck names like "dummy.json"
            fallback = os.path.join(DATA_DIR, os.path.basename(arg))
            if os.path.exists(fallback):
                candidate = fallback
            else:
                print(f"DEBUG: File not found: {arg}")
                sys.exit(1)
        paths.append(candidate)
    return paths, False


def load_deck(path):
    """Return (deck_dict, error_string). Non-decks return (None, None)."""
    try:
        # utf-8-sig reads both plain UTF-8 and UTF-8-with-BOM (some Windows
        # editors add a BOM), so a BOM never shows up as a bogus failure.
        with open(path, 'r', encoding='utf-8-sig') as f:
            data = json.load(f)
    except Exception as e:
        return None, f"unreadable JSON ({e})"

    if not isinstance(data, dict) or 'cards' not in data:
        return None, None  # glossary/manifest/other file - not a deck
    if not isinstance(data['cards'], list):
        return None, "'cards' is not a list"
    return data, None


def check_deck(deck):
    """Return (duplicates, malformed) for one deck's cards."""
    positions = defaultdict(list)
    malformed = []

    for index, card in enumerate(deck['cards']):
        position = index + 1  # 1-based, matches "card #N" when reading the file
        if not isinstance(card, dict):
            malformed.append((position, 'card is not an object'))
            continue

        card_id = card.get('cardId')
        if card_id is None:
            malformed.append((position, 'no cardId field'))
        elif not isinstance(card_id, str):
            malformed.append((position, f'cardId is not a string ({card_id!r})'))
        elif not card_id.strip():
            malformed.append((position, 'cardId is empty'))
        else:
            positions[card_id].append(position)

    duplicates = {cid: pos for cid, pos in positions.items() if len(pos) > 1}
    return duplicates, malformed


def main():
    targets, scan_all = resolve_targets(sys.argv[1:])

    print("=====================================================")
    print("=== DECK CARD-ID UNIQUENESS CHECK                 ===")
    print("=====================================================")

    deck_ids_seen = defaultdict(list)
    checked = 0
    skipped = 0
    failed_decks = []

    for path in targets:
        name = os.path.basename(path)
        deck, error = load_deck(path)

        if deck is None:
            if error:
                print(f"FAIL:   [ERROR]   {name} -> {error}")
                failed_decks.append(name)
            else:
                skipped += 1
                if not scan_all:
                    print(f"DEBUG:  [SKIP]    {name} has no 'cards' array. Not a deck.")
            continue

        checked += 1
        cards = deck['cards']
        deck_id = deck.get('id', '(no id)')
        deck_ids_seen[deck_id].append(name)

        duplicates, malformed = check_deck(deck)
        unique_count = len({c.get('cardId') for c in cards
                            if isinstance(c, dict) and isinstance(c.get('cardId'), str)})

        if not duplicates and not malformed:
            print(f"VERIFY: [OK]      {name:<36} {len(cards):>5} cards, "
                  f"{unique_count} unique cardIds")
            continue

        failed_decks.append(name)
        print(f"FAIL:   [PROBLEM] {name:<36} {len(cards):>5} cards, "
              f"{unique_count} unique cardIds")

        for card_id, spots in sorted(duplicates.items()):
            spots_text = ', '.join(f'#{p}' for p in spots)
            print(f"          [DUP]     '{card_id}' used {len(spots)} times "
                  f"-> cards {spots_text}")

        for position, reason in malformed:
            print(f"          [MISSING] card #{position} -> {reason}")

    # Cross-deck check: two files must never share the same top-level deck id.
    colliding = {d: files for d, files in deck_ids_seen.items()
                 if len(files) > 1 and d != '(no id)'}
    if colliding:
        print("")
        for deck_id, files in sorted(colliding.items()):
            print(f"FAIL:   [DECKID]  deck id '{deck_id}' is shared by: "
                  f"{', '.join(files)}")
            failed_decks.extend(files)

    print("")
    print("=====================================================")
    print(f"VERIFY: Decks checked: {checked}")
    if skipped:
        print(f"VERIFY: Non-deck files skipped: {skipped}")

    if failed_decks:
        unique_failed = sorted(set(failed_decks))
        print(f"FAIL:   Decks with problems: {len(unique_failed)} -> "
              f"{', '.join(unique_failed)}")
        print("=====================================================")
        sys.exit(1)

    print("VERIFY: All cardIds are unique. Safe to commit.")
    print("=====================================================")
    sys.exit(0)


if __name__ == "__main__":
    main()
