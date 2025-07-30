import json
import os
import re

def fix_deck_values_spacing(file_path):
    """
    Reads a deck file and specifically fixes an issue where an extra space
    was added after a newline in the 'value' field, then overwrites the file.
    """
    print(f"Starting 'value' field spacing correction for: {file_path}")
    print("This script will overwrite the original file.")

    # --- Read the file ---
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            deck_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file not found at {file_path}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {file_path}")
        return

    # --- Loop through cards and update the value in memory ---
    updated_count = 0
    cards = deck_data.get("cards", [])
    total_cards = len(cards)

    # This new pattern specifically looks for the incorrect format introduced by the first script:
    # A period or parenthesis, followed by a newline, a space, and a tilde.
    pattern_to_fix = r'([.)])\n( )(~)'
    replacement_logic = r'\1\n\3' # Rebuilds the string without the unwanted space (\2)

    for i, card in enumerate(cards):
        card_id = card.get("cardId", f"index_{i}")
        if "content" in card and "value" in card["content"]:
            original_value = card["content"]["value"]
            
            # Apply the correction
            modified_value = re.sub(pattern_to_fix, replacement_logic, original_value)
            
            # If a change was made, update the card and increment the counter
            if original_value != modified_value:
                card["content"]["value"] = modified_value
                updated_count += 1

    print(f"\nCorrection complete. {updated_count} of {total_cards} cards had their 'value' updated.")
    if updated_count == 0:
        print("No cards needed correction, the format might already be correct.")

    # --- Save the updated data back to the original file ---
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(deck_data, f, ensure_ascii=False, indent=2)
        print(f"Changes saved successfully to: {file_path}")
    except Exception as e:
        print(f"Error saving file to {file_path}: {e}")


if __name__ == '__main__':
    # --- CONFIGURATION ---
    # The path to the file you want to modify.
    DECK_FILE_PATH = os.path.join('public', 'data', 'phrasal_verbs_audio_choice.json')
    
    # --- EXECUTION ---
    # The script will read and write to the same file specified in DECK_FILE_PATH.
    fix_deck_values_spacing(DECK_FILE_PATH)