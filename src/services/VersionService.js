// src/services/VersionService.js
/**
 * Service dedicated *only* to fetching the application version data.
 * It does not handle any DOM manipulation.
 */
class VersionService {
    /**
     * Fetches the version string from the version.json file.
     * @returns {Promise<string|null>} A promise that resolves to the version string (e.g., "1.0.0"), or null if an error occurs.
     */
    static async getVersion() {
        try {
            // Fetch from the root directory relative to index.html
            const response = await fetch('./version.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data.version) {
                console.warn("[VersionService] getVersion -> Version number not found in version.json");
                return null;
            }
            
            console.log(`DEBUG: [VersionService] getVersion -> Version ${data.version} fetched successfully.`);
            return data.version;

        } catch (error) {
            console.error("ERROR: [VersionService] Could not fetch version.", error);
            return null; // Return null on failure
        }
    }
}