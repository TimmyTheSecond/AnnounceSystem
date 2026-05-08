// =============================================
// Dovedale Train Announcement System (v2.0)
// Features: Spawn alerts, Headcode changes, Station entries
// =============================================

console.log("📋 TrainSystem.js loaded");

const DEFAULT_STATIONS = [
    { name: "Gleethrop End", center: { x: 1274, y: 3563 }, radius: 800 },
    { name: "Dovedale East", center: { x: 1231, y: 534 }, radius: 800 },
    { name: "Fanory Mill", center: { x: -16821, y: -3954 }, radius: 800 },
    { name: "Mazewood", center: { x: -4650, y: 5798 }, radius: 800 },
    { name: "Codsall Castle", center: { x: 9991, y: 5236 }, radius: 800 },
    { name: "Masonfield", center: { x: 10667, y: -881 }, radius: 800 },
    { name: "Ashburn", center: { x: -22012, y: -6729 }, radius: 800 },
    { name: "Cosdale Harbour", center: { x: 4325, y: -2518 }, radius: 800 },
    { name: "Glassbury Junction", center: { x: 11592, y: 8663 }, radius: 800 },
    { name: "Dovedale Central", center: { x: 3157, y: 805 }, radius: 800 },
    { name: "Satus", center: { x: -7485, y: -3055 }, radius: 800 },
];

class TrainDetectionSystem {
    constructor() {
        this.stationZones = [];
        // Map stores PlayerID -> { lastHeadcode, stationStates: [] }
        this.trainStates = new Map();
        this.DEBOUNCE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    }

    init() {
        this.stationZones = DEFAULT_STATIONS;
        console.log(`✅ Train Detection System initialized with ${DEFAULT_STATIONS.length} stations.`);
    }

    calculateDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    async announce(message) {
        console.log(`📢 ${message}`);
        try {
            await fetch("http://127.0.0.1:3000", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: message })
            });
        } catch (e) {
            // Silently fail if local server isn't running
        }
    }

    processTrains(players) {
        const activeTrains = players.filter(p => p.trainData?.headcode);

        for (const train of activeTrains) {
            // Identify the train by player username so it persists across headcode changes
            const trainId = train.username || train.id; 
            const currentHeadcode = train.trainData.headcode;
            const pos = train.position;

            // --- 1. HANDLE NEW SPAWNS ---
            if (!this.trainStates.has(trainId)) {
                // Determine spawn location
                const spawnZone = this.stationZones.find(z => this.calculateDistance(pos, z.center) <= z.radius);
                const locationText = spawnZone ? `at ${spawnZone.name}` : "out on the line";
                
                this.announce(`${currentHeadcode} spawned ${locationText}`);
                
                this.trainStates.set(trainId, {
                    lastHeadcode: currentHeadcode,
                    stationStates: []
                });
                continue; 
            }

            const stateData = this.trainStates.get(trainId);

            // --- 2. HANDLE HEADCODE CHANGES ---
            if (stateData.lastHeadcode !== currentHeadcode) {
                this.announce(`${stateData.lastHeadcode} changed its headcode to ${currentHeadcode}`);
                stateData.lastHeadcode = currentHeadcode;
            }

            // --- 3. HANDLE STATION ENTRIES ---
            for (const zone of this.stationZones) {
                const distance = this.calculateDistance(pos, zone.center);
                const isInside = distance <= zone.radius;

                let zoneState = stateData.stationStates.find(s => s.stationName === zone.name);
                if (!zoneState) {
                    zoneState = { stationName: zone.name, isInside: false, lastAnnouncement: 0 };
                    stateData.stationStates.push(zoneState);
                }

                if (!zoneState.isInside && isInside) {
                    const now = Date.now();
                    if (now - zoneState.lastAnnouncement > this.DEBOUNCE_INTERVAL) {
                        this.announce(`${currentHeadcode} is entering ${zone.name}`);
                        zoneState.lastAnnouncement = now;
                    }
                }
                zoneState.isInside = isInside;
            }
        }

        // --- 4. CLEANUP ---
        // (Optional: Remove players from this.trainStates if they are no longer in the 'players' array)
        const activeIds = new Set(players.map(p => p.username || p.id));
        for (const id of this.trainStates.keys()) {
            if (!activeIds.has(id)) {
                this.trainStates.delete(id);
            }
        }
    }
}

const detectionSystem = new TrainDetectionSystem();
let ws = null;

export function startAnnouncementSystem() {
    if (ws) ws.close();

    console.log("🚀 Starting Dovedale Announcement System...");

    ws = new WebSocket("wss://map.dovedale.wiki/api/ws");

    ws.onopen = () => {
        console.log("✅ WebSocket Connected");
        detectionSystem.init();
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            let players = [];

            if (Array.isArray(data)) players = data;
            else if (data.username && data.position) players = [data];
            else if (Array.isArray(data.players)) players = data.players;

            if (players.length > 0) {
                detectionSystem.processTrains(players);
            }
        } catch (e) {
            console.error("Data error:", e);
        }
    };

    ws.onclose = () => {
        console.log("⚠️ Disconnected. Reconnecting in 5s...");
        setTimeout(startAnnouncementSystem, 5000);
    };

    ws.onerror = (err) => console.log("❌ WebSocket error", err);
}

// Global access for console triggering
window.startAnnouncementSystem = startAnnouncementSystem;
window.detectionSystem = detectionSystem;

console.log("✅ System ready! Type startAnnouncementSystem() to start.");
