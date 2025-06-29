# SmartDeck - Instrucciones y Mejoras Prioritarias

Este documento contiene las instrucciones detalladas para las próximas iteraciones y mejoras prioritarias de la aplicación SmartDeck, generadas por el agente Gemini.

---

### 1. Cantidad Variable de Tarjetas para Mazos Generados por IA

**Objetivo:** Permitir al usuario seleccionar la cantidad de tarjetas (cards) al generar un mazo con IA, en lugar de la cantidad fija actual de 10.

**Requisitos:**

*   **Interfaz de Usuario (`src/components/AiDeckModal/ai-deck-modal.html`):**
    *   Añade un nuevo campo de selección (dropdown/select input) en el modal de creación de mazos con IA.
    *   Este campo debe tener el `name` `numCards` y las siguientes opciones: 10, 20, 30, 40, 50.
    *   El valor por defecto debe ser 10.

*   **Lógica del Modal (`src/components/AiDeckModal/AiDeckModal.js`):**
    *   Modifica el método `_getFormValues()` para que capture el valor seleccionado del nuevo campo `numCards` y lo incluya en el objeto `values` que se pasa a `onSubmit`. Asegúrate de que el valor sea un número entero.

*   **Servicio de API (`src/services/ApiService.js`):**
    *   Actualiza la propiedad `SYSTEM_PROMPT` para que la instrucción a la IA refleje la cantidad variable de tarjetas. Por ejemplo, cambia "JSON array of 10 flashcard objects" a "JSON array of exactly {numCards} flashcard objects".
    *   Modifica el método `generateCards` para que acepte un nuevo parámetro `options.numCards`.
    *   Incorpora `options.numCards` en el `userPrompt` que se envía a la API de OpenAI, para que la IA sepa cuántas tarjetas debe generar.

*   **Controlador Principal (`src/core/App.js`):**
    *   Asegúrate de que el valor de `numCards` capturado por `AiDeckModal` sea correctamente pasado a la llamada de `ApiService.generateCards`.

---

### 2. Mejora de la Funcionalidad "Reiniciar Mazo"

**Objetivo:** Proporcionar un botón "Reiniciar Mazo" siempre visible en la UI del mazo, que cambie visualmente y se acompañe de un mensaje de felicitación cuando el usuario complete un mazo.

**Requisitos:**

*   **Interfaz de Usuario (`src/components/DeckDetailScreen/deck-detail-screen.html` y `src/components/QuizScreen/QuizScreen.html`):**
    *   Asegura que exista un botón claramente identificado como "Reiniciar Mazo" en la interfaz del mazo (probablemente en `DeckDetailScreen` o `QuizScreen` si es la vista principal del mazo).
    *   En `QuizScreen.html`, añade un elemento para mostrar un mensaje de felicitación cuando el mazo se complete.

*   **Lógica de la Pantalla de Quiz (`src/components/QuizScreen/QuizScreen.js`):**
    *   Implementa la lógica para detectar cuándo el usuario ha completado todas las tarjetas del mazo.
    *   Cuando el mazo se complete:
        *   Muestra un mensaje de felicitación al usuario.
        *   Modifica la apariencia del botón "Reiniciar Mazo" (por ejemplo, añadiendo una clase CSS específica como `quiz-completed-reset-button`) para hacerlo más prominente e invitar al usuario a reiniciarlo.
    *   Implementa el manejador de eventos para el botón "Reiniciar Mazo" que, al ser clicado, reinicie el estado del quiz.

*   **Lógica del Quiz (`src/core/Quiz.js`):**
    *   Añade un método público (ej. `resetQuiz()`) que restablezca el estado interno del mazo (progreso, orden de las tarjetas, etc.) a su estado inicial.
    *   Asegúrate de que este archivo pueda comunicar el estado de "mazo completado" a `QuizScreen.js`.

*   **Servicio de Almacenamiento (`src/services/StorageService.js`):**
    *   Si el progreso del quiz se guarda en el almacenamiento local, añade una función para borrar o restablecer el progreso guardado de un mazo específico cuando se reinicia.

*   **Lógica de la Pantalla de Detalle del Mazo (`src/components/DeckDetailScreen/DeckDetailScreen.js`):**
    *   Si el botón "Reiniciar Mazo" reside en esta pantalla, asegúrate de que su estado visual se actualice correctamente basándose en el estado de finalización del quiz (posiblemente escuchando eventos de `QuizScreen`).

---

### 3. Mensajes de Finalización del Quiz Mejorados

**Objetivo:** Reemplazar el mensaje de finalización del quiz actual por uno estéticamente más agradable y motivacional, con variaciones basadas en el rendimiento del usuario.

**Requisitos:**

*   **Interfaz de Usuario (`src/components/QuizScreen/QuizScreen.html`):**
    *   Define un área específica y estilizada para mostrar el mensaje de finalización del quiz y el score.
    *   Elimina cualquier `alert()` o pop-up nativo del navegador para mostrar el resultado.

*   **Lógica de la Pantalla de Quiz (`src/components/QuizScreen/QuizScreen.js`):**
    *   Cuando el quiz finalice, calcula el número de respuestas correctas.
    *   Basado en el número de respuestas correctas (de 0 a 10), selecciona uno de los 11 mensajes predefinidos.
    *   Cada mensaje debe tener asociado un símbolo o emoticon.
    *   Los mensajes deben ser cortos, directos y motivacionales.
    *   Ejemplos de mensajes (a adaptar y expandir para los 11 casos):
        *   0/10: "¡No te rindas! Cada error es un paso hacia el éxito. 💪"
        *   1/10: "Un comienzo es un comienzo. ¡Sigue aprendiendo! 🌱"
        *   5/10: "¡Buen trabajo! Estás en el camino correcto. 🚀"
        *   10/10: "¡Impresionante! Dominio total. Eres un genio. ✨"
    *   Actualiza el área de la UI designada con el mensaje y el score final.

---

### 4. Persistencia del Progreso del Mazo

**Objetivo:** Guardar y restaurar el progreso del usuario dentro de un mazo, para que no se pierda al navegar o al cerrar la aplicación.

**Requisitos:**

*   **Lógica del Quiz (`src/core/Quiz.js`):**
    *   Modifica la clase `Quiz` para que su estado (tarjeta actual, tarjetas restantes, tarjetas correctas/incorrectas, etc.) pueda ser serializado y deserializado.
    *   Añade métodos para obtener el estado actual del quiz (`getQuizState()`) y para cargar un estado previo (`loadQuizState(state)`).

*   **Servicio de Almacenamiento (`src/services/StorageService.js`):**
    *   Crea funciones para guardar el estado de un quiz en el almacenamiento local (ej. `saveQuizProgress(deckId, quizState)`) y para cargarlo (`loadQuizProgress(deckId)`).
    *   Utiliza el `deckId` para asociar el progreso con un mazo específico.

*   **Lógica de la Pantalla de Quiz (`src/components/QuizScreen/QuizScreen.js`):**
    *   Al inicializar el `QuizScreen` para un mazo, intenta cargar el progreso guardado para ese `deckId` usando `StorageService.loadQuizProgress()`. Si existe, inicializa el `Quiz` con ese estado.
    *   Después de cada interacción del usuario (ej. responder una tarjeta), guarda el estado actual del quiz usando `StorageService.saveQuizProgress()`.
    *   Cuando el quiz se reinicia (usando el botón "Reiniciar Mazo"), asegúrate de borrar el progreso guardado para ese mazo en `StorageService`.

*   **Lógica de la Pantalla de Detalle del Mazo (`src/components/DeckDetailScreen/DeckDetailScreen.js`):**
    *   Cuando se selecciona un mazo para iniciar un quiz, asegúrate de que se pase el `deckId` correcto a `QuizScreen` para que el progreso pueda ser cargado/guardado correctamente.

---

**Consideraciones Generales:**

*   Mantén la consistencia en el estilo, la estructura y las convenciones de codificación del proyecto existente.
*   Asegura que la validación de entrada para `numCards` sea adecuada (número entero, dentro del rango 10-50).
*   Verifica que la respuesta de la API de OpenAI se maneje robustamente, incluso si la cantidad de tarjetas generadas no coincide exactamente con la solicitada (aunque el prompt debería guiar a la IA).
*   Asegura una experiencia de usuario fluida y clara para todas las nuevas funcionalidades.
*   Prioriza la seguridad y el rendimiento al manejar el almacenamiento local.
