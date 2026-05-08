// =============================================
// Dovedale Train Announcement System
// Radius = 800
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
        this.trainStates = new Map();
        this.knownHeadcodes = new Set();
        this.DEBOUNCE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    }

    init() {
        this.stationZones = DEFAULT_STATIONS;
        console.log(`✅ Train Detection System initialized with ${DEFAULT_STATIONS.length} stations (Radius: 800)`);
    }

    calculateDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    processTrains(players) {
        const trains = players.filter(p => p.trainData?.headcode);

        for (const train of trains) {
            const headcode = train.trainData.headcode;
            const pos = train.position;

            const isNewTrain = !this.knownHeadcodes.has(headcode);
            if (isNewTrain) {
                this.knownHeadcodes.add(headcode);
                console.log(`New train spawned: ${headcode}`);
                continue; // Skip announcement on spawn or headcode change
            }

            if (!this.trainStates.has(headcode)) {
                this.trainStates.set(headcode, []);
            }

            const states = this.trainStates.get(headcode);

            for (const zone of this.stationZones) {
                const distance = this.calculateDistance(pos, zone.center);
                const isInside = distance <= zone.radius;

                let state = states.find(s => s.stationName === zone.name);
                if (!state) {
                    state = { stationName: zone.name, isInside: false, lastAnnouncement: 0 };
                    states.push(state);
                }

                if (!state.isInside && isInside) {
                    const now = Date.now();
                    if (now - state.lastAnnouncement > this.DEBOUNCE_INTERVAL) {
                        console.log(`${headcode} is entering ${zone.name}`);

                        fetch("http://127.0.0.1:3000", {
                            method: "POST",
                            headers: {
                            "Content-Type": "application/json"
                                                            },
                                body: JSON.stringify({
                                        text: (`${headcode} is entering ${zone.name}`)
                            })
                            });
                        
                        state.lastAnnouncement = now;
                    }
                }
                state.isInside = isInside;
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
        } catch (e) {}
    };

    ws.onclose = () => {
        console.log("⚠️ Disconnected. Reconnecting in 5s...");
        setTimeout(startAnnouncementSystem, 5000);
    };

    ws.onerror = () => console.log("❌ WebSocket error");
}

// Global access
window.startAnnouncementSystem = startAnnouncementSystem;
window.detectionSystem = detectionSystem;

console.log("✅ System ready! Type startAnnouncementSystem() to start.");
