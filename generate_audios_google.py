"""
generate_audios_google.py

This script generates Text-to-Speech (TTS) audio files using the 
FREE Google Translate TTS API (via gTTS library).

-------------------------------------------------------------------------------
-- Prerequisites --
-------------------------------------------------------------------------------
1.  py -m pip install gTTS
2.  Internet connection (it hits Google servers).

-------------------------------------------------------------------------------
-- Usage --
-------------------------------------------------------------------------------
py generate_audios_google.py public\data\english_grammar_audio_choice.json
"""

import os
import json
import time
import argparse
# If this import fails, ensure you ran: py -m pip install gTTS
from gtts import gTTS

# ==============================================================================
# --- Script Logic ---
# ==============================================================================

def _generate_single_audio(text_to_speak, audio_path, card_id_for_log):
    """Generates a single audio file using Google TTS (gTTS) and saves it."""
    
    # 1. Check if file exists to save time/bandwidth
    # Note: We skip existing files so we don't overwrite the good Azure ones
    if os.path.exists(audio_path):
        print(f"DEBUG: File already exists. Skipping generation for '{audio_path}'.")
        return True

    # 2. Ensure directory exists
    os.makedirs(os.path.dirname(audio_path), exist_ok=True)

    print(f"DEBUG: Generating Google Audio for: '{text_to_speak[:40]}...'")
    
    try:
        # 3. Create TTS Object
        # lang='en' -> English
        # tld='com' -> US Accent (use 'co.uk' for British, 'com.au' for Australian)
        tts = gTTS(text=text_to_speak, lang='en', tld='com', slow=False)
        
        # 4. Save file
        tts.save(audio_path)
        
        # 5. Verification
        if os.path.exists(audio_path):
            print(f"VERIFY: Google TTS audio created at '{audio_path}'")
            return True
        else:
            print(f"ERROR: File was not saved at '{audio_path}'")
            return False

    except Exception as e:
        print(f"FATAL ERROR generating '{card_id_for_log}': {e}")
        return False

def generate_audio_for_deck(deck_file_path):
    """Reads a deck file and generates audio files based on the card structure."""
    print("--- Starting Google Audio Generation ---")
    
    try:
        with open(deck_file_path, 'r', encoding='utf-8') as f:
            deck_data = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: Deck file not found at '{deck_file_path}'.")
        return
    except json.JSONDecodeError:
        print(f"ERROR: Invalid JSON at '{deck_file_path}'.")
        return

    cards = deck_data.get("cards", [])
    deck_name = deck_data.get('name', 'UnknownDeck')
    deck_type = deck_data.get("deckType")
    
    print(f"DEBUG: Loaded deck '{deck_name}' (Type: {deck_type}). Processing {len(cards)} cards.")

    files_generated = 0

    for i, card in enumerate(cards):
        card_id = card.get("cardId")
        if not card_id:
            continue

        # --- Polymorphic Audio Generation Logic ---

        # 1. audioChoice
        if deck_type == "audioChoice":
            audio_src = card.get("audioSrc")
            text_to_speak = card.get("correctAnswer")
            if audio_src and text_to_speak:
                if _generate_single_audio(text_to_speak, audio_src, card_id): files_generated += 1
            continue

        # 2. multipleChoice
        if deck_type == "multipleChoice":
             question_text = card.get("question")
             q_audio_src = card.get("questionAudioSrc")
             if question_text and q_audio_src:
                 if _generate_single_audio(question_text, q_audio_src, f"{card_id}_Q"): files_generated += 1
            
             answer_text = card.get("correctAnswer")
             a_audio_src = card.get("answerAudioSrc")
             if answer_text and a_audio_src:
                 if _generate_single_audio(answer_text, a_audio_src, f"{card_id}_A"): files_generated += 1
             continue

        # 3. Flippable (Conversation)
        side_a_data = card.get("sideA")
        conversation = None
        if isinstance(side_a_data, dict):
            conversation = side_a_data.get("conversation")

        if isinstance(conversation, list):
            for part_index, part in enumerate(conversation):
                text = part.get("text")
                audio_src = part.get("audioSrc")
                if text and audio_src:
                    if _generate_single_audio(text, audio_src, f"{card_id}_P{part_index}"): files_generated += 1
            continue

        # 4. Flippable (Structured Side B) -> MOST COMMON
        side_b_structured = card.get("sideB")
        if deck_type == "flippable" and isinstance(side_b_structured, list) and side_b_structured and isinstance(side_b_structured[0], dict):
            for part_index, part in enumerate(side_b_structured):
                text = part.get("text")
                audio_src = part.get("audioSrc")
                if text and audio_src:
                    if _generate_single_audio(text, audio_src, f"{card_id}_SB{part_index}"): files_generated += 1
            continue
        
        # 5. Flippable (Legacy)
        audio_path_legacy = card.get("audioSrc")
        text_to_speak_legacy = card.get("sideB", [None])[0]
        if audio_path_legacy and text_to_speak_legacy:
            if _generate_single_audio(text_to_speak_legacy, audio_path_legacy, card_id): files_generated += 1
            continue

    print(f"\n--- Finished. Generated {files_generated} new files. ---")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate FREE TTS audio using Google.")
    parser.add_argument("deck_file_path", type=str, help="Path to JSON deck file.")
    args = parser.parse_args()
    
    generate_audio_for_deck(args.deck_file_path)