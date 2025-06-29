# Lógica y Estructura de Mazos y Tarjetas (Decks & Cards)

## 1. Introducción

Este documento define la estructura y las reglas que deben seguir los datos de los mazos (`Decks`) y las tarjetas (`Cards`) para ser compatibles con la aplicación **Smart Decks**. Entender esta estructura es fundamental para crear nuevos mazos estáticos o para interpretar los datos generados por la IA.

## 2. Estructura del Mazo (Deck)

Un mazo es un único objeto JSON que contiene la información general del tema y un array de tarjetas. Debe tener las siguientes propiedades:

- `id` (String): Un identificador único para el mazo. Por convención, los mazos generados por IA usan el prefijo `ai_` y los estáticos un nombre descriptivo (ej. `plsql_deck`).
- `name` (String): El título del mazo que se mostrará al usuario.
- `description` (String): Una breve descripción del contenido del mazo.
- `isAiGenerated` (Boolean): Debe ser `true` si el mazo fue creado por la IA y `false` si es un mazo estático precargado. Esto es importante para la lógica de almacenamiento.
- `language` (String): El lenguaje de programación del contenido de las tarjetas (ej. `sql`, `bash`, `javascript`). Este valor se usa para el resaltado de sintaxis con `highlight.js`.
- `cards` (Array): Un array que contiene todos los objetos de tarjeta que pertenecen a este mazo.

## 3. Estructura de la Tarjeta (Card)

Cada objeto dentro del array `cards` representa una única tarjeta de memoria y debe seguir esta estructura:

- `category` (String): La categoría o subtema al que pertenece la pregunta. Ayuda a agrupar tarjetas relacionadas.
- `hint` (String): Una pista o definición breve que ayuda al usuario a recordar la respuesta. Debe ser una afirmación, no una pregunta. Por ejemplo puede ser la definicion de la misma palabra o concepto que se esta preguntando, pero claramente nunca nombrando explicitamente la respuesta, eso se genera un error grave, el hint no debe nombrar la respuesta (alternativas), ni tampoco ser una pregunta.
- `question` (String): La pregunta principal que se le hará al usuario. La pregunta puede ser variada, por ejemplo sobre el concepto, o un complete la oracion, dependera el caso.
- `options` (Array de Strings): Un array con exactamente 3 opciones de respuesta. Debe contener la respuesta correcta y dos respuestas incorrectas pero plausibles (distractores). Debe ser de alto nivel las alternativas, no sencillas, pero claramente solo 1 puede ser la correcta. 
- `correctAnswer` (String): La respuesta correcta. **Es crucial que este valor sea idéntico a una de las cadenas de texto en el array `options`**.
- `content` (Object): Un objeto que contiene material de apoyo visual para la pregunta. Su estructura varía según el tipo de contenido.

### El Objeto `content`

Este objeto determina si la tarjeta mostrará un bloque de código, una imagen o nada.

- `type` (String): Define el tipo de contenido. Los valores permitidos son:
    - `'code'`: Para mostrar un fragmento de código. Este codigo no recibe comentarios "in code" es solo codigo puro para dar contexto.
    - `'image'`: Para mostrar una imagen (actualmente no implementado, pero la estructura lo soporta).
    - `'none'`: Si no hay contenido adicional que mostrar.
- `language` (String): **Requerido solo si `type` es `'code'`.** Especifica el lenguaje del fragmento de código para el resaltado de sintaxis (ej. `python`, `sql`).
- `value` (String): El valor del contenido.
    - Si `type` es `'code'`, contiene el fragmento de código como una cadena de texto.
    - Si `type` es `'image'`, contiene un término de búsqueda en inglés para una imagen (ej. `"binary tree diagram"`). La lógica para buscar y mostrar la imagen aún no está implementada.
    - Si `type` es `'none'`, debe ser una cadena vacía `""`.

## 4. Reglas y Plantilla para Nuevos Mazos Estáticos

Para añadir un nuevo mazo de forma manual a la aplicación, sigue estas reglas:

1.  Crea un nuevo archivo `.json` en el directorio `public/data/`.
2.  El nombre del archivo debe ser descriptivo (ej. `java_basics_deck.json`).
3.  Copia y pega la plantilla de abajo en el archivo y modifícala con tu contenido.
4.  Asegúrate de que el JSON sea válido. Puedes usar un validador en línea.
5.  Añade el nombre de tu nuevo archivo al array `deckFiles` en el método `loadDecks` de la clase `App` (`src/core/App.js`) para que la aplicación lo cargue al iniciar.

### Plantilla de Mazo JSON

```json
{
  "id": "mi_mazo_unico_id",
  "name": "Título de Mi Nuevo Mazo",
  "description": "Una descripción clara y concisa de lo que trata este mazo.",
  "isAiGenerated": false,
  "language": "javascript",
  "cards": [
    {
      "category": "Conceptos Básicos",
      "hint": "Define una variable que no puede ser reasignada.",
      "question": "¿Qué palabra clave se utiliza en JavaScript para declarar una constante?",
      "options": [
        "let",
        "const",
        "var"
      ],
      "correctAnswer": "const",
      "content": {
        "type": "code",
        "language": "javascript",
        "value": "const PI = 3.1416;"
      }
    },
    {
      "category": "Funciones",
      "hint": "Una función que se pasa a otra función como argumento.",
      "question": "¿Cómo se llama a una función que se pasa como argumento a otra función?",
      "options": [
        "Función de retorno",
        "Callback",
        "Función anidada"
      ],
      "correctAnswer": "Callback",
      "content": {
        "type": "none",
        "language": "",
        "value": ""
      }
    }
  ]
}
```

# IMPORTANTE: CUANDO SE CREE NUEVO CODIGO SIEMPRE DEBE POSEER "DEBUG" PARA VERLO EN LA CONSOLA F12. SIEMPRE EN PASOS PROPENSOS A ALGUN ERROR HABRA DEPURACION!!!.


