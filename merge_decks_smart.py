import json
import os
import shutil
import re

# ================= CONFIGURATION =================
# DEFINE YOUR MIGRATION STRATEGY HERE
# -----------------------------------------------
# Target: Where the cards will go (Permanent Deck)
TARGET_DECK_REL_PATH = os.path.join('public', 'data', 'common_meeting.json')
TARGET_AUDIO_REL_DIR = os.path.join('public', 'data', 'audio', 'common_meeting')
TARGET_PREFIX = "mi" # New ID prefix (e.g., 'mi' for meeting)

# Source: Where the cards come from (Dummy/Staging Deck)
SOURCE_DECK_REL_PATH = os.path.join('public', 'data', 'dummy.json')
SOURCE_AUDIO_REL_DIR = os.path.join('public', 'data', 'audio', 'dummy')
SOURCE_PREFIX = "ti" # Prefix used in the dummy deck (to be replaced)
# =================================================

# Absolute Path Calculation (Ensures script runs from anywhere)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_DECK_PATH = os.path.join(BASE_DIR, TARGET_DECK_REL_PATH)
SOURCE_DECK_PATH = os.path.join(BASE_DIR, SOURCE_DECK_REL_PATH)
TARGET_AUDIO_DIR = os.path.join(BASE_DIR, TARGET_AUDIO_REL_DIR)
SOURCE_AUDIO_DIR = os.path.join(BASE_DIR, SOURCE_AUDIO_REL_DIR)

def load_json(path):
    if not os.path.exists(path):
        print(f"CRITICAL ERROR: File not found at {path}")
        exit(1)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            print(f"DEBUG: Loading file {os.path.basename(path)}...")
            return json.load(f)
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to load {path}. Reason: {e}")
        exit(1)

def save_json(path, data):
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"VERIFY: Saved updated file to {os.path.basename(path)}")
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to save {path}. Reason: {e}")

def get_max_id(cards, prefix):
    """
    Parses cards to find the highest ID number for the given prefix.
    Example: mi_194 -> 194
    """
    max_id = 0
    for card in cards:
        card_id = card.get('cardId', '')
        if card_id.startswith(prefix):
            try:
                # Expecting format: prefix_number (e.g., mi_194)
                parts = card_id.split('_')
                if len(parts) > 1:
                    # We take the last part as the number to be safe
                    num_part = parts[-1]
                    # Simple regex to extract number if there are suffixes
                    match = re.search(r'\d+', num_part)
                    if match:
                        num = int(match.group())
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
    if not old_json_path:
        return old_json_path

    # 1. Parse the filename from the JSON path
    # Example JSON path: "public/data/audio/dummy/ti_001_sideB_0.mp3"
    filename = os.path.basename(old_json_path) 
    
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
        # Check if it was already moved or simply doesn't exist
        if os.path.exists(new_fs_path):
             print(f"DEBUG: File already exists at target: {new_filename}")
        else:
             print(f"WARNING: Audio file not found on disk: {old_fs_path}. Skipping physical move.")

    # 6. Return the new JSON path string (Targeting the WEB path format)
    # We construct the path relative to 'public' for the JSON
    # Logic: public/data/audio/{target_folder_name}/{new_filename}
    target_folder_name = os.path.basename(TARGET_AUDIO_REL_DIR)
    new_json_path = f"public/data/audio/{target_folder_name}/{new_filename}"
    
    return new_json_path

def main():
    print("=== STARTING SMART DECK MERGE ===")
    print(f"SOURCE: {os.path.basename(SOURCE_DECK_PATH)}")
    print(f"TARGET: {os.path.basename(TARGET_DECK_PATH)}")
    
    # 1. Load Data
    target_data = load_json(TARGET_DECK_PATH)
    source_data = load_json(SOURCE_DECK_PATH)
    
    target_cards = target_data.get('cards', [])
    source_cards = source_data.get('cards', [])
    
    if not source_cards:
        print("VERIFY: Source deck is empty. Nothing to migrate.")
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
        old_id = card.get('cardId', 'unknown')
        
        # Generate New ID
        new_id = f"{TARGET_PREFIX}_{next_id_num:03d}"
        
        print(f"DEBUG: Processing Card {old_id} -> {new_id}")
        
        # Update Card ID
        card['cardId'] = new_id
        
        # Update Audio Paths in sideB (Array format)
        if 'sideB' in card and isinstance(card['sideB'], list):
            for item in card['sideB']:
                if isinstance(item, dict) and 'audioSrc' in item:
                    old_path = item['audioSrc']
                    new_path = move_audio_file(old_path, new_id, old_id)
                    item['audioSrc'] = new_path
        
        # Update Audio Paths in sideA (Object format)
        if 'sideA' in card and isinstance(card['sideA'], dict) and 'audioSrc' in card['sideA']:
             old_path = card['sideA']['audioSrc']
             new_path = move_audio_file(old_path, new_id, old_id)
             card['sideA']['audioSrc'] = new_path

        # Handle top-level audioSrc (AudioChoice format)
        if 'audioSrc' in card and isinstance(card['audioSrc'], str):
             old_path = card['audioSrc']
             new_path = move_audio_file(old_path, new_id, old_id)
             card['audioSrc'] = new_path

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