import json
import re
import os

# ==============================================================================
# CONFIGURACIÓN
# ==============================================================================
# 1. Ruta al glosario que tiene los IDs y títulos.
GLOSSARY_FILE = 'public\data\glossary\english_rules.json'

# 2. Archivo de mazo (deck) que quieres actualizar.
DECK_TO_UPDATE = 'public\data\common_meeting.json'
# ==============================================================================

def load_json(file_path):
    """Loads a JSON file with UTF-8 encoding."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"ERROR: El archivo no fue encontrado: {file_path}")
        return None
    except json.JSONDecodeError:
        print(f"ERROR: El archivo JSON está mal formado: {file_path}")
        return None

def save_json(file_path, data):
    """Saves data to a JSON file with UTF-8 encoding and pretty-printing."""
    try:
        # Create a backup of the original file
        backup_path = file_path + '.bak'
        if os.path.exists(file_path):
            os.rename(file_path, backup_path)
            print(f"INFO: Backup del archivo original creado en: {backup_path}")

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"SUCCESS: Archivo guardado correctamente en: {file_path}")
    except Exception as e:
        print(f"ERROR: No se pudo guardar el archivo {file_path}. Causa: {e}")

def create_title_to_id_map(glossary_data):
    """Creates an inverted map from a rule's title to its ID."""
    title_map = {}
    for rule_id, rule_details in glossary_data.items():
        title = rule_details.get('title')
        if title:
            # Store the title exactly as it appears for a precise match
            title_map[title.strip()] = rule_id
    print(f"INFO: Mapa de Título -> ID creado con {len(title_map)} entradas.")
    return title_map

def main():
    """Main script execution."""
    print("--- Iniciando script de refactorización de notas ---")
    
    glossary_data = load_json(GLOSSARY_FILE)
    if not glossary_data:
        print("CRITICAL: No se pudo cargar el glosario. Abortando script.")
        return

    title_to_id = create_title_to_id_map(glossary_data)
    
    print(f"\n--- Procesando mazo: {DECK_TO_UPDATE} ---")
    deck_data = load_json(DECK_TO_UPDATE)
    if not deck_data or 'cards' not in deck_data:
        print(f"WARNING: El archivo {DECK_TO_UPDATE} no tiene el formato esperado o está vacío. Abortando.")
        return

    replacements_count = 0
    
    def replacement_handler(match):
        nonlocal replacements_count
        title = match.group(1).strip()
        
        rule_id = title_to_id.get(title)
        
        if rule_id:
            replacements_count += 1
            print(f"  -> Reemplazando '{title}' por '**[{rule_id}]**'")
            return f'**[{rule_id}]**'
        else:
            # If the title is not in our map, we don't touch it.
            # This is key to only changing the cards that need it.
            return match.group(0)

    for card in deck_data['cards']:
        if 'note' in card and card['note']:
            # Use re.sub with a handler function for dynamic replacement
            card['note'] = re.sub(r'\*\*([^*]+)\*\*', replacement_handler, card['note'])
    
    if replacements_count > 0:
        print(f"\nINFO: Se realizaron {replacements_count} reemplazos en total.")
        save_json(DECK_TO_UPDATE, deck_data)
    else:
        print("\nINFO: No se encontraron títulos para reemplazar. El archivo no ha sido modificado.")

    print("\n--- Script de refactorización completado. ---")

if __name__ == "__main__":
    main()