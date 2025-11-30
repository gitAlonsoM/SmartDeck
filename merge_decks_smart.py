import json
import os
import shutil
import re

# ================= CONFIGURATION =================
# Paths relative to the script location
TARGET_DECK_PATH = os.path.join('public', 'data', 'common_meeting.json')
SOURCE_DECK_PATH = os.path.join('public', 'data', 'tech_interview_deck_01.json')

# Audio Directories (Used for physical file moving)
# logic: public/data/audio/{folder_name}
TARGET_AUDIO_DIR = os.path.join('public', 'data', 'audio', 'common_meeting')
SOURCE_AUDIO_DIR = os.path.join('public', 'data', 'audio', 'tech_interview')

# ID Prefixes
TARGET_PREFIX = "mi"
SOURCE_PREFIX = "ti"  # Used to identify old IDs
# =================================================

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            print(f"DEBUG: Loading file {path}...")
            return json.load(f)
    except FileNotFoundError:
        print(f"CRITICAL ERROR: File not found at {path}")
        exit(1)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"VERIFY: Saved updated file to {path}")

def get_max_id(cards, prefix):
    """Parses cards to find the highest ID number (e.g., mi_194 -> 194)."""
    max_id = 0
    for card in cards:
        card_id = card.get('cardId', '')
        if card_id.startswith(prefix):
            try:
                # Extract number part: mi_194 -> 194
                parts = card_id.split('_')
                if len(parts) > 1:
                    num = int(parts[1])
                    if num > max_id:
                        max_id = num
            except ValueError:
                continue
    print(f"DEBUG: Max ID found for prefix '{prefix}': {max_id}")
    return max_id

def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"DEBUG: Created directory {directory}")

def move_audio_file(old_json_path, new_id, old_id):
    """
    Moves the physical file from source folder to target folder 
    and renames it with the new ID.
    Returns the new JSON path string.
    """
    # 1. Parse the filename from the JSON path
    # Example JSON path: "public/data/audio/tech_interview/ti_001_sideB_0.mp3"
    filename = os.path.basename(old_json_path) # ti_001_sideB_0.mp3
    
    # 2. Construct the Old File System Path
    old_fs_path = os.path.join(SOURCE_AUDIO_DIR, filename)
    
    # 3. Create New Filename (Replace old ID with New ID)
    # ti_001_sideB_0.mp3 -> mi_195_sideB_0.mp3
    new_filename = filename.replace(old_id, new_id)
    
    # 4. Construct New File System Path
    new_fs_path = os.path.join(TARGET_AUDIO_DIR, new_filename)
    
    # 5. Move the file if it exists
    if os.path.exists(old_fs_path):
        ensure_dir(TARGET_AUDIO_DIR)
        shutil.move(old_fs_path, new_fs_path)
        print(f"VERIFY: Moved Audio: {filename} -> {new_filename}")
    else:
        print(f"WARNING: Audio file not found on disk: {old_fs_path}. Skipping physical move.")

    # 6. Return the new JSON path string (always return this even if file is missing, to correct the JSON)
    # Force forward slashes for JSON
    new_json_path = f"public/data/audio/common_meeting/{new_filename}"
    return new_json_path

def main():
    print("=== STARTING SMART DECK MERGE ===")
    
    # 1. Load Data
    target_data = load_json(TARGET_DECK_PATH)
    source_data = load_json(SOURCE_DECK_PATH)
    
    target_cards = target_data.get('cards', [])
    source_cards = source_data.get('cards', [])
    
    if not source_cards:
        print("VERIFY: Source deck is empty. Nothing to do.")
        return

    # 2. Create Backups
    shutil.copy(TARGET_DECK_PATH, TARGET_DECK_PATH + ".bak")
    shutil.copy(SOURCE_DECK_PATH, SOURCE_DECK_PATH + ".bak")
    print("DEBUG: Backups created (.bak).")

    # 3. Determine Start ID
    last_id_num = get_max_id(target_cards, TARGET_PREFIX)
    next_id_num = last_id_num + 1
    
    print(f"DEBUG: Starting new IDs from: {TARGET_PREFIX}_{next_id_num:03d}")

    cards_migrated = 0
    
    # 4. Process Source Cards
    for card in source_cards:
        old_id = card['cardId']
        
        # Generate New ID
        new_id = f"{TARGET_PREFIX}_{next_id_num:03d}"
        
        print(f"DEBUG: Processing Card {old_id} -> {new_id}")
        
        # Update Card ID
        card['cardId'] = new_id
        
        # Update Audio Paths in sideB
        if 'sideB' in card and isinstance(card['sideB'], list):
            for item in card['sideB']:
                if 'audioSrc' in item:
                    old_path = item['audioSrc']
                    # Perform physical move and get new path string
                    new_path = move_audio_file(old_path, new_id, old_id)
                    item['audioSrc'] = new_path
        
        # Check sideA (rare but possible)
        if 'sideA' in card and isinstance(card['sideA'], dict) and 'audioSrc' in card['sideA']:
             old_path = card['sideA']['audioSrc']
             new_path = move_audio_file(old_path, new_id, old_id)
             card['sideA']['audioSrc'] = new_path

        # Add to target list
        target_cards.append(card)
        
        # Increment counters
        next_id_num += 1
        cards_migrated += 1

    # 5. Commit Changes
    target_data['cards'] = target_cards
    source_data['cards'] = [] # Empty the source deck
    
    print("--- SAVING FILES ---")
    save_json(TARGET_DECK_PATH, target_data)
    save_json(SOURCE_DECK_PATH, source_data)
    
    print(f"SUCCESS: Migrated {cards_migrated} cards.")
    print(f"VERIFY: New last ID in target is {TARGET_PREFIX}_{next_id_num - 1:03d}")
    print("=== END ===")

if __name__ == "__main__":
    main()