# Smart Decks v3 - Arquitectura y Guía del Proyecto

## 1. Descripción General de la Aplicación

**Smart Decks** es una aplicación web de tarjetas de memoria (flashcards) diseñada para facilitar el aprendizaje y la memorización. Permite a los usuarios estudiar mazos de tarjetas predefinidos sobre diversos temas o generar dinámicamente nuevos mazos personalizados utilizando la inteligencia artificial de OpenAI.

La aplicación presenta una interfaz limpia y moderna, donde el usuario puede:
- Visualizar una lista de mazos disponibles.
- Seleccionar un mazo para ver sus detalles y el progreso.
- Iniciar un cuestionario (quiz) basado en las tarjetas del mazo.
- Crear nuevos mazos sobre cualquier tema proporcionando una descripción y una clave de API de OpenAI.

## 2. Arquitectura del Software

El proyecto está construido con **Vanilla JavaScript**, siguiendo una arquitectura robusta y escalable basada en componentes.

- **Arquitectura Basada en Componentes (Component-Based):** La interfaz de usuario está dividida en componentes independientes y reutilizables (ej. `DeckList`, `QuizScreen`). Cada componente gestiona su propio HTML y lógica, lo que facilita el desarrollo y la depuración.
- **Estado Centralizado (State-Driven):** La clase `App.js` actúa como el orquestador central, gestionando el estado global de la aplicación (los mazos cargados, la pantalla actual, etc.). Los componentes reaccionan a los cambios en este estado, pero no lo modifican directamente, creando un flujo de datos predecible.
- **Orientado a Servicios (Service-Oriented):** La lógica de negocio que no está directamente relacionada con la interfaz de usuario (como las llamadas a la API de OpenAI o el almacenamiento local) se aísla en "servicios" (`ApiService`, `StorageService`), manteniendo el código limpio y modular.

## 3. Estructura de Directorios y Archivos

A continuación se detalla la función de cada archivo relevante en el proyecto.


- **`index.html`**: Es el punto de entrada de la aplicación. Contiene la estructura HTML base, carga los estilos CSS, las librerías externas (Tailwind, FontAwesome, Highlight.js) y todos los scripts de la aplicación.ESTA A NIVEL RAIZ.


### Directorio `public`
Contiene todos los archivos estáticos que se sirven directamente al navegador.

- **`public/css/style.css`**: Define los estilos CSS globales y personalizados que complementan a Tailwind CSS, como animaciones y estilos base para el cuerpo del documento.
- **`public/data/plsql_deck.json`**: Un archivo JSON que contiene un mazo predefinido sobre fundamentos de PL/SQL.
- **`public/data/shell_deck.json`**: Un archivo JSON que contiene un mazo predefinido sobre comandos de Shell y automatización de compilación.

### Directorio `src`
El corazón de la aplicación, contiene todo el código fuente JavaScript.

#### `src/core`
Archivos centrales que orquestan la lógica de la aplicación.

- **`src/core/App.js`**: La clase principal y orquestador de la aplicación. Es responsable de:
    - Inicializar todos los componentes y servicios.
    - Gestionar el estado global (mazos, pantalla actual, instancia del quiz).
    - Cargar los mazos estáticos y los generados por el usuario.
    - Renderizar la vista correcta (`DeckList`, `DeckDetailScreen`, `QuizScreen`) según el estado.
    - Manejar los eventos principales, como la selección de un mazo o la finalización de un quiz.
- **`src/core/Quiz.js`**: Gestiona la lógica de una sesión de quiz. No interactúa con el DOM. Sus responsabilidades son:
    - Generar una ronda de preguntas a partir de un mazo, priorizando las tarjetas que necesitan repaso.
    - Mantener el estado del quiz actual (pregunta actual, puntuación).
    - Validar las respuestas del usuario.

#### `src/components`
Componentes de la interfaz de usuario, cada uno con su propia plantilla HTML y lógica JavaScript.

- **`src/components/DeckList/deck-list.html`**: Plantilla HTML para la pantalla que muestra la lista de todos los mazos disponibles.
- **`src/components/DeckList/DeckList.js`**: Clase que renderiza la lista de mazos. Carga la plantilla HTML, crea una tarjeta para cada mazo y maneja los eventos de clic para seleccionar un mazo o iniciar la creación de uno nuevo.

- **`src/components/DeckDetailScreen/deck-detail-screen.html`**: Plantilla HTML para la pantalla que muestra los detalles de un mazo seleccionado.
- **`src/components/DeckDetailScreen/DeckDetailScreen.js`**: Clase que muestra la información de un mazo específico, incluyendo su descripción, el número de tarjetas y el progreso del usuario. Maneja los eventos para iniciar el quiz o volver a la lista de mazos.

- **`src/components/QuizScreen/QuizScreen.html`**: Plantilla HTML para la pantalla del quiz, que incluye el área para la pregunta, las opciones de respuesta y el progreso.
- **`src/components/QuizScreen/QuizScreen.js`**: Clase que renderiza la pantalla del quiz. Muestra la pregunta actual, las opciones, y gestiona la interacción del usuario (selección de respuesta). Proporciona feedback visual inmediato (respuesta correcta/incorrecta) y habilita el botón para pasar a la siguiente pregunta.

- **`src/components/AiDeckModal/ai-deck-modal.html`**: Plantilla HTML para el modal (ventana emergente) que permite crear un mazo con IA.
- **`src/components/AiDeckModal/AiDeckModal.js`**: Clase que controla el modal de creación de mazos. Gestiona la visualización del formulario, la recopilación de los datos del usuario (título, descripción, clave de API) y el estado de carga mientras se genera el mazo.

#### `src/services`
Módulos que encapsulan la lógica de negocio y las interacciones externas.

- **`src/services/ApiService.js`**: Gestiona toda la comunicación con la API de OpenAI. Contiene el *prompt* del sistema que instruye a la IA para que genere las tarjetas en el formato JSON correcto y un método `generateCards` que realiza la llamada a la API.
- **`src/services/StorageService.js`**: Abstrae la interacción con el `localStorage` del navegador. Se encarga de guardar y cargar los mazos generados por el usuario para que persistan entre sesiones.
- **`src/services/TTSService.js`**: Archivo vacío, preparado para futuras implementaciones de funcionalidad Text-to-Speech (síntesis de voz) para mejorar la accesibilidad.

#### `src/utils`
Funciones de utilidad reutilizables.

- **`src/utils/ComponentLoader.js`**: Una clase de utilidad simple con un método estático `loadHTML`. Su única responsabilidad es cargar de forma asíncrona el contenido de los archivos de plantilla `.html` de los componentes.
