import json
import os

# The relative path to the deck file from the project root
DECK_FILE_PATH = os.path.join('public', 'data', 'common_meeting.json')

# Corrected dictionary mapping cardId to the rule text.
# The text in **...** must match exactly what will be sanitized.
CARD_NOTE_UPDATES = {
    'mi_001': 'Rules: **Phrasal Verbs**, **False Friends**, **Make vs. Do**.',
    'mi_006': 'Rules: **Modal Verbs Future Tense**, **Possessive Nouns**.',
    'mi_011': 'Rule: **Prepositions of Time**.',
    'mi_017': 'Rule: **Adjective vs. Adverb**.',
    'mi_019': 'Rule: **Still vs. Yet**.',
    'mi_022': 'Rule: **Prepositions For vs. Of**.',
    'mi_023': 'Rule: **Question Formation Auxiliaries**.',
    'mi_051': 'Rule: **Subject-Verb Agreement Questions**.',
    'mi_052': 'Rule: **Subject-Verb Agreement Questions**.',
    'mi_053': 'Rule: **Subject-Verb Agreement Questions**.',
    'mi_054': 'Rule: **Subject-Verb Agreement Questions**.',
    'mi_065': 'Rule: **Negative Questions**.',
    'mi_066': 'Rule: **Negative Questions**.',
    'mi_067': 'Rule: **Negative Questions**.',
    'mi_068': 'Rule: **Negative Questions**.',
    'mi_069': 'Rule: **Negative Questions**.',
}

def update_deck_notes():
    """
    Reads the specified deck file, prepends new rule text to the notes of
    specific cards, and overwrites the file with the updated data.
    """
    try:
        with open(DECK_FILE_PATH, 'r', encoding='utf-8') as f:
            deck_data = json.load(f)
        print(f"Successfully loaded deck: {deck_data.get('name')}")
    except FileNotFoundError:
        print(f"ERROR: Deck file not found at '{DECK_FILE_PATH}'. Make sure the path is correct.")
        return
    except json.JSONDecodeError:
        print(f"ERROR: Could not decode JSON from '{DECK_FILE_PATH}'. Check for syntax errors.")
        return

    updated_cards_count = 0
    
    # Iterate through each card in the deck
    for card in deck_data.get('cards', []):
        card_id = card.get('cardId')
        
        # Check if this card is in our update list
        if card_id in CARD_NOTE_UPDATES:
            new_note_prefix = CARD_NOTE_UPDATES[card_id]
            original_note = card.get('note', '')
            
            # Prevent adding the same prefix multiple times if script is re-run
            if original_note and original_note.strip().startswith("Rules:") or original_note.strip().startswith("Rule:"):
                print(f"  -> Skipping card {card_id}, rule already prepended.")
                continue

            # Prepend the new rule text, ensuring a clean separation
            if original_note:
                card['note'] = f"{new_note_prefix}\n\n{original_note}"
            else:
                card['note'] = new_note_prefix
            
            print(f"  -> Updated note for card: {card_id}")
            updated_cards_count += 1
            
    if updated_cards_count > 0:
        try:
            # Write the modified data back to the same file
            with open(DECK_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(deck_data, f, ensure_ascii=False, indent=2)
            print(f"\nSUCCESS: Updated {updated_cards_count} cards and saved the file '{DECK_FILE_PATH}'.")
        except Exception as e:
            print(f"\nERROR: Failed to write updates to file. Reason: {e}")
    else:
        print("\nNo new cards were updated.")

if __name__ == '__main__':
    update_deck_notes()