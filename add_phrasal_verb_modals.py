# add_phrasal_verb_modals.py
# This script injects modal IDs into the phrasal verb deck
# using a pre-defined, manually verified map.
# It does NOT rely on name matching.

import json
import os
import datetime
import re

# --- Configuration ---
DECK_FILE_PATH = 'public/data/phrasal_verbs_audio_choice.json'
BACKUP_DIR = 'public/data/backups'

# --- 
# MAPA DE CORRESPONDENCIA MANUAL (CARD -> MODAL)
# Definido por Mouse, Asistente Experto.
# Formato: { "cardId": "modalId" }
# ---
CARD_TO_MODAL_MAP = {
    "pvac_001": "188",  # up to
    "pvac_002": "188",  # up to
    "pvac_003": "11",   # break up
    "pvac_004": "11",   # broke up -> (break up)
    "pvac_005": "14",   # bring up
    "pvac_006": "14",   # brought up -> (bring up)
    "pvac_007": "15",   # build up
    "pvac_008": "25",   # catch up
    "pvac_009": "26",   # catch up on
    "pvac_010": "32",   # clean up
    "pvac_011": "38",   # came up -> (come up)
    "pvac_012": "39",   # came up with -> (come up with)
    "pvac_013": "80",   # give up (on) -> (give up on)
    "pvac_014": "79",   # gave up -> (give up)
    "pvac_015": "89",   # grow up
    "pvac_016": "117",  # look it up -> (look up)
    "pvac_017": "117",  # looking up -> (look up)
    "pvac_018": "122",  # made up -> (make up)
    "pvac_019": "122",  # made up -> (make up)
    "pvac_020": "131",  # pick you up -> (pick up)
    "pvac_021": "131",  # picked up -> (pick up)
    "pvac_022": "140",  # puts up with -> (put up with)
    "pvac_023": "150",  # set up
    "pvac_024": "153",  # showed up -> (show up)
    "pvac_025": "165",  # stand up
    "pvac_026": "167",  # stay up
    "pvac_027": "169",  # stir up
    "pvac_028": "187",  # turned up -> (turn up)
    "pvac_029": "187",  # turn up
    "pvac_030": "196",  # wrap up
    "pvac_031": "10",   # broke down -> (break down)
    "pvac_032": "10",   # broke down -> (break down)
    "pvac_033": "16",   # burned down -> (burn down)
    "pvac_034": "20",   # calm down
    "pvac_0035": "34",  # close down (ID con typo en el JSON original)
    "pvac_036": "43",   # cut down on
    "pvac_037": "84",   # gone down -> (go down)
    "pvac_038": "105",  # let me down -> (let down)
    "pvac_039": "137",  # put down
    "pvac_040": "155",  # shut down
    "pvac_041": "158",  # sit down
    "pvac_042": "160",  # slow down
    "pvac_043": "184",  # turned down -> (turn down)
    "pvac_044": "193",  # wind down
    "pvac_045": "197",  # write down
    "pvac_046": "29",   # check out
    "pvac_047": "51",   # drop out
    "pvac_048": "56",   # figure out
    "pvac_049": "58",   # fill out
    "pvac_050": "59",   # find out
    "pvac_051": "62",   # freak out
    "pvac_052": "72",   # get out
    "pvac_053": "78",   # giving out -> (give out)
    "pvac_054": "78",   # gave out -> (give out)
    "pvac_055": "92",   # handed out -> (hand out)
    "pvac_056": "147",  # ran out (of) -> (run out of)
    "pvac_057": "161",  # sort out
    "pvac_058": "164",  # stand out
    "pvac_059": "175",  # take out
    "pvac_060": "175",  # take out
    "pvac_061": "194",  # work out
    "pvac_062": "194",  # work out
    "pvac_063": "126",  # off
    "pvac_064": "126",  # off
    "pvac_065": "19",   # call off
    "pvac_066": "44",   # cut off
    "pvac_067": "50",   # drop me off -> (drop off)
    "pvac_068": "77",   # give off
    "pvac_069": "129",  # paid off -> (pay off)
    "pvac_070": "138",  # put off
    "pvac_071": "149",  # set off
    "pvac_072": "154",  # showing off -> (show off)
    "pvac_073": "174",  # take off
    "pvac_074": "174",  # take off
    "pvac_075": "185",  # turn off
    "pvac_076": "23",   # carry on
    "pvac_077": "41",   # count on
    "pvac_078": "46",   # depends on
    "pvac_079": "60",   # focus on
    "pvac_080": "86",   # going on -> (go on)
    "pvac_081": "108",  # log on
    "pvac_082": "139",  # put on
    "pvac_083": "181",  # try on
    "pvac_084": "186",  # turn on
    "pvac_085": "67",   # get away
    "pvac_086": "67",   # get away
    "pvac_087": "99",   # Keep away -> (keep away)
    "pvac_088": "136",  # put away
    "pvac_089": "172",  # take away
    "pvac_090": "37",   # come back
    "pvac_091": "83",   # go back
    "pvac_092": "168",  # stick around
    "pvac_093": "182",  # turn around
    "pvac_094": "127",  # over
    "pvac_095": "73",   # get over
    "pvac_096": "87",   # go over
    "pvac_097": "88",   # gone through -> (go through)
    "pvac_098": "1",    # agree with
    "pvac_099": "2",    # apologize for
    "pvac_100": "4",    # ask for
    "pvac_101": "21",   # cares about -> (care about)
    "pvac_102": "22",   # caring for -> (care for)
    "pvac_103": "64",   # get along
    "pvac_104": "109",  # look after
    "pvac_105": "112",  # looking for -> (look for)
    "pvac_106": "114",  # looking into -> (look into)
    "pvac_107": "113",  # looking forward to
    "pvac_108": "142",  # ran into -> (run into)
    "pvac_109": "171",  # takes after -> (take after)
    "pvac_110": "173",  # take care of
    "pvac_111": "177",  # think about
    "pvac_112": "178",  # think of
    "pvac_113": "190",  # waiting for -> (wait for)
    "pvac_114": "195",  # worry about
    "pvac_115": "54",   # fell asleep -> (fall asleep)
    "pvac_116": "55",   # feel like
    "pvac_117": "69",   # get by
    "pvac_118": "71",   # get on with
    "pvac_119": "74",   # get rid of
    "pvac_120": "76",   # gave in -> (give in)
    "pvac_121": "81",   # go ahead
    "pvac_122": "100",  # keep going
    "pvac_123": "106",  # let (in)
    "pvac_124": "115",  # look like
    "pvac_125": "28",   # check in
    "pvac_126": "57",   # fill in
    "pvac_127": "91",   # hand in
    "pvac_128": "107",  # log in
    "pvac_129": "49",   # drop in
    "pvac_130": "166",  # stay in
    "pvac_131": "39",   # come up with
    "pvac_132": "43",   # cut down on
    "pvac_133": "65",   # get along with
    "pvac_134": "68",   # get away with
    "pvac_135": "113",  # looking forward to
    "pvac_136": "111",  # look down on
    "pvac_137": "118",  # looked up to -> (look up to)
    "pvac_138": "140",  # put up with
    "pvac_139": "147",  # running out of -> (run out of)
    "pvac_140": "27",   # catch up with
    "pvac_141": "144",  # roll out
    "pvac_142": "48",   # drill down
    "pvac_143": "61",   # follow up
    "pvac_144": "8",    # back up
    "pvac_145": "141",  # ramp up
    "pvac_146": "156",  # sign off on
    "pvac_147": "97",   # iron out
    "pvac_148": "180",  # touch base
    "pvac_149": "102",  # kick off
    "pvac_150": "31",   # circle back
    "pvac_151": "17",   # buy-in
    "pvac_152": "135",  # push back
    "pvac_153": "13",   # bring forward
    "pvac_154": "103",  # lay out
    "pvac_155": "47",   # draw up
    "pvac_156": "10",   # break down
    "pvac_157": "148",  # scale up
    "pvac_158": "130",  # phase out
    "pvac_159": "198",  # zero in on
    "pvac_160": "45",   # deal with
    "pvac_161": "122",  # make up
    "pvac_162": "39",   # come up with
    "pvac_163": "10",   # break down
    "pvac_164": "184",  # turned him down -> (turn down)
    "pvac_165": "161",  # sort out
    "pvac_166": "164",  # stand out
    "pvac_167": "185",  # turned off -> (turn off)
    "pvac_168": "129",  # pay off
    "pvac_169": "86",   # went on -> (go on)
    "pvac_170": "46",   # depends on -> (depend on)
    "pvac_171": "5",    # away
    "pvac_172": "6",    # back
    "pvac_173": "116",  # looked over -> (look over)
    "pvac_174": "88",   # go through
    "pvac_175": "3",    # apply to
    "pvac_176": "1",    # agree with
    "pvac_177": "2",    # apologize for
    "pvac_178": "4",    # ask for
    "pvac_179": "21",   # care about
    "pvac_180": "22",   # care for
    "pvac_181": "112",  # looking for -> (look for)
    "pvac_182": "171",  # take after
    "pvac_183": "178",  # think of
    "pvac_184": "54",   # fell asleep -> (fall asleep)
    "pvac_185": "55",   # feel like
    "pvac_186": "69",   # get by
    "pvac_187": "71",   # get on with
    "pvac_188": "74",   # got rid of -> (get rid of)
    "pvac_189": "100",  # keep going
    "pvac_190": "115",  # looks like -> (look like)
    "pvac_191": "18",   # buy into
    "pvac_192": "135",  # push back
    "pvac_193": "148",  # scale up
    "pvac_194": "45",   # deal with
    "pvac_195": "15",   # building up -> (build up)
    "pvac_196": "193",  # wind down
    "pvac_197": "146",  # running out -> (run out)
    "pvac_198": "174",  # took off -> (take off)
    "pvac_199": "153",  # show up
    "pvac_200": "122",  # make up
    "pvac_201": "30",   # cheer up
    "pvac_202": "30",   # cheer (her) up -> (cheer up)
    "pvac_203": "53",   # ended up -> (end up)
    "pvac_204": "53",   # ended up -> (end up)
    "pvac_205": "189",  # used up -> (use up)
    "pvac_206": "189",  # used up -> (use up)
    "pvac_207": "7",    # backed down -> (back down)
    "pvac_208": "7",    # back down
    "pvac_209": "151",  # settle down
    "pvac_210": "151",  # settle down
    "pvac_211": "52",   # eat out
    "pvac_212": "52",   # eat out
    "pvac_213": "94",   # hang out
    "pvac_214": "94",   # hang out
    "pvac_215": "104",  # left out -> (leave out)
    "pvac_216": "104",  # left out -> (leave out)
    "pvac_217": "85",   # went off -> (go off)
    "pvac_218": "85",   # gone off -> (go off)
    "pvac_219": "192",  # wear off
    "pvac_220": "192",  # wear off
    "pvac_221": "96",   # hold on
    "pvac_222": "96",   # hold on
    "pvac_223": "101",  # keep on
    "pvac_224": "101",  # kept on -> (keep on)
    "pvac_225": "128",  # paid (me) back -> (pay back)
    "pvac_226": "128",  # pay (her) back -> (pay back)
    "pvac_227": "183",  # turn back
    "pvac_228": "183",  # turn back
    "pvac_229": "143",  # read over
    "pvac_230": "143",  # read over
    "pvac_231": "179",  # think it over -> (think over)
    "pvac_232": "179",  # think over
    "pvac_233": "75",   # get through
    "pvac_234": "75",   # get through
    "pvac_235": "9",    # believe in
    "pvac_236": "9",    # believe in
    "pvac_237": "40",   # consists of
    "pvac_238": "40",   # consist of
    "pvac_239": "170",  # succeeded in
    "pvac_240": "170",  # succeeded in
    "pvac_241": "191",  # Watch out
    "pvac_242": "191",  # watch out for
    "pvac_243": "121",  # make sense
    "pvac_244": "121",  # make sense
    "pvac_245": "24",   # catch on
    "pvac_246": "24",   # caught on -> (catch on)
    "pvac_247": "33",   # clear up
    "pvac_248": "33",   # clear up
    "pvac_249": "145",  # rule out
    "pvac_250": "145",  # rule out
    "pvac_251": "12",   # brought about -> (bring about)
    "pvac_252": "12",   # brought about -> (bring about)
    "pvac_253": "63",   # get across
    "pvac_254": "63",   # get across
    "pvac_255": "42",   # crack down on
    "pvac_256": "42",   # crack down on
    "pvac_257": "125",  # mess around
    "pvac_258": "125",  # messing around -> (mess around)
    "pvac_259": "110",  # look around
    "pvac_260": "110",  # looking around -> (look around)
    "pvac_261": "176",  # talk over
    "pvac_262": "176",  # talk it over -> (talk over)
    "pvac_263": "98",   # join in
    "pvac_264": "98",   # join in
    "pvac_265": "159",  # sit out
    "pvac_266": "159",  # sit this one out -> (sit out)
    "pvac_267": "12",   # bring about
    "pvac_268": "36",   # came around -> (come around)
    "pvac_269": "119",  # make ends meet
    "pvac_270": "119",  # make ends meet
    "pvac_271": "157",  # sink in
    "pvac_272": "157",  # sunk in -> (sink in)
    "pvac_273": "35",   # came across -> (come across)
    "pvac_274": "35",   # comes across -> (come across)
    "pvac_275": "124",  # made off -> (make off)
    "pvac_276": "124",  # made off -> (make off)
    "pvac_277": "70",   # get in
    "pvac_278": "70",   # get in
    "pvac_279": "66",   # get around
    "pvac_280": "66",   # get around
    "pvac_281": "163",  # stand for
    "pvac_282": "163",  # stands for -> (stand for)
    "pvac_283": "123",  # made up for -> (make up for)
    "pvac_284": "123",  # make up for
    "pvac_285": "133",  # press on
    "pvac_286": "133",  # press on
    "pvac_287": "44",   # cut me off -> (cut off)
    "pvac_288": "134",  # pull out
    "pvac_289": "132",  # play down
    "pvac_290": "93",   # hand over
    "pvac_291": "89",   # grow up
    "pvac_292": "57",   # fill in (for) -> (fill in)
    "pvac_293": "95",   # hinge on
    "pvac_294": "162",  # spelled out -> (spell out)
    "pvac_295": "83",   # go back (on) -> (go back)
    "pvac_296": "82",   # going after -> (go after)
    "pvac_297": "90",   # handed down -> (hand down)
    "pvac_298": "152",  # shines through -> (shine through)
    "pvac_299": "120",  # make out
    "pvac_300": "47",   # draw up
}
# --- Fin del Mapa Manual ---


def load_json_file(file_path):
    """Safely loads a JSON file with utf-8 encoding."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"FATAL ERROR: File not found: {file_path}")
        return None
    except json.JSONDecodeError:
        print(f"FATAL ERROR: Could not decode JSON from {file_path}. Check for syntax errors.")
        return None
    except Exception as e:
        print(f"FATAL ERROR: An unexpected error occurred loading {file_path}: {e}")
        return None

def save_json_file(file_path, data):
    """Safely saves data to a JSON file with utf-8 encoding."""
    try:
        # Clean path of non-standard spaces
        clean_path = file_path.replace(u'\u00A0', ' ')
        
        with open(clean_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except IOError:
        print(f"FATAL ERROR: Could not write to file: {clean_path}")
    except Exception as e:
        print(f"FATAL ERROR: An unexpected error occurred saving {clean_path}: {e}")

def create_backup(file_path, backup_dir):
    """Creates a timestamped backup of the file."""
    if not os.path.exists(file_path):
        print(f"INFO: No file found at {file_path} to back up.")
        return None
        
    try:
        os.makedirs(backup_dir, exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = os.path.basename(file_path)
        name, ext = os.path.splitext(base_name)
        
        backup_name = f"{timestamp}_{name}{ext}"
        backup_path = os.path.join(backup_dir, backup_name)
        
        with open(file_path, 'r', encoding='utf-8') as f_in:
            with open(backup_path, 'w', encoding='utf-8') as f_out:
                f_out.write(f_in.read())
                
        print(f"SUCCESS: Backup created at {backup_path}")
        return backup_path
    except Exception as e:
        print(f"FATAL ERROR: Could not create backup for {file_path}. Aborting. Error: {e}")
        return None

def main():
    print("--- SmartDeck Modal Injection Script (Manual Map) ---")
    
    # 1. Load Deck
    print(f"Loading deck from {DECK_FILE_PATH}...")
    deck_data = load_json_file(DECK_FILE_PATH)
    if deck_data is None:
        return

    # 2. Create Backup
    print("Creating backup...")
    if not create_backup(DECK_FILE_PATH, BACKUP_DIR):
        print("Aborting script due to backup failure.")
        return
        
    # 3. Process Cards
    print("\n--- Processing Cards ---")
    cards = deck_data.get('cards', [])
    if not cards:
        print("WARNING: No 'cards' found in deck data.")
        return
        
    cards_processed = 0
    modals_added = 0
    cards_skipped = 0
    cards_no_match = 0
    
    # Regex to find an existing modal link
    modal_regex = re.compile(r'^\s*\*\*\[(\d+)\]\*\*')

    for card in cards:
        cards_processed += 1
        card_id = card.get('cardId')
        
        if not card_id:
            print(f"WARNING: Card at index {cards_processed - 1} has no cardId. Skipping.")
            cards_no_match += 1
            continue

        # Find the corresponding modal ID from our manual map
        modal_id = CARD_TO_MODAL_MAP.get(card_id)
        
        if not modal_id:
            print(f"WARNING: [Card {card_id}] No modal ID found in the manual map. Skipping.")
            cards_no_match += 1
            continue
            
        try:
            # Sanitize any non-standard spaces
            original_value = card.get('content', {}).get('value', '').replace(u'\u00A0', ' ')
            
            # Check if modal already exists
            if modal_regex.search(original_value):
                print(f"INFO: [Card {card_id}] Already has a modal. Skipping.")
                cards_skipped += 1
                continue
                
            # Prepend the modal link
            new_value = f"**[{modal_id}]**\n\n{original_value}"
            card['content']['value'] = new_value
            # VERIFY: Print success message
            print(f"VERIFY: [Card {card_id}] Injected modal ID [{modal_id}].")
            modals_added += 1
            
        except Exception as e:
             print(f"ERROR: [Card {card_id}] Failed to process content.value. Error: {e}. Skipping.")
             cards_skipped += 1
             continue

    # 4. Save Updated Deck
    print("\n--- Saving Results ---")
    save_json_file(DECK_FILE_PATH, deck_data)
    print(f"Successfully saved updated deck to {DECK_FILE_PATH}")

    # 5. Final Summary
    print("\n--- Summary ---")
    print(f"Total Cards Processed: {cards_processed}")
    print(f"Modals Added:          {modals_added}")
    print(f"Cards Skipped:         {cards_skipped} (already had modals or error)")
    print(f"No Match in Map:       {cards_no_match} (cardId not in map)")
    print("-------------------")
    print("Script finished.")

if __name__ == "__main__":
    main()