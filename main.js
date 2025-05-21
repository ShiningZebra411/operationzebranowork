// main.js

// IndexedDB Constants
const DB_NAME = 'GBAEmulatorSavesDB';
const STORE_NAME = 'gameStates';
const DB_VERSION = 1;

let CURRENT_ROM_ID = 'default-rom';
let gbaSavesInstance = null;
let db = null;
let autoSaveIntervalId = null;
let messageTimeoutId;

const saveButton = document.getElementById('saveGameButton');
const loadButton = document.getElementById('loadGameButton');
const importButton = document.getElementById('importSaveButton');
const fileInput = document.getElementById('saveFileInput');
const messageBox = document.getElementById('messageBox');

function showUserMessage(msg, type = 'info') {
    clearTimeout(messageTimeoutId);
    messageBox.textContent = msg;
    messageBox.className = `message-box ${type}`;
    messageBox.classList.remove('hidden');
    messageTimeoutId = setTimeout(() => messageBox.classList.add('hidden'), 3000);
}

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = event => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'romId' });
            }
        };
        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = event => reject(event.target.error);
    });
}

async function saveGameState() {
    if (!gbaSavesInstance || !db) return;
    try {
        const saveData = gbaSavesInstance.saveState();
        if (!saveData || saveData.length === 0) return;

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const saveObject = {
            romId: CURRENT_ROM_ID,
            data: saveData,
            timestamp: new Date().toISOString()
        };
        store.put(saveObject);
        showUserMessage('Game saved!', 'success');
    } catch (e) {
        showUserMessage('Save failed: ' + e.message, 'error');
    }
}

async function loadGameState() {
    if (!gbaSavesInstance || !db) return;
    try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(CURRENT_ROM_ID);
        request.onsuccess = e => {
            const result = e.target.result;
            if (result && result.data) {
                gbaSavesInstance.loadState(result.data);
                showUserMessage('Game loaded!', 'success');
            } else {
                showUserMessage('No save found.', 'info');
            }
        };
    } catch (e) {
        showUserMessage('Load failed: ' + e.message, 'error');
    }
}

function importSaveFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
        const data = new Uint8Array(reader.result);
        try {
            gbaSavesInstance.importSave(data);
            showUserMessage('Save file imported!', 'success');
        } catch (e) {
            showUserMessage('Import failed: ' + e.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function findGbaSavesInstance() {
    if (window.Iodine && window.Iodine.saveState && window.Iodine.loadState) return window.Iodine;
    if (window.Iodine?.IOCore?.saves) return {
        saveState: () => window.Iodine.saveState(),
        loadState: s => window.Iodine.loadState(s),
        importSave: (data) => window.Iodine.IOCore.saves.importSave(data)
    };
    return null;
}

window.addEventListener('load', async () => {
    if (window.location.hash) CURRENT_ROM_ID = window.location.hash.substring(1);
    gbaSavesInstance = findGbaSavesInstance();

    let retryCount = 0;
    while (!gbaSavesInstance && retryCount < 10) {
        await new Promise(r => setTimeout(r, 200 * (retryCount + 1)));
        gbaSavesInstance = findGbaSavesInstance();
        retryCount++;
    }

    if (!gbaSavesInstance) {
        showUserMessage('Emulator not ready.', 'error');
        return;
    }

    try {
        await openIndexedDB();
        showUserMessage('Save system ready.');
    } catch (e) {
        showUserMessage('IndexedDB error: ' + e.message, 'error');
    }

    if (saveButton) saveButton.addEventListener('click', saveGameState);
    if (loadButton) loadButton.addEventListener('click', loadGameState);
    if (importButton && fileInput) {
        importButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', e => {
            if (e.target.files.length) importSaveFile(e.target.files[0]);
        });
    }

    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'q') {
            event.preventDefault();
            saveGameState();
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
            event.preventDefault();
            loadGameState();
        }
    });

    autoSaveIntervalId = setInterval(saveGameState, 30000);
});

