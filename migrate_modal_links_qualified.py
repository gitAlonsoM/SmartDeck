"""
migrate_modal_links_qualified.py

One-shot migration: rewrites unqualified modal link markup `**[N]**` to qualified
`**[<alias>:N]**` across every deck JSON file in public/data/.

Routing rule (matches the historical hard-coded SmartDeck logic):
    - deck.id contains 'phrasal'  -> alias 'pv' (phrasal_verbs glossary)
    - otherwise                   -> alias 'er' (english_rules glossary)

Fields rewritten per card:
    - card['note']               (flippable decks)
    - card['content']['value']   (multipleChoice / audioChoice decks)

Skips public/data/glossary/, public/data/backups/, deck_unlock_codes.json,
.bak files, and audio folders. Backups land in public/data/backups/<ts>_<file>.

Idempotent: if a file has no unqualified `**[N]**` left, it's untouched.

Usage:
    py migrate_modal_links_qualified.py
"""

import json
import os
import re
import shutil
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')
BACKUP_DIR = os.path.join(DATA_DIR, 'backups')

SKIP_FILENAMES = {'deck_unlock_codes.json'}
SKIP_DIR_NAMES = {'glossary', 'backups', 'audio'}

UNQUALIFIED_RE = re.compile(r'\*\*\[(\d+)\]\*\*')


def deck_alias(deck_id):
    return 'pv' if 'phrasal' in (deck_id or '').lower() else 'er'


def backup(src_path):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    dst = os.path.join(BACKUP_DIR, f'{ts}_{os.path.basename(src_path)}')
    shutil.copy2(src_path, dst)
    return dst


def rewrite_string(s, alias):
    """Return (new_s, count_of_replacements)."""
    if not isinstance(s, str) or '**[' not in s:
        return s, 0
    count = [0]
    def repl(m):
        count[0] += 1
        return f'**[{alias}:{m.group(1)}]**'
    new_s = UNQUALIFIED_RE.sub(repl, s)
    return new_s, count[0]


def rewrite_card(card, alias):
    """Rewrite note + content.value in-place; return total replacement count."""
    total = 0
    if isinstance(card.get('note'), str):
        new_note, n = rewrite_string(card['note'], alias)
        if n:
            card['note'] = new_note
            total += n
    content = card.get('content')
    if isinstance(content, dict) and isinstance(content.get('value'), str):
        new_val, n = rewrite_string(content['value'], alias)
        if n:
            content['value'] = new_val
            total += n
    return total


def migrate_deck_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            deck = json.load(f)
    except Exception as exc:
        print(f'SKIP (parse error): {os.path.relpath(path, BASE_DIR)} -> {exc}')
        return

    if not isinstance(deck, dict) or not isinstance(deck.get('cards'), list):
        return  # not a deck file

    alias = deck_alias(deck.get('id'))
    total_replacements = 0
    cards_touched = 0
    for card in deck['cards']:
        if not isinstance(card, dict):
            continue
        n = rewrite_card(card, alias)
        if n:
            total_replacements += n
            cards_touched += 1

    rel = os.path.relpath(path, BASE_DIR)
    if total_replacements == 0:
        print(f'{rel} [alias={alias}]: no unqualified markup found.')
        return

    backup_path = backup(path)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(deck, f, indent=2, ensure_ascii=False)
    print(f'{rel} [alias={alias}]: rewrote {total_replacements} occurrence(s) across {cards_touched} card(s). backup: {os.path.relpath(backup_path, BASE_DIR)}')


def main():
    for entry in sorted(os.listdir(DATA_DIR)):
        full = os.path.join(DATA_DIR, entry)
        if os.path.isdir(full):
            continue
        if entry in SKIP_FILENAMES:
            continue
        if not entry.endswith('.json'):
            continue
        migrate_deck_file(full)


if __name__ == '__main__':
    main()
