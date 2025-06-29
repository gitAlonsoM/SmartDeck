# SmartDeck

SmartDeck is a web-based flashcard application designed for learning and memorizing information through interactive quizzes. It allows users to study from pre-built decks or generate new decks on any topic using AI.

## Features

- **Interactive Quizzes:** Learn with multiple-choice questions.
- **AI Deck Generation:** Create new flashcard decks on any topic using the OpenAI API.
- **Progress Tracking:** The app tracks your learning progress for each deck, separating cards into "learned," "to review," and "new."
- **Code Snippet Support:** Flashcards can include formatted code snippets for technical topics.
- **Pre-built Decks:** Comes with several decks on topics like Shell Scripting, PL/SQL, and App Distribution.

## Project Structure

```
C:/Users/alonm/Desktop/SmartDeck/
├───.gitignore
├───index.html
├───.git/...
├───.vscode/
│   └───settings.json
├───public/
│   ├───assets/
│   │   └───icons/
│   ├───css/
│   │   └───style.css
│   └───data/
│       ├───ios_android.json
│       ├───plsql_deck.json
│       └───shell_deck.json
└───src/
    ├───components/
    │   ├───AiDeckModal/
    │   │   ├───ai-deck-modal.html
    │   │   └───AiDeckModal.js
    │   ├───DeckDetailScreen/
    │   │   ├───deck-detail-screen.html
    │   │   └───DeckDetailScreen.js
    │   ├───DeckList/
    │   │   ├───deck-list.html
    │   │   └───DeckList.js
    │   └───QuizScreen/
    │       ├───QuizScreen.html
    │       └───QuizScreen.js
    ├───core/
    │   ├───App.js
    │   └───Quiz.js
    ├───services/
    │   ├───ApiService.js
    │   ├───StorageService.js
    │   └───TTSService.js
    └───utils/
        └───ComponentLoader.js
```

### File Descriptions

#### Root

- **`index.html`**: The main entry point of the application. It loads all necessary CSS and JavaScript files.
- **`.gitignore`**: Specifies which files and directories to ignore in Git version control.

#### `public/`

- **`public/css/style.css`**: Contains custom CSS styles for the application, including animations and font settings.
- **`public/data/`**: This directory holds the JSON files for the pre-built flashcard decks.
    - **`ios_android.json`**: Deck for iOS and Android app distribution concepts.
    - **`plsql_deck.json`**: Deck for PL/SQL fundamentals and best practices.
    - **`shell_deck.json`**: Deck for shell scripting and build automation.

#### `src/`

- **`src/core/App.js`**: The main application orchestrator. It manages the application's state, routing between different screens, and initialization of all components.
- **`src/core/Quiz.js`**: A non-visual class that manages the logic of a single quiz session, including generating quiz rounds, tracking answers, and calculating the score.

- **`src/components/`**: Contains the UI components of the application. Each component is composed of an HTML file for the structure and a JavaScript file for the logic.
    - **`DeckList/`**: Displays the list of all available decks.
    - **`DeckDetailScreen/`**: Shows the details of a selected deck, including progress stats, and allows the user to start a quiz.
    - **`QuizScreen/`**: Renders a single quiz question with options and provides feedback on the user's answer.
    - **`AiDeckModal/`**: A modal dialog that allows users to generate a new deck using AI by providing a topic, language, and other options.

- **`src/services/`**: Contains services that handle specific functionalities.
    - **`ApiService.js`**: Manages all communication with the OpenAI API for generating AI-powered decks.
    - **`StorageService.js`**: Handles all interactions with the browser's `localStorage` for persisting user-generated decks and quiz progress.
    - **`TTSService.js`**: (Currently empty) Intended for text-to-speech functionality.

- **`src/utils/`**: Contains utility classes.
    - **`ComponentLoader.js`**: A utility for fetching and loading the HTML templates for the components.

## How to Run

1.  Open `index.html` in a modern web browser.
2.  To use the AI Deck Generation feature, you will need an API key from [OpenAI](https://openai.com/).