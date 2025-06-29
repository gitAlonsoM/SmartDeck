//src\services\ApiService.js
// src/services/ApiService.js
// Manages all communication with external APIs, primarily OpenAI.

class ApiService {
    static OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

    /**
     * The system prompt that instructs the AI on its role and the desired JSON format.
     * This is the most critical part for getting reliable results.
     */
    static SYSTEM_PROMPT = `
        You are an expert instructional designer creating educational flashcards.
        Your task is to generate a JSON array of 10 flashcard objects based on the user's request.
        Each object MUST strictly follow this structure:
        {
          "category": "A relevant category for the topic",
          "hint": "A short definition or clue. It must be a statement, NOT a question.",
          "question": "A clear, specific question that tests the user's knowledge.",
          "options": ["An array of three plausible strings: one correct, two incorrect distractors."],
          "correctAnswer": "The string that exactly matches the correct option.",
          "content": {
            "type": "string", // MUST be 'code', 'image', or 'none'.
            "language": "string", // Relevant ONLY if type is 'code'. E.g., 'javascript', 'python', 'sql'.
            "value": "string" // For 'code', the code snippet. For 'image', a short, descriptive image search query in English. For 'none', an empty string.
          }
        }

        Key instructions:
        - The entire response MUST be a single, valid JSON array of exactly 10 objects. Do not include any text, explanations, or markdown before or after the array.
        - For the 'content' object:
          - If the user requests code, and the card topic is suitable, set type to 'code', specify the language, and provide a minimal, relevant code snippet in 'value'.
          - If the user requests images, and the card topic is suitable, set type to 'image' and provide an English search query in 'value'. DO NOT generate URLs.
          - If the topic is not suitable for code or an image, or if the user didn't request them, set type to 'none'.
        - Ensure 'correctAnswer' is an exact match to one of the 'options' array elements.
        - The language of the flashcard content (hint, question, options) should match the language requested by the user.
    `;

    /**
     * Generates a list of flashcards using the OpenAI API.
     * @param {object} options - The configuration for the deck generation.
     * @param {string} options.prompt - The user's topic for the deck.
     * @param {string} options.apiKey - The user's OpenAI API key.
     * @param {string} options.language - The target language for the cards (e.g., 'English', 'Spanish').
     * @param {boolean} options.includeCode - Whether to ask the AI to include code snippets.
     * @param {boolean} options.includeImages - Whether to ask the AI to include images.
     * @returns {Promise<Array>} A promise that resolves to an array of card objects.
     */
    static async generateCards(options) {
        console.log("DEBUG: [ApiService] generateCards -> Starting card generation with options:", options);
        
        let userPrompt = `Generate a deck about: "${options.prompt}". The flashcards must be in ${options.language}.`;

        if (options.includeCode && options.includeImages) {
            userPrompt += " Where appropriate, include both code snippets and relevant images.";
        } else if (options.includeCode) {
            userPrompt += " Where appropriate, include relevant code snippets.";
        } else if (options.includeImages) {
            userPrompt += " Where appropriate, include relevant images.";
        }
        
        console.log("DEBUG: [ApiService] generateCards -> Constructed user prompt:", userPrompt);

        try {
            const response = await fetch(this.OPENAI_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${options.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: this.SYSTEM_PROMPT },
                        { role: 'user', content: userPrompt }
                    ],
                    // The 'response_format' with 'json_object' is helpful but doesn't guarantee a plain array.
                    // We will parse the response robustly.
                    temperature: 0.6, // A bit of creativity
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('DEBUG: [ApiService] generateCards -> OpenAI API Error Response:', errorData);
                throw new Error(`OpenAI API Error: ${errorData.error.message}`);
            }

            const data = await response.json();
            console.log("DEBUG: [ApiService] generateCards -> Raw API response object:", data);

            const content = data.choices[0].message.content;
            console.log("DEBUG: [ApiService] generateCards -> Raw content string from AI:", content);

            // The AI might wrap the array in a JSON object, so we need to handle that.
            const parsedJson = JSON.parse(content);
            const cardsArray = Array.isArray(parsedJson) ? parsedJson : Object.values(parsedJson)[0];

            if (!Array.isArray(cardsArray)) {
                 throw new Error("AI response was not a valid array of cards.");
            }
            
            console.log("DEBUG: [ApiService] generateCards -> Successfully parsed cards array:", cardsArray);
            return cardsArray;

        } catch (error) {
            console.error("DEBUG: [ApiService] generateCards -> A critical error occurred:", error);
            // Re-throw the error so the calling function in App.js can handle it (e.g., show an alert)
            throw error;
        }
    }
}