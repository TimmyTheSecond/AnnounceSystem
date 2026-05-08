// =============================================
// Dovedale Train Announcement System + Updater
// =============================================

console.log("📋 TrainSystem.js loaded");

const DEFAULT_STATIONS = [ /* ... your stations with radius: 800 */ ];

class TrainDetectionSystem {
    // ... (same as before, I kept it short)
    constructor() {
        this.stationZones = [];
        this.trainStates = new Map();
        this.knownHeadcodes = new Set();
        this.DEBOUNCE_INTERVAL = 5 * 60 * 1000;
    }

    init() {
        this.stationZones = DEFAULT_STATIONS;
        console.log(`✅ Detection system ready (Radius: 800)`);
    }

    processTrains(players) {
        const trains = players.filter(p => p.trainData?.headcode);
        for (const train of trains) {
            const headcode = train.trainData.headcode;
            if (!this.knownHeadcodes.has(headcode)) {
                this.knownHeadcodes.add(headcode);
                continue; // Skip announcement on spawn / headcode change
            }
            // ... rest of your logic
        }
    }
}

const detectionSystem = new TrainDetectionSystem();
let ws = null;

// ================== UPDATING SCREEN ==================
function showUpdatingScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'updating-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95); color: white; display: flex;
        flex-direction: column; align-items: center; justify-content: center;
        z-index: 9999; font-family: monospace;
    `;
    overlay.innerHTML = `
        <h2>🔄 Updating Announcement System...</h2>
        <p>Please wait while we deploy the latest changes.</p>
        <p id="status-text">Preparing deployment...</p>
    `;
    document.body.appendChild(overlay);
}

function removeUpdatingScreen() {
    const overlay = document.getElementById('updating-overlay');
    if (overlay) overlay.remove();
}

async function checkUpdateStatus() {
    try {
        const res = await fetch('/status.json?' + Date.now()); // cache bust
        const status = await res.json();

        if (status.updating === true) {
            if (!document.getElementById('updating-overlay')) {
                showUpdatingScreen();
            }
        } else {
            removeUpdatingScreen();
        }
    } catch (e) {
        console.log("Could not fetch status.json");
    }
}

// ================== MAIN SYSTEM ==================
export function startAnnouncementSystem() {
    if (ws) ws.close();

    ws = new WebSocket("wss://map.dovedale.wiki/api/ws");

    ws.onopen = () => {
        console.log("✅ WebSocket Connected");
        detectionSystem.init();
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            let players = Array.isArray(data) ? data : (data.players || (data.username ? [data] : []));
            detectionSystem.processTrains(players);
        } catch (e) {}
    };

    ws.onclose = () => setTimeout(startAnnouncementSystem, 5000);
}

// Start everything
window.startAnnouncementSystem = startAnnouncementSystem;
detectionSystem.init();

// Start polling for update status
setInterval(checkUpdateStatus, 3000);
checkUpdateStatus(); // initial check

console.log("✅ System + Updater ready!");
console.log("Type startAnnouncementSystem() if needed");
