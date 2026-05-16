"""
migrate_glossary_add_description.py

One-shot migration: adds an internal `description` field (empty string) to every
entry in public/data/glossary/english_rules.json and public/data/glossary/phrasal_verbs.json.

The description is INTERNAL — never shown in the SmartDeck UI. It is fed to the
LLM in the minified Modal Catalog (ImprovementService.handleExport) so the model
can pick the right modal when the user asks "add an appropriate modal to this card".

Idempotent: entries that already have a `description` key are left alone.
Backups land in public/data/glossary/backups/<timestamp>_<file>.

Usage:
    py migrate_glossary_add_description.py
"""

import json
import os
import shutil
from collections import OrderedDict
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GLOSSARY_DIR = os.path.join(BASE_DIR, 'public', 'data', 'glossary')
BACKUP_DIR = os.path.join(GLOSSARY_DIR, 'backups')
FILES = ['english_rules.json', 'phrasal_verbs.json']


def backup(src_path):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    dst = os.path.join(BACKUP_DIR, f'{ts}_{os.path.basename(src_path)}')
    shutil.copy2(src_path, dst)
    return dst


def add_description_to_entry(entry):
    """Insert `description: ""` between `title` and `content` (preserve order)."""
    if 'description' in entry:
        return entry, False
    new = OrderedDict()
    for k, v in entry.items():
        new[k] = v
        if k == 'title':
            new['description'] = ''
    if 'description' not in new:
        new['description'] = ''
    return new, True


def migrate_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f, object_pairs_hook=OrderedDict)

    if not isinstance(data, dict):
        print(f'  skip (not a dict): {path}')
        return

    touched = 0
    total = len(data)
    new_data = OrderedDict()
    for key, entry in data.items():
        if isinstance(entry, dict):
            new_entry, changed = add_description_to_entry(entry)
            if changed:
                touched += 1
            new_data[key] = new_entry
        else:
            new_data[key] = entry

    if touched == 0:
        print(f'{os.path.basename(path)}: 0 / {total} entries needed update; file unchanged.')
        return

    backup_path = backup(path)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, indent=2, ensure_ascii=False)
    print(f'{os.path.basename(path)}: added description to {touched} / {total} entries (backup: {os.path.relpath(backup_path, BASE_DIR)})')


def main():
    for name in FILES:
        path = os.path.join(GLOSSARY_DIR, name)
        if not os.path.exists(path):
            print(f'SKIP (not found): {path}')
            continue
        migrate_file(path)


if __name__ == '__main__':
    main()
