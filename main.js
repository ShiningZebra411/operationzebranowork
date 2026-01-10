// main.js

// Constants
// IndexedDB Constants
const DB_NAME = 'GBAEmulatorSavesDB';
const STORE_NAME = 'gameStates';
const DB_VERSION = 1;
let CURRENT_ROM_ID = window.location.hash.substring(1) || 'default-rom';

let CURRENT_ROM_ID = 'default-rom';
let gbaSavesInstance = null;
let db = null;
let autoSaveIntervalId = null;
let messageTimeoutId;

// DOM Elements
const saveButton = document.getElementById('saveGameButton');
const loadButton = document.getElementById('loadGameButton');
const importButton = document.getElementById('importSaveButton');
const fileInput = document.getElementById('saveFileInput');
const messageBox = document.getElementById('messageBox');
const importSaveInput = document.getElementById('importSaveInput');
const importSaveButton = document.getElementById('importSaveButton');
const saveSlotSelector = document.getElementById('saveSlotSelector');
const exportStateBtn = document.getElementById('exportStateBtn');
const importStateBtn = document.getElementById('importStateBtn');
const importStateFile = document.getElementById('importStateFile');
const gdriveUploadBtn = document.getElementById('gdriveUploadBtn');
const gdriveDownloadBtn = document.getElementById('gdriveDownloadBtn');

// Google Drive API Constants
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const API_KEY = 'YOUR_GOOGLE_API_KEY';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Utility Functions
function showUserMessage(msg, type = 'info') {
    clearTimeout(messageTimeoutId);
    messageBox.textContent = msg;
    messageBox.className = `message-box ${type}`;
    messageBox.classList.remove('hidden');
    messageTimeoutId = setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 3000);
}

function getFullSaveKey() {
    const slot = saveSlotSelector ? saveSlotSelector.value : 'slot1';
    return `${CURRENT_ROM_ID}_${slot}`;
    messageTimeoutId = setTimeout(() => messageBox.classList.add('hidden'), 3000);
}

// IndexedDB Functions
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
        request.onupgradeneeded = event => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'romId' });
            }
        };
        request.onsuccess = (event) => {
        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = (event) => {
            reject(event.target.error);
        };
        request.onerror = event => reject(event.target.error);
    });
}

async function saveGameState() {
    if (!gbaSavesInstance || !db) {
        showUserMessage('Emulator or database not ready. Cannot save.', 'error');
        return;
    }
    if (!gbaSavesInstance || !db) return;
    try {
        const saveData = gbaSavesInstance.exportSave();
        const saveType = gbaSavesInstance.exportSaveType();
        if (!saveData || saveData.length === 0) {
            showUserMessage('No valid save data exported by emulator.', 'error');
            return;
        }
        const saveData = gbaSavesInstance.saveState();
        if (!saveData || saveData.length === 0) return;

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const saveObject = {
            romId: getFullSaveKey(),
            romId: CURRENT_ROM_ID,
            data: saveData,
            type: saveType,
            timestamp: new Date().toISOString()
        };
        const request = store.put(saveObject);
        request.onsuccess = () => {
            showUserMessage('Game saved successfully!', 'success');
        };
        request.onerror = (event) => {
            showUserMessage(`Failed to save game: ${event.target.error.message}`, 'error');
        };
        store.put(saveObject);
        showUserMessage('Game saved!', 'success');
    } catch (e) {
        showUserMessage(`Error exporting save data: ${e.message}`, 'error');
        showUserMessage('Save failed: ' + e.message, 'error');
    }
}

async function loadGameState() {
    if (!gbaSavesInstance || !db) {
        showUserMessage('Emulator or database not ready. Cannot load.', 'error');
        return;
    }
    if (!gbaSavesInstance || !db) return;
    try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(getFullSaveKey());
        request.onsuccess = (event) => {
            const saveObject = event.target.result;
            if (saveObject) {
                gbaSavesInstance.importSave(saveObject.data, saveObject.type);
                showUserMessage('Game loaded successfully!', 'success');
        const request = store.get(CURRENT_ROM_ID);
        request.onsuccess = e => {
            const result = e.target.result;
            if (result && result.data) {
                gbaSavesInstance.loadState(result.data);
                showUserMessage('Game loaded!', 'success');
            } else {
                showUserMessage('No saved game found for this ROM and slot.', 'info');
                showUserMessage('No save found.', 'info');
            }
        };
        request.onerror = (event) => {
            showUserMessage(`Failed to load game: ${event.target.error.message}`, 'error');
        };
    } catch (e) {
        showUserMessage(`Error importing save data: ${e.message}`, 'error');
        showUserMessage('Load failed: ' + e.message, 'error');
    }
}

// Import .sav File
importSaveButton?.addEventListener('click', () => importSaveInput?.click());
importSaveInput?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    try {
        gbaSavesInstance.importSave(uint8Array);
        showUserMessage('Save file imported successfully!', 'success');
    } catch (e) {
        showUserMessage(`Import failed: ${e.message}`, 'error');
    }
});

// Export/Import Emulator State
exportStateBtn?.addEventListener('click', () => {
    if (!window.Iodine || !window.Iodine.IOCore) {
        showUserMessage('Emulator not ready.', 'error');
        return;
    }
    const stateData = window.Iodine.IOCore.saveState();
    const blob = new Blob([stateData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${CURRENT_ROM_ID}_state.bin`;
    a.click();
    URL.revokeObjectURL(url);
    showUserMessage('State exported!', 'success');
});

importStateBtn?.addEventListener('click', () => importStateFile?.click());
importStateFile?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const buf = await file.arrayBuffer();
    try {
        window.Iodine.IOCore.loadState(buf);
        showUserMessage('State loaded!', 'success');
    } catch (err) {
        showUserMessage(`Failed to load state: ${err.message}`, 'error');
    }
});

// Google Drive Integration
function initGoogleDriveAPI() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
        }).then(() => {
            // Sign in the user if not already signed in
            if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
                gapi.auth2.getAuthInstance().signIn();
            }
        });
    });
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

gdriveUploadBtn?.addEventListener('click', async () => {
    if (!gbaSavesInstance) {
        showUserMessage('Emulator not ready.', 'error');
        return;
    }
    const saveData = gbaSavesInstance.exportSave();
    const blob = new Blob([saveData], { type: 'application/octet-stream' });
    const fileMetadata = {
        name: `${getFullSaveKey()}.sav`
function findGbaSavesInstance() {
    if (window.Iodine && window.Iodine.saveState && window.Iodine.loadState) return window.Iodine;
    if (window.Iodine?.IOCore?.saves) return {
        saveState: () => window.Iodine.saveState(),
        loadState: s => window.Iodine.loadState(s),
        importSave: (data) => window.Iodine.IOCore.saves.importSave(data)
    };
    const accessToken = gapi.auth.getToken().access_token;
    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: new FormData().append('file', blob, fileMetadata.name)
    }).then(response => response.json())
      .then(data => {
          showUserMessage('Save uploaded to Google Drive!', 'success');
      }).catch(error => {
          showUserMessage(`Upload failed: ${error.message}`, 'error');
      });
});

gdriveDownloadBtn?.addEventListener('click', async () => {
    const fileName = `${getFullSaveKey()}.sav`;
    const accessToken = gapi.auth.getToken().access_token;
    fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}'&spaces=drive`, {
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
    }).then(response => response.json())
      .then(data => {
          if (data.files.length > 0) {
              const fileId = data.files[0].id;
              fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                  headers: new Headers({ 'Authorization': 'Bearer ' + accessToken })
              }).then(res => res.arrayBuffer())
                .then(buffer => {
                    const uint8Array = new Uint8Array(buffer);
                    gbaSavesInstance.importSave(uint8Array);
                    showUserMessage('Save downloaded from Google Drive!', 'success');
                });
          } else {
              showUserMessage('No matching save file found on Google Drive.', 'info');
          }
      }).catch(error => {
          showUserMessage(`Download failed: ${error.message}`, 'error');
      });
});
    return null;
}

// Initialize
window.addEventListener('load', async () => {
    if (window.location.hash) {
        CURRENT_ROM_ID = window.location.hash.substring(1);
    }
    if (window.location.hash) CURRENT_ROM_ID = window.location.hash.substring(1);
    gbaSavesInstance = findGbaSavesInstance();

    let retryCount = 0;
    while (!gbaSavesInstance && retryCount < 10) {
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        await new Promise(r => setTimeout(r, 200 * (retryCount + 1)));
        gbaSavesInstance = findGbaSavesInstance();
        retryCount++;
    }

    if (!gbaSavesInstance) {
        showUserMessage('Emulator save system not found. Save/Load disabled.', 'error');
        saveButton.disabled = true;
        loadButton.disabled = true;
        showUserMessage('Emulator not ready.', 'error');
        return;
    }

    try {
        await openIndexedDB();
        await loadGameState();
        showUserMessage('Save system ready.');
    } catch (e) {
        showUserMessage
::contentReference[oaicite:0]{index=0}
 
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
