import json
import re
import os

def final_refactor_deck():
    """
    Final, corrected version.
    1. Correctly cleans cards with multiple modals, keeping the highest-priority one.
    2. PRESERVES the original text content of the note.
    3. Adds high-value 'Object Question' modals (ID 3) where needed.
    4. Provides detailed logging.
    """
    deck_path = os.path.join('public', 'data', 'common_meeting.json')
    
    if not os.path.exists(deck_path):
        print(f"ERROR: El archivo del mazo no fue encontrado en la ruta: {deck_path}")
        return

    # --- CONFIGURACIÓN DE REGLAS ---
    PRIORITY_ORDER = [
        2, 3, 50, 51, 4, 12, 19, 49, 5, 7, 10, 11, 8, 9, 46, 45, 14, 13, 33, 47, 
        20, 1, 6, 15, 18, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 
        35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 48, 17 
    ]
    PHRASAL_VERB_MODAL_ID = 16
    MODALS_TO_ADD = {
        "mi_041": 3, "mi_051": 3, "mi_053": 3, "mi_054": 3, "mi_057": 3,
        "mi_058": 3, "mi_062": 3, "mi_063": 3, "mi_064": 3,
    }

    print(f"--- Iniciando refactorización final de {deck_path} ---\n")

    try:
        with open(deck_path, 'r', encoding='utf-8') as f:
            deck_data = json.load(f)
    except Exception as e:
        print(f"ERROR: No se pudo leer o decodificar el archivo JSON. Causa: {e}")
        return

    cards_modified_count = 0
    modal_pattern = r'\*\*\[(\d+)\]\*\*'

    for card in deck_data.get('cards', []):
        card_id = card.get('cardId')
        note = card.get('note', '')
        original_note = note
        
        found_ids_str = re.findall(modal_pattern, note)
        
        # --- LÓGICA DE LIMPIEZA (CORREGIDA) ---
        if found_ids_str:
            original_ids = sorted([int(id_str) for id_str in found_ids_str])
            valid_modals = sorted([mid for mid in original_ids if mid != PHRASAL_VERB_MODAL_ID])
            
            if valid_modals != original_ids or len(valid_modals) > 1:
                chosen_modal_id = None
                
                if not valid_modals:
                    chosen_modal_id = -1
                elif len(valid_modals) == 1:
                    chosen_modal_id = valid_modals[0]
                else:
                    for pid in PRIORITY_ORDER:
                        if pid in valid_modals:
                            chosen_modal_id = pid
                            break
                    if not chosen_modal_id: chosen_modal_id = valid_modals[0]

                print(f"--- Procesando Card ID: {card_id} ---")
                print(f"DEBUG: Modales originales: {original_ids}")
                
                # --- LÓGICA DE EXTRACCIÓN DE TEXTO CORREGIDA ---
                note_parts = note.split('\n\n', 1)
                text_content = note_parts[1].strip() if len(note_parts) > 1 else ""

                if chosen_modal_id != -1:
                    print(f"INFO: Modales válidos: {valid_modals} -> Elegido: [{chosen_modal_id}]")
                    new_note = f"**[{chosen_modal_id}]**\n\n{text_content}"
                else:
                    print(f"INFO: Se eliminó el único modal (ID {PHRASAL_VERB_MODAL_ID}).")
                    new_note = text_content
                
                card['note'] = new_note
                print(f"NOTA ORIGINAL:\n'{original_note}'")
                print(f"NUEVA NOTA:\n'{new_note}'\n")
                cards_modified_count += 1
                continue

        # --- LÓGICA PARA AÑADIR MODALES ---
        if card_id in MODALS_TO_ADD and not found_ids_str:
            modal_to_add = MODALS_TO_ADD[card_id]
            new_note_content = f"**[{modal_to_add}]**"
            new_note = f"{new_note_content}\n\n{note}" if note else new_note_content
            
            card['note'] = new_note
            print(f"--- Procesando Card ID: {card_id} ---")
            print(f"INFO: Añadiendo modal faltante [{modal_to_add}].")
            print(f"NOTA ORIGINAL:\n'{original_note}'")
            print(f"NUEVA NOTA:\n'{new_note}'\n")
            cards_modified_count += 1

    if cards_modified_count > 0:
        try:
            with open(deck_path, 'w', encoding='utf-8') as f:
                json.dump(deck_data, f, indent=2, ensure_ascii=False)
            print(f"--- Finalizado: Se guardaron permanentemente los cambios en {cards_modified_count} tarjetas. ---")
        except Exception as e:
            print(f"ERROR CRÍTICO: No se pudo escribir en el archivo. Causa: {e}")
    else:
        print("--- Finalizado: No se necesitaron modificaciones. El archivo ya está correcto. ---")


if __name__ == '__main__':
    final_refactor_deck()