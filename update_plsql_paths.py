import json
import os
import datetime

# --- Configuration ---
# The path to the deck file you want to update.
DECK_FILE_PATH = "public/data/plsql_deck.json"
# ---------------------

def update_deck_audio_paths():
    """
    Reads the specified deck JSON file, creates a backup,
    and then adds or updates the 'questionAudioSrc' and 'answerAudioSrc'
    fields for every card based on its cardId.
    """
    print("--- 🐍 Starting Deck Audio Path Updater ---")
    
    # 1. Check if file exists
    if not os.path.exists(DECK_FILE_PATH):
        print(f"FATAL ERROR: File not found at '{DECK_FILE_PATH}'.")
        print("Please make sure the script is in the root of your project.")
        return

    print(f"DEBUG: Found deck file at '{DECK_FILE_PATH}'.")

    # 2. Create a backup
    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{DECK_FILE_PATH}.{timestamp}.bak"
        with open(DECK_FILE_PATH, 'r', encoding='utf-8') as f_in, \
             open(backup_path, 'w', encoding='utf-8') as f_out:
            f_out.write(f_in.read())
        print(f"VERIFY: Successfully created backup at '{backup_path}'.")
    except Exception as e:
        print(f"FATAL ERROR: Could not create backup file. Aborting. Error: {e}")
        return

    # 3. Read the JSON data
    try:
        with open(DECK_FILE_PATH, 'r', encoding='utf-8') as f:
            deck_data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"FATAL ERROR: Failed to decode JSON from '{DECK_FILE_PATH}'. Error: {e}")
        return
    except Exception as e:
        print(f"FATAL ERROR: Could not read file. Error: {e}")
        return

    # 4. Process the cards
    deck_id = deck_data.get("id")
    cards = deck_data.get("cards", [])
    
    if not deck_id or not cards:
        print("ERROR: Deck file is missing 'id' or 'cards' array. Cannot proceed.")
        return

    print(f"DEBUG: Processing deck '{deck_id}'. Found {len(cards)} cards.")
    
    modified_cards_counter = 0

    for i, card in enumerate(cards):
        print(f"\n--- Processing Card {i+1}/{len(cards)} ---")
        card_id = card.get("cardId")
        
        if not card_id:
            print(f"WARNING: Skipping card at index {i}, 'cardId' is missing.")
            continue
        
        print(f"DEBUG: Found cardId: '{card_id}'")
        card_modified_flag = False

        # Define the target paths
        target_q_path = f"public/data/audio/{deck_id}/{card_id}_q.mp3"
        target_a_path = f"public/data/audio/{deck_id}/{card_id}_a.mp3"

        # Check and update Question Audio Path
        current_q_path = card.get("questionAudioSrc")
        if current_q_path != target_q_path:
            if current_q_path:
                print(f"DEBUG: -> Updating 'questionAudioSrc' from '{current_q_path}'")
            else:
                print(f"DEBUG: -> Adding missing 'questionAudioSrc'")
            card["questionAudioSrc"] = target_q_path
            card_modified_flag = True
        else:
            print(f"DEBUG: -> 'questionAudioSrc' is already correct. Skipping.")

        # Check and update Answer Audio Path
        current_a_path = card.get("answerAudioSrc")
        if current_a_path != target_a_path:
            if current_a_path:
                print(f"DEBUG: -> Updating 'answerAudioSrc' from '{current_a_path}'")
            else:
                print(f"DEBUG: -> Adding missing 'answerAudioSrc'")
            card["answerAudioSrc"] = target_a_path
            card_modified_flag = True
        else:
            print(f"DEBUG: -> 'answerAudioSrc' is already correct. Skipping.")
        
        if card_modified_flag:
            modified_cards_counter += 1
            print(f"VERIFY: Card '{card_id}' was updated.")
        else:
            print(f"DEBUG: Card '{card_id}' required no changes.")

    print("\n--- Processing Finished ---")
    print(f"DEBUG: Total cards modified: {modified_cards_counter} / {len(cards)}")

    # 5. Write the updated data back to the original file
    try:
        with open(DECK_FILE_PATH, 'w', encoding='utf-8') as f:
            # Use indent=2 to match the original file formatting
            json.dump(deck_data, f, indent=2, ensure_ascii=False)
        print(f"VERIFY: Successfully saved updated data to '{DECK_FILE_PATH}'.")
    except Exception as e:
        print(f"FATAL ERROR: Could not write updated file. Error: {e}")
        print("Your original file is safe in the backup.")
        return

    print("--- 🐍 Deck Audio Path Updater Finished ---")

if __name__ == "__main__":
    update_deck_audio_paths() # Corrected function name