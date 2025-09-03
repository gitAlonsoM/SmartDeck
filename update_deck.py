""" update_deck.py """
#! NO TOCAR ESTE SCRIPT, NO MODIFICAR, ESTE SCRIPT YA ESTA SIENDO USADO EN EL PROCESO DE MEJORA DE CARDS, 
#PARA PROCESOS CUSTOM, CREAR OTRO SCRIPT

import json
import argparse
import os
from datetime import datetime

def update_deck_file(deck_file_path, input_file_path):
    """
    Updates a deck JSON file with improved cards from an input JSON file.
    It finds cards by 'cardId' and replaces them. It also creates a backup.
    """
    # --- 1. Validate paths ---
    if not os.path.exists(deck_file_path):
        print(f"Error: Deck file not found at '{deck_file_path}'")
        return

    if not os.path.exists(input_file_path):
        print(f"Error: Input file not found at '{input_file_path}'")
        return

    # --- 2. Create a backup ---
    try:
        backup_dir = os.path.join(os.path.dirname(deck_file_path), 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        deck_filename = os.path.basename(deck_file_path)
        backup_path = os.path.join(backup_dir, f"{timestamp}_{deck_filename}")
        with open(deck_file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(original_content)
        print(f"Successfully created backup at '{backup_path}'")
    except Exception as e:
        print(f"Error creating backup: {e}")
        return

    # --- 3. Load data ---
    try:
        with open(deck_file_path, 'r', encoding='utf-8') as f:
            original_deck = json.load(f)
        with open(input_file_path, 'r', encoding='utf-8') as f:
            improved_cards_list = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from files: {e}")
        return
    except Exception as e:
        print(f"Error reading files: {e}")
        return

    # --- 4. Process and update ---
    original_cards = original_deck.get("cards", [])
    if not original_cards:
        print("Warning: The original deck has no 'cards' array.")
        return

    # Create a map for efficient lookup
    original_cards_map = {card['cardId']: card for card in original_cards if 'cardId' in card}
    updated_count = 0

    for improved_card in improved_cards_list:
        card_id = improved_card.get('cardId')
        if not card_id:
            print(f"Warning: Skipping an improved card because it has no 'cardId'. Content: {improved_card}")
            continue

        if card_id in original_cards_map:
            # Find the index in the original list to preserve order
            index_to_update = next((i for i, card in enumerate(original_cards) if card.get('cardId') == card_id), None)
            
            if index_to_update is not None:
                # Remove the 'review_request' object before updating
                if 'review_request' in improved_card:
                    del improved_card['review_request']
                
                original_cards[index_to_update] = improved_card
                updated_count += 1
                print(f"Updated card: {card_id}")
            else:
                 print(f"Logic Error: Card ID '{card_id}' was in map but not found in original list.")
        else:
            print(f"Warning: Card ID '{card_id}' from input file not found in the original deck. Skipping.")

    # --- 5. Save the final result ---
    if updated_count > 0:
        original_deck["cards"] = original_cards
        try:
            with open(deck_file_path, 'w', encoding='utf-8') as f:
                json.dump(original_deck, f, indent=2, ensure_ascii=False)
            print(f"\nUpdate complete. Successfully updated {updated_count} card(s) in '{deck_file_path}'.")
        except Exception as e:
            print(f"Error writing the updated deck file: {e}")
    else:
        print("\nNo cards were updated.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update a SmartDeck JSON file with improved cards.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "--deck-file",
        required=True,
        help="Path to the original deck JSON file to be updated (e.g., public/data/git_deck.json)."
    )
    parser.add_argument(
        "--input-file",
        required=True,
        help="Path to the JSON file containing the array of improved cards."
    )

    args = parser.parse_args()
    update_deck_file(args.deck_file, args.input_file)