import json
import os

# Configuration: Updated target file
target_file = 'public/data/phrasal_verbs_audio_choice.json'

def remove_categories():
    if not os.path.exists(target_file):
        print(f"Error: File not found at {target_file}")
        return

    print(f"Processing {target_file}...")

    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if "cards" not in data:
            print("Error: JSON structure invalid (missing 'cards' array).")
            return

        count = 0
        for card in data["cards"]:
            if "category" in card:
                del card["category"]
                count += 1

        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"Success! Removed 'category' from {count} cards.")
        print("VERIFY: Check your JSON file to confirm the changes.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    remove_categories()