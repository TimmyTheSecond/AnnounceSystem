// =============================================
// Dovedale Train Announcement System
// Single File Version (Easy to use)
// =============================================

const DEFAULT_STATIONS = [
    { name: "Gleethrop End", center: { x: 1274, y: 3563 }, radius: 25 },
    { name: "Groenewoud", center: { x: -14658, y: -3762 }, radius: 25 },
    { name: "Dovedale East", center: { x: 1231, y: 534 }, radius: 25 },
    { name: "Fanory Mill", center: { x: -16821, y: -3954 }, radius: 25 },
    { name: "Mazewood", center: { x: -4650, y: 5798 }, radius: 25 },
    { name: "Conby", center: { x: -11688, y: -3270 }, radius: 25 },
    { name: "Codsall Castle", center: { x: 9991, y: 5236 }, radius: 25 },
    { name: "Masonfield", center: { x: 10667, y: -881 }, radius: 25 },
    { name: "Benyhone Loop", center: { x: -19532, y: -5201 }, radius: 25 },
    { name: "Perthtyne", center: { x: -490, y: 5268 }, radius: 25 },
    { name: "Ashburn", center: { x: -22012, y: -6729 }, radius: 25 },
    { name: "Cosdale Harbour", center: { x: 4325, y: -2518 }, radius: 25 },
    { name: "Glassbury Junction", center: { x: 11592, y: 8663 }, radius: 25 },
    { name: "Dovedale Central", center: { x: 3157, y: 805 }, radius: 25 },
    { name: "Wington Mount", center: { x: 2922, y: -2830 }, radius: 25 },
    { name: "Marigot Crossing", center: { x: 7692, y: 2205 }, radius: 25 },
    { name: "Satus", center: { x: -7485, y: -3055 }, radius: 25 },
];

// Core Detection System
class TrainDetectionSystem {
    constructor() {
        this.stationZones = [];
        this.trainStates = new Map();
        this.announcementHistory = [];
        this.DEBOUNCE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    }

    init() {
        this.stationZones = DEFAULT_STATIONS;
        console.log(`✅ Train Detection System ready with ${this.stationZones.length} stations`);
    }

    calculateDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    processTrains(players) {
        const announcements = [];
        const trains = players.filter(p => p.trainData?.headcode);

        for (const train of trains) {
            const headcode = train.trainData.headcode;
            const pos = train.position;

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
                        const announcement = `${headcode} is entering ${zone.name}`;
                        announcements.push(announcement);
                        console.log(`🚨 ${announcement}`);
                        state.lastAnnouncement = now;
                    }
                }
                state.isInside = isInside;
            }
        }
        return announcements;
    }
}

// Create global instance
const detectionSystem = new TrainDetectionSystem();

// Main WebSocket Connection
let ws = null;

export function startAnnouncementSystem() {
    if (ws) ws.close();

    console.log("🚀 Starting Dovedale Announcement System...");

    ws = new WebSocket("wss://map.dovedale.wiki/api/ws");

    ws.onopen = () => {
        console.log("✅ Connected to Dovedale WebSocket - Waiting for trains");
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
            // Silent fail on bad messages
        }
    };

    ws.onclose = () => {
        console.log("⚠️ Disconnected. Reconnecting in 5 seconds...");
        setTimeout(startAnnouncementSystem, 5000);
    };

    ws.onerror = () => console.log("❌ WebSocket error");
}

// Make it globally available
window.startAnnouncementSystem = startAnnouncementSystem;
window.detectionSystem = detectionSystem;

console.log("📋 Announcement System loaded. Type startAnnouncementSystem() in console to start.");
