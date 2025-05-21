// main.js

// IndexedDB Constants
const DB_NAME = 'GBAEmulatorSavesDB';
const STORE_NAME = 'gameStates';
const DB_VERSION = 1;

// Unique ID for the current game/ROM. This will be extracted from the URL hash.
let CURRENT_ROM_ID = 'default-rom'; // Default in case hash is empty

// Global variables to hold instances
let gbaSavesInstance = null; // Initialize as null
let db = null; // Initialize as null
let messageTimeoutId; // To manage the message display timeout

// Get DOM elements
const saveButton = document.getElementById('saveGameButton');
const loadButton = document.getElementById('loadGameButton');
const messageBox = document.getElementById('messageBox');

// Function to display messages to the user
function showUserMessage(msg, type = 'info') {
    clearTimeout(messageTimeoutId); // Clear any existing timeout
    messageBox.textContent = msg;
    messageBox.className = `message-box ${type}`; // Set class for styling
    messageBox.classList.remove('hidden'); // Make it visible

    // Hide message after 3 seconds
    messageTimeoutId = setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 3000);
}

// Function to open and initialize IndexedDB
function openIndexedDB() {
    console.log("[IndexedDB] Attempting to open IndexedDB...");
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Create an object store to hold game states, using romId as the key
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'romId' });
                showUserMessage('IndexedDB upgrade needed, creating object store.', 'info');
                console.log("[IndexedDB] Object store created.");
            } else {
                console.log("[IndexedDB] Object store already exists.");
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("[IndexedDB] Opened successfully.");
            resolve(db);
        };

        request.onerror = (event) => {
            showUserMessage(`IndexedDB error: ${event.target.errorCode}`, 'error');
            console.error('[IndexedDB] Error:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Function to save the game state to IndexedDB
async function saveGameState() {
    console.log("[Save] Attempting to save game state...");
    if (!gbaSavesInstance || !db) {
        showUserMessage('Emulator or database not ready. Cannot save.', 'error');
        console.error("[Save] Failed: gbaSavesInstance or db not ready.", { gbaSavesInstance, db });
        return;
    }

    try {
        const saveData = gbaSavesInstance.exportSave();
        const saveType = gbaSavesInstance.exportSaveType();

        // Check if saveData is valid (e.g., not null or empty array if expected)
        // IodineGBA's exportSave returns an array, so checking for length is good.
        if (!saveData || !Array.isArray(saveData) || saveData.length === 0) {
            showUserMessage('No valid save data exported by emulator. Is game running?', 'error');
            console.warn("[Save] Exported save data is empty or not an array:", saveData);
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const saveObject = {
            romId: CURRENT_ROM_ID,
            data: saveData, // This should be a serializable array (e.g., Uint8Array, regular Array)
            type: saveType,
            timestamp: new Date().toISOString()
        };

        console.log("[Save] Putting saveObject into IndexedDB:", saveObject);
        const request = store.put(saveObject);

        request.onsuccess = () => {
            showUserMessage('Game saved successfully!', 'success');
            console.log('[Save] Game state saved:', saveObject);
        };

        request.onerror = (event) => {
            showUserMessage(`Failed to save game: ${event.target.error.message}`, 'error');
            console.error('[Save] Error:', event.target.error);
        };

    } catch (e) {
        showUserMessage(`Error exporting save data: ${e.message}`, 'error');
        console.error('[Save] Export error:', e);
    }
}

// Function to load the game state from IndexedDB
async function loadGameState() {
    console.log("[Load] Attempting to load game state...");
    if (!gbaSavesInstance || !db) {
        showUserMessage('Emulator or database not ready. Cannot load.', 'error');
        console.error("[Load] Failed: gbaSavesInstance or db not ready.", { gbaSavesInstance, db });
        return;
    }

    try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(CURRENT_ROM_ID);

        request.onsuccess = (event) => {
            const saveObject = event.target.result;
            if (saveObject) {
                console.log("[Load] Found saved game data:", saveObject);
                // Ensure data format is compatible with importSave (e.g., Array from IndexedDB)
                gbaSavesInstance.importSave(saveObject.data, saveObject.type);
                showUserMessage('Game loaded successfully!', 'success');
                console.log('[Load] Game state loaded:', saveObject);
            } else {
                showUserMessage('No saved game found for this ROM.', 'info');
                console.log('[Load] No saved game found for ROM ID:', CURRENT_ROM_ID);
            }
        };

        request.onerror = (event) => {
            showUserMessage(`Failed to load game from IndexedDB: ${event.target.error.message}`, 'error');
            console.error('[Load] Error:', event.target.error);
        };

    } catch (e) {
        showUserMessage(`Error importing save data: ${e.message}`, 'error');
        console.error('[Load] Import error:', e);
    }
}

// Function to find the IodineGBA Saves instance
function findGbaSavesInstance() {
    console.log("[Init] Attempting to find gbaSavesInstance...");

    // Try window.Iodine.IOCore.saves - This is the most likely path based on your console output
    if (typeof window.Iodine !== 'undefined' && window.Iodine.IOCore && window.Iodine.IOCore.saves) {
        console.log("[Init] Found gbaSavesInstance at window.Iodine.IOCore.saves");
        return window.Iodine.IOCore.saves;
    }
    // Fallback checks (less likely, but good to keep for robustness)
    if (typeof window.gbaEmulator !== 'undefined' && window.gbaEmulator.saves) {
        console.log("[Init] Found gbaSavesInstance at window.gbaEmulator.saves");
        return window.gbaEmulator.saves;
    }
    if (typeof window.IodineGBA !== 'undefined' && window.IodineGBA.emulator && window.IodineGBA.emulator.saves) {
        console.log("[Init] Found gbaSavesInstance at window.IodineGBA.emulator.saves");
        return window.IodineGBA.emulator.saves;
    }
    if (typeof window.IodineGBA !== 'undefined' && window.IodineGBA.saves) {
        console.log("[Init] Found gbaSavesInstance at window.IodineGBA.saves (might be constructor or instance)");
        return window.IodineGBA.saves;
    }

    console.warn("[Init] gbaSavesInstance not found in common global locations. This is the most likely cause of save/load failure.");
    return null;
}

// Initialize the application when the window loads
window.addEventListener('load', async () => {
    console.log("[Init] Window loaded. Initializing save system...");

    // Extract ROM ID from URL hash (e.g., #pokemonemerald -> "pokemonemerald")
    if (window.location.hash) {
        CURRENT_ROM_ID = window.location.hash.substring(1);
        console.log("[Init] Current ROM ID from URL hash:", CURRENT_ROM_ID);
    } else {
        console.warn("[Init] No ROM ID found in URL hash. Using default 'default-rom'. This might lead to saves overwriting each other if multiple games are played.");
    }

    // Try to find the gbaSavesInstance
    gbaSavesInstance = findGbaSavesInstance();

    // If not found immediately, wait a bit and try again, as IodineGBA might initialize asynchronously.
    let retryCount = 0;
    while (!gbaSavesInstance && retryCount < 10) { // Increased retries
        console.log(`[Init] gbaSavesInstance not found immediately. Retrying in ${200 * (retryCount + 1)}ms... (Attempt ${retryCount + 1}/10)`); // Faster retries
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        gbaSavesInstance = findGbaSavesInstance();
        retryCount++;
    }

    if (!gbaSavesInstance) {
        console.error("[Init] Failed to find IodineGBA Saves instance after multiple retries. Save/Load functionality will not work.");
        showUserMessage('Emulator save system not found. Save/Load disabled.', 'error');
        if (saveButton) saveButton.disabled = true;
        if (loadButton) loadButton.disabled = true;
        return; // Stop further initialization if core component is missing
    }


    // Open IndexedDB and then try to load game state
    try {
        await openIndexedDB();
        // Only attempt to load if gbaSavesInstance is actually available
        if (gbaSavesInstance) {
            // Load game state after IndexedDB is ready AND emulator saves instance is found
            await loadGameState();
        } else {
            showUserMessage('Emulator not fully initialized. Manual load might be needed after ROM loads.', 'info');
        }
    } catch (e) {
        showUserMessage(`Failed to initialize save system: ${e.message}`, 'error');
    }

    // Add event listeners for buttons
    if (saveButton) saveButton.addEventListener('click', saveGameState);
    if (loadButton) loadButton.addEventListener('click', loadGameState);

    // Add keyboard shortcut listener
    document.addEventListener('keydown', (event) => {
        // Check for Ctrl (or Cmd on Mac) + Q for quick save
        if ((event.ctrlKey || event.metaKey) && event.key === 'q') {
            event.preventDefault(); // Prevent browser's default action (e.g., closing tab)
            saveGameState(); // Trigger the save function
        }
        // Check for Ctrl (or Cmd on Mac) + L for quick load
        else if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
            event.preventDefault(); // Prevent browser's default action (e.g., opening downloads)
            loadGameState(); // Trigger the load function
        }
    });

    showUserMessage('Save system loaded. Press Ctrl + Q to quick save or Ctrl + L to quick load!', 'info');
});

