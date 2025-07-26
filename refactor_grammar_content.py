import json
import os

def refactor_deck_content(file_path):
    """
    Reads a deck file, refactors the 'content.value' for specific cards,
    and overwrites the original file with the changes.
    """
    print(f"Starting refactor for: {file_path}")
    print("This will overwrite the original file.")

    # A comprehensive map of cardId to its new, pedagogically rich content value.
    # Syntax:
    # [word] -> Renders as blue text in UI (for correct option explanations).
    # ~word~ -> Renders as yellow text in UI (for incorrect option explanations).
    content_map = {
        "egac_371": "[Should have + past participle] is used to talk about a missed opportunity or mistake in the past. A `code review` is the ideal time to identify problems like `latency`.\n\n~Must discuss~ expresses a present or future obligation, which doesn't fit the past context.\n~Could discuss~ expresses past ability or possibility, but lacks the sense of regret or criticism.",
        "egac_372": "The [Third Conditional] (If + Past Perfect, ... would have + p.p.) is for unreal past situations. `Regression tests` are crucial to prevent bugs in a new `release`.\n\n~Would catch~ is for the Second Conditional (an unreal present result).\n~Will catch~ is for the First Conditional (a real future possibility).",
        "egac_373": "The causative [get + object + past participle] is used when you arrange for someone else to perform a service. To `refactor` code helps reduce `technical debt`.\n\n~Refactor it~ implies you will do the work yourself.\n~Get to refactor it~ means to have the opportunity to do something, which doesn't fit the context of needing a service performed.",
        "egac_374": "The verb [finish] is always followed by a [Gerund] (-ing form). To `sign off on` a `deployment` means to approve it, which requires successful `end-to-end tests`.\n\n~To run~ is an infinitive and is incorrect after 'finish'.\n~Run~ is the base form and is also grammatically incorrect.",
        "egac_375": "The structure [Not only + inversion + but also...] is used for emphasis. A `showstopper` is a critical bug, and corrupting the `cache` makes it even worse.\n\n~And~ and ~so~ do not fit the 'Not only... but also...' correlative conjunction structure.",
        "egac_376": "This [Mixed Conditional] uses a past perfect 'if' clause for a past condition ('had addressed') and a 'would + verb' clause for a present result ('wouldn't be'). A `backlog` is a list of tasks, and a `blocker` is a critical issue.\n\n~Wouldn't have been~ would be for a past result (Third Conditional).\n~Won't be~ is for a real future possibility (First Conditional).",
        "egac_377": "The verb [agree] is followed by a [to-infinitive] to show commitment to an action ('I agree to help'). A `stakeholder` is a key person with interest in the project's `release`.\n\n~Agreed on~ is used for things, not actions ('We agreed on the plan').\n~Said to~ is not a valid structure here.",
        "egac_378": "The [Passive Voice] with a modal verb (`must be + past participle`) is used to express obligation on an object. The system `logs` events, so the events `must be logged`.\n\n~Must to be~ is grammatically incorrect; modals are not followed by 'to'.\n~Have to~ is incomplete; it would need to be 'have to be logged'.",
        "egac_379": "The phrasal verb [look into] means to investigate. It's the perfect verb to use when discussing how to handle `server-side` errors found in the logs.\n\n~Look over~ means to review something quickly.\n~Look up~ means to search for information in a reference source.",
        "egac_380": "A [Cleft Sentence] with `What...` emphasizes the main need. A `source of truth` is the official, authoritative document or system for information.\n\n~The thing that we need~ is grammatically correct but less concise and natural than the 'What' cleft structure.\n~That we need~ is a noun clause, but it doesn't create the emphatic structure.",
        "egac_381": "The [Past Perfect Continuous] ('had been analyzing') is perfect here. It emphasizes the duration of the action (analyzing the `logs`) that happened before another past action (found the `root cause`).\n\n~Was analyzing~ doesn't emphasize the duration leading up to the other past event.\n~Has been analyzing~ is the Present Perfect and would connect the action to the present, which is incorrect.",
        "egac_382": "The [Future Continuous] ('will be doing') describes an action in progress at a future point in time. You don't want to `push changes` during an active `deployment`.\n\n~Will do~ refers to a single, completed action in the future.\n~Is doing~ is for a fixed arrangement, but Future Continuous is better for an action 'in progress' at a specific time.",
        "egac_383": "A [Past Participle Clause] ('Frustrated') can describe emotion. It's a concise way to say 'Because they were frustrated by the `blocker`...'.\n\n~Frustrating~ would describe the blocker itself ('The blocker was frustrating'), not how the team felt.\n~Having frustrated~ is an active perfect participle and doesn't make sense here.",
        "egac_384": "[Drill down] means to explore something at a more detailed level. It's often used when analyzing data related to `user experience (UX)`.\n\n~Dig up~ means to discover hidden information, often something negative.\n~Wrap up~ means to finish or conclude.",
        "egac_385": "[Had better] ('d better) is for strong, urgent advice. If you don't `push the changes` before the `code freeze`, you'll have to wait for the next release.\n\n~Should to~ and ~must to~ are grammatically incorrect; modals are never followed by 'to'.",
        "egac_386": "The [Second Conditional] (If + Past Simple, ... would + verb) is for unreal present situations. An improved `CI/CD pipeline` would allow for more frequent deployments.\n\n~Will be~ is for the First Conditional (a real possibility).\n~Would have been~ is for the Third Conditional (a past unreal situation).",
        "egac_387": "To [take on] something means to accept it as your responsibility. `Action items` are tasks assigned during meetings, and it's important to `follow up with` relevant `stakeholders`.\n\n~Take in~ means to understand or absorb information.\n~Take up~ means to start a hobby or occupy space.",
        "egac_388": "The [Present Perfect] ('have gone over') is used for a past action with a present result. The action is 'go over' (review); the result is that the `business flow` document is ready now.\n\n~Went over~ (Past Simple) would be used if a specific past time was mentioned.\n~Was going over~ describes an interrupted past action.",
        "egac_389": "This is a [Subject Question] where `Who` is the subject, so no auxiliary `did` is needed. A `Change Request` is a formal proposal, and a `sanity check` is a quick review to see if it makes sense.\n\n~Who did~ and ~What did~ are structures for object questions (e.g., 'What did you approve?').",
        "egac_390": "The idiom is `[to be] on the same page`. It's important to use the correct conjugation, which is [are] for the subject 'we'. To `wrap up` means to conclude a meeting.\n\n~Be~ is the base form and is incorrect here.\n~Do~ is the wrong verb for this idiom.",
        "egac_391": "[Mustn't] means something is prohibited. A `hotfix` is a critical patch, and getting it `signed off on` (approved) is a mandatory rule.\n\n~Don't have to~ means it is not necessary, which is too weak for a strict rule.\n~Shouldn't to~ is grammatically incorrect.",
        "egac_392": "[Used to] is for past states or habits that have now changed. High `latency` was a past problem, but a `rollback` to a previous version solved it.\n\n~Was used to~ means 'was accustomed to', a different meaning.\n~Had~ (Past Simple) is possible but 'used to' better emphasizes the contrast with the present.",
        "egac_393": "To [circle back] means to postpone a discussion and return to it later. It's a common phrase for managing `off-topic` points in a meeting.\n\n~Take it offline~ means to discuss it outside the meeting, which is similar but implies a separate conversation.\n~Sync up~ means to meet and align information.",
        "egac_394": "The causative [have something done] is used when you arrange for someone else to do a task, like adding a `dropdown` menu to a `client-side` interface.\n\n~Make~ in this structure (`make someone do something`) implies force.\n~Do~ is not used in this causative structure.",
        "egac_395": "[Low-hanging fruit] refers to tasks that are easy to achieve and provide quick value, which is great for showing progress to `stakeholders`.\n\n~Nice-to-have~ is a category of feature, not the task itself.\n~Action items~ are any assigned tasks, not necessarily the easiest ones.",
        "egac_396": "In reported speech, the present simple ('I am on it') backshifts to the past simple ('she was on it'). The `point person` is the one in charge, and 'on it' is an idiom meaning 'I'm handling it'.\n\n~Is~ does not backshift and is incorrect.\n~Has been~ is the present perfect and would be the backshift from 'I have been on it'.",
        "egac_397": "[Run it by someone] means to get their feedback or approval before proceeding. This is important before implementing a `workaround` (a temporary solution).\n\n~Run to~ is not a phrasal verb with this meaning.\n~Run with~ means to proceed with an idea.",
        "egac_398": "The [Present Perfect] ('have implemented') is ideal here. The `workaround` is a completed action with a present consequence: we can now continue working while we find the `root cause`.\n\n~Did implement~ (Past Simple) would be used if the specific time of implementation was the focus.\n~Were implementing~ describes an action in progress in the past.",
        "egac_399": "[Take it offline] is a common phrase in meetings for postponing a detailed or tangential conversation to be had later with only the relevant people.\n\n~Go over it~ means to review it, not postpone it.\n~Circle back it~ is grammatically incorrect; it should be 'circle back to it'.",
        "egac_400": "To [piggyback on] someone's idea is to use it as a starting point for your own comment. `UX` stands for User Experience, and `nice-to-have` describes a non-essential feature.\n\n~Follow up with~ means to contact someone later.\n~Take on~ means to accept a responsibility.",
        "egac_401": "A [Gerund] ('Covering') can function as the subject of a sentence. `Edge cases` are rare scenarios that are difficult to test comprehensively.\n\n~To cover~ (infinitive) can be a subject but is more formal and less common.\n~Cover~ (base verb) cannot be the subject of a sentence like this.",
        "egac_402": "To [pull up] information means to retrieve and display it. This is a common phrase when referring to computer files like `logs`.\n\n~Show off~ means to boast.\n~Look into~ means to investigate.",
        "egac_403": "The [Second Conditional] uses the Past Simple ('loaded') in the 'if' clause for a hypothetical present situation. Improving load time of a `dropdown` enhances the `User Experience (UX)`.\n\n~Would load~ is incorrect; 'would' does not go in the 'if' clause.\n~Loads~ (Present Simple) would be for the First Conditional.",
        "egac_404": "[All hands on deck] is an expression calling for everyone to help in an emergency. Finding the `root cause` of a crash is a top priority.\n\n~A showstopper~ and ~a blocker~ refer to the problem itself, not the response to it.",
        "egac_405": "The [Present Perfect Passive] (`has been + p.p.`) is used for a recent action performed on the subject. A `deployment` is the process of releasing software.\n\n~Has~ would make the sentence active ('the software has deployed something').\n~Was being~ is the past continuous passive and doesn't fit the 'just' timeframe.",
        "egac_406": "To [sync up] is a common tech term for having a meeting to align. To `go over` means to review, and the `happy path` is the ideal, error-free user flow.\n\n~Meet up to~ is an incorrect structure; it would be 'meet up to go over...'.\n~Wrap up~ means to finish or conclude.",
        "egac_407": "The [Third Conditional] uses the Past Perfect ('hadn't added') in the 'if' clause to talk about an unreal past condition. `Client-side` refers to operations happening on the user's device.\n\n~Didn't add~ would be for a Second Conditional.\n~Wouldn't add~ is incorrect in the 'if' clause.",
        "egac_408": "[Sounds like a plan] is a fixed, idiomatic expression for showing agreement with a proposed action. A `rollback` means reverting to a previous software version.\n\n~Sounds as a plan~ is grammatically incorrect.\n~Is a good plan~ is a statement about the plan, not an idiomatic expression of agreement.",
        "egac_409": "[Should have + past participle] expresses regret or a past mistake. A `showstopper` is a critical bug that should have been found before a `deployment`.\n\n~Could find~ expresses past ability, not mistake.\n~Must find~ expresses present obligation.",
        "egac_410": "This [Mixed Conditional] links a present condition (if I were...) to a past result (...I would have done). The `point person` is the one responsible for a task.\n\n~Would do~ would be for a present result (Second Conditional).\n~Did~ is the wrong verb form for the result clause.",
        "egac_411": "The [Future Perfect] (`will have + p.p.`) is used for an action that will be finished before another future event. You must `push changes` before the `code freeze`.\n\n~Will push~ implies the action will happen at that future time, not before it.\n~Am pushing~ is for a fixed arrangement.",
        "egac_412": "The verb [insist on + gerund] means to demand something forcefully and not accept refusal. It's a strong way to describe adding an item to the `backlog`.\n\n~Suggested~ is followed by a gerund ('suggested adding'), not 'on'.\n~Demanded~ is followed by an infinitive ('demanded to add').",
        "egac_413": "The [Future Passive] ('will be deployed') is needed here because the `server-side` logic receives the action of being deployed.\n\n~Will deploy~ is active voice; it implies the logic will deploy something else.\n~Is deploying~ is present continuous and refers to a fixed arrangement, but future passive is clearer for a scheduled event.",
        "egac_414": "Starting a sentence with a negative adverb like `Never before` requires [inversion] (`have I`) for emphasis. A bug affecting both `client-side` and `server-side` is a serious issue.\n\n~I have~ and ~I had~ are not inverted and are grammatically incorrect in this structure.",
        "egac_415": "The causative structure [have someone do something] means to instruct or arrange for someone to do a task. It uses the base verb ('look').\n\n~Get~ would require an infinitive ('get our engineer to look').\n~Make~ implies forcing someone to do it.",
        "egac_416": "The [Past Perfect] ('had already discussed') is used to show one past action happened before another. The discussion of `action items` happened before I joined the call.\n\n~Already discussed~ (Past Simple) is less precise about the sequence.\n~Have already discussed~ (Present Perfect) connects the action to the present, which is incorrect.",
        "egac_417": "To [follow up with] someone means to take further action related to a previous conversation. It's often used for tasks like getting more details on a `dropdown` design.\n\n~Sync up to~ is incorrect; it would be 'sync up with'.\n~Run it by~ means to get approval, which is a different step.",
        "egac_418": "This is a [Second Conditional] question (`What would you do if...`), which requires the Past Simple ('refused') in the 'if' clause. A `stakeholder` refusing to `sign off on` a `release` is a serious hypothetical scenario.\n\n~Would refuse~ is incorrect in the 'if' clause.\n~Had refused~ would be for a Third Conditional.",
        "egac_419": "The verb `avoid` is always followed by a [Gerund] (-ing form). It's a best practice to avoid big changes during a `code freeze`.\n\n~To make~ and ~make~ are grammatically incorrect verb forms to use after 'avoid'.",
        "egac_420": "The [Perfect Infinitive] ('to have crashed') is used after verbs like 'seems' to refer to a past action from the point of view of the present. A `memory leak` is a common cause for a server crash.\n\n~To crashed~ is grammatically incorrect.\n~Having crashed~ is a participle, not an infinitive, and doesn't fit the structure 'seems...'.",
    }
    
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

    # --- Loop through cards and update the content value in memory ---
    updated_count = 0
    total_cards = len(deck_data.get("cards", []))
    
    for card in deck_data.get("cards", []):
        card_id = card.get("cardId")
        if card_id and card_id in content_map:
            if "content" not in card:
                card["content"] = {}
            
            card["content"]["type"] = "text"
            card["content"]["value"] = content_map[card_id]
            updated_count += 1

    print(f"Refactor complete. Updated {updated_count} of {total_cards} cards.")

    # --- Save the updated data back to the original file ---
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(deck_data, f, ensure_ascii=False, indent=2)
        print(f"Successfully saved changes back to: {file_path}")
    except Exception as e:
        print(f"Error saving file to {file_path}: {e}")


if __name__ == '__main__':
    # --- CONFIGURATION ---
    # The path to the file you want to modify.
    DECK_FILE_PATH = os.path.join('public', 'data', 'english_grammar_audio_choice.json')
    
    # --- EXECUTION ---
    # The script will now read from and write to the same file.
    refactor_deck_content(DECK_FILE_PATH)