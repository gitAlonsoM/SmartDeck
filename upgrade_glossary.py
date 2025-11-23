import json
import os

FILE_PATH = os.path.join('public', 'data', 'glossary', 'english_rules.json')

MISSING_UPDATES = {
    "85": {
        "title": "'Don't have to' vs. 'Mustn't'",
        "content": "<p class='mb-4'><strong>Don't have to</strong> = No obligation (You can do it if you want, but it's not required).<br><strong>Mustn't</strong> = Prohibition (It is forbidden).</p><h3 class='font-semibold text-lg mb-2 text-white'>Examples (No Obligation):</h3><ul class='list-disc list-inside space-y-2'><li>You <span class='text-cyan-400'>don't have to</span> <span class='text-yellow-400'>pay</span>; it's free.</li><li>She <span class='text-cyan-400'>doesn't have to</span> <span class='text-yellow-400'>come</span> to the meeting.</li><li>We <span class='text-cyan-400'>don't have to</span> <span class='text-yellow-400'>finish</span> this today.</li><li>I <span class='text-cyan-400'>didn't have to</span> <span class='text-yellow-400'>wear</span> a uniform at my old school.</li></ul><h3 class='font-semibold text-lg mt-4 mb-2 text-white'>Examples (Prohibition):</h3><ul class='list-disc list-inside space-y-2'><li>You <span class='text-cyan-400'>mustn't</span> <span class='text-yellow-400'>smoke</span> in here.</li><li>We <span class='text-cyan-400'>mustn't</span> <span class='text-yellow-400'>tell</span> anyone the password.</li><li>He <span class='text-cyan-400'>mustn't</span> <span class='text-yellow-400'>forget</span> his medication.</li><li>Visitors <span class='text-cyan-400'>mustn't</span> <span class='text-yellow-400'>touch</span> the art.</li></ul>"
    },
    "86": {
        "title": "Questions: 'What... like?' vs. 'How is...?'",
        "content": "<p class='mb-4'><strong>What is X like?</strong> asks for a description of personality or characteristics (permanent).<br><strong>How is X?</strong> asks about health, mood, or current state (temporary).</p><h3 class='font-semibold text-lg mb-2 text-white'>Examples:</h3><ul class='list-disc list-inside space-y-2'><li>A: <span class='text-violet-400'>What</span> is the new boss <span class='text-orange-400'>like</span>? B: He is strict but fair. (Description)</li><li>A: <span class='text-violet-400'>How</span> is the new boss? B: He is stressed today. (State)</li><li>A: <span class='text-violet-400'>What</span> was the weather <span class='text-orange-400'>like</span>? B: It was rainy and cold.</li><li>A: <span class='text-violet-400'>How</span> is your mother? B: She is feeling much better, thanks.</li><li>A: <span class='text-violet-400'>What</span> is your city <span class='text-orange-400'>like</span>? B: It's noisy and crowded.</li><li>A: <span class='text-violet-400'>How</span> was the party? B: It was fun! (Experience)</li></ul>"
    }
}

def patch():
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for cid, content in MISSING_UPDATES.items():
            if cid in data:
                data[cid]['content'] = content['content']
                print(f"Fixed ID {cid}")
        
        with open(FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    patch()