# refactor_hints.py

import json
import os

def refactor_deck_hints(file_path):
    """
    Reads a deck file, refactors the 'hint' value for all cards with new,
    non-redundant information, and overwrites the original file.
    """
    print(f"Iniciando la refactorización de hints para: {file_path}")
    print("Este script sobrescribirá el archivo original.")

    # A comprehensive map of cardId to its new, value-adding, non-redundant hint.
    hint_map = {
        "egac_001": "While 'see' is a passive sense, 'look at' implies a conscious and directed action.",
        "egac_002": "Think of 'enter' as containing the preposition 'into' within its meaning.",
        "egac_003": "This structure is also common for gradual changes, like 'it's getting dark'.",
        "egac_004": "This tense is perfect for answering 'how long' questions about an ongoing action.",
        "egac_005": "Unlike 'would', 'used to' can describe past states (e.g., 'I used to be shy') in addition to actions.",
        "egac_006": "This structure often implies that something prevented the plan from happening.",
        "egac_007": "This perfect modal often carries a tone of criticism or advice about the past.",
        "egac_008": "Using the infinitive 'To read...' as a subject is possible but sounds much more formal.",
        "egac_009": "Other adjectives that pair with 'in' include 'successful in' and 'experienced in'.",
        "egac_010": "The passive voice is often used when the person performing the action is unknown or unimportant.",
        "egac_011": "Using 'it' here would be incorrect, as 'it' must refer to a specific thing already mentioned.",
        "egac_012": "The word order of a subject question is simple: Question Word + Verb + Object.",
        "egac_013": "The very formal alternative is 'For what are you looking?', but this is rarely used in conversation.",
        "egac_014": "This conditional is often used for giving advice, e.g., 'If I were you, I would...'",
        "egac_015": "This conditional is often used to express regrets about the past.",
        "egac_016": "The word 'children' itself is an old plural form, not ending in 's'.",
   
    }
    
    # --- Read the file ---
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            deck_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Archivo de entrada no encontrado en {file_path}")
        return
    except json.JSONDecodeError:
        print(f"Error: No se pudo decodificar el JSON de {file_path}")
        return

    # --- Loop through cards and update the hint value in memory ---
    updated_count = 0
    missing_count = 0
    total_cards = len(deck_data.get("cards", []))
    
    for card in deck_data.get("cards", []):
        card_id = card.get("cardId")
        if card_id and card_id in hint_map:
            card["hint"] = hint_map[card_id]
            updated_count += 1
        else:
            missing_count += 1
            print(f"Advertencia: No se encontró un hint para la cardId: {card_id}")

    print(f"Refactorización completada. Se actualizaron {updated_count} de {total_cards} tarjetas.")
    if missing_count > 0:
        print(f"Faltaron hints para {missing_count} tarjetas.")

    # --- Save the updated data back to the original file ---
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(deck_data, f, ensure_ascii=False, indent=2)
        print(f"Cambios guardados exitosamente en: {file_path}")
    except Exception as e:
        print(f"Error al guardar el archivo en {file_path}: {e}")


if __name__ == '__main__':
    # --- CONFIGURACIÓN ---
    # La ruta al archivo que quieres modificar.
    DECK_FILE_PATH = os.path.join('public', 'data', 'english_grammar_audio_choice.json')
    
    # --- EJECUCIÓN ---
    # El script leerá y escribirá en el mismo archivo.
    refactor_deck_hints(DECK_FILE_PATH)