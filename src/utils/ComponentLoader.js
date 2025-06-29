
/* src\utils\ComponentLoader.js */

// Utility class to fetch and load HTML templates for components.

class ComponentLoader {
    /**
     * Fetches an HTML template from a given path.
     * @param {string} componentPath - The relative path to the component's HTML file.
     * @returns {Promise<string>} A promise that resolves with the HTML content as a string.
     */
    static async loadHTML(componentPath) {
        console.log(`DEBUG: [ComponentLoader] loadHTML -> Attempting to fetch: ${componentPath}`);
        try {
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load component HTML: ${response.statusText} (status: ${response.status})`);
            }
            const html = await response.text();
            console.log(`DEBUG: [ComponentLoader] loadHTML -> Successfully fetched: ${componentPath}`);
            return html;
        } catch (error) {
            console.error(`DEBUG: [ComponentLoader] loadHTML -> Error loading ${componentPath}:`, error);
            // Return a fallback HTML to indicate an error
            return '<div class="text-red-500 font-bold">Error: Could not load component.</div>';
        }
    }
}