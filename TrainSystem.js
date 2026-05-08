// =============================================
// Dovedale Train Announcement System
// Auto-detects map + Visual Radius Circles
// =============================================

console.log("📋 TrainSystem.js loaded");

const DEFAULT_STATIONS = [
    { name: "Gleethrop End", center: { x: 1274, y: 3563 }, radius: 750 },
    { name: "Dovedale East", center: { x: 1231, y: 534 }, radius: 750 },
    { name: "Fanory Mill", center: { x: -16821, y: -3954 }, radius: 750 },
    { name: "Mazewood", center: { x: -4650, y: 5798 }, radius: 750 },
    { name: "Codsall Castle", center: { x: 9991, y: 5236 }, radius: 750 },
    { name: "Masonfield", center: { x: 10667, y: -881 }, radius: 750 },
    { name: "Ashburn", center: { x: -22012, y: -6729 }, radius: 750 },
    { name: "Cosdale Harbour", center: { x: 4325, y: -2518 }, radius: 750 },
    { name: "Glassbury Junction", center: { x: 11592, y: 8663 }, radius: 750 },
    { name: "Dovedale Central", center: { x: 3157, y: 805 }, radius: 750 },
    { name: "Satus", center: { x: -7485, y: -3055 }, radius: 750 },
];

class TrainDetectionSystem {
    constructor() {
        this.stationZones = [];
        this.trainStates = new Map();
        this.DEBOUNCE_INTERVAL = 5 * 60 * 1000;
        this.circleLayers = [];
    }

    init() {
        this.stationZones = DEFAULT_STATIONS;
        console.log(`✅ Train Detection System ready with ${this.stationZones.length} stations`);
        
        const map = this.findMap();
        if (map) {
            this.drawStationCircles(map);
        } else {
            console.warn("⚠️ Could not find Leaflet map automatically.");
        }
    }

    findMap() {
        // Try common global variable names
        if (window.map) return window.map;
        if (window.state?.map) return window.state.map;
        if (window.L?.map) {
            // Last resort: find any Leaflet map on the page
            const maps = document.querySelectorAll('.leaflet-container');
            if (maps.length > 0) {
                console.log("Found Leaflet map container");
                return window.map || window.state?.map;
            }
        }
        return null;
    }

    drawStationCircles(map) {
        // Remove old circles
        this.circleLayers.forEach(layer => {
            if (map.hasLayer(layer)) map.removeLayer(layer);
        });
        this.circleLayers = [];

        DEFAULT_STATIONS.forEach(station => {
            const circle = L.circle([station.center.y, station.center.x], {
                radius: station.radius,
                color: "#ffff00",
                weight: 2,
                opacity: 0.9,
                fillColor: "#ffff00",
                fillOpacity: 0.5,           // 50% transparency
            }).addTo(map);

            circle.bindTooltip(station.name, { 
                permanent: false, 
                direction: "center",
                className: "station-radius-label"
            });

            this.circleLayers.push(circle);
        });

        console.log(`🟡 Drew ${DEFAULT_STATIONS.length} transparent radius circles`);
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

            if (!this.trainStates.has(headcode)) this.trainStates.set(headcode, []);

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
                        console.log(`🚨 ${announcement}`);
                        state.lastAnnouncement = now;
                    }
                }
                state.isInside = isInside;
            }
        }
    }
}

// Global instance
const detectionSystem = new TrainDetectionSystem();
let ws = null;

export function startAnnouncementSystem() {
    if (ws) ws.close();

    console.log("🚀 Starting Dovedale Announcement System...");
    
    ws = new WebSocket("wss://map.dovedale.wiki/api/ws");

    ws.onopen = () => {
        console.log("✅ WebSocket Connected");
        detectionSystem.init();           // Auto finds map + draws circles
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
        console.log("⚠️ Disconnected - Reconnecting in 5s...");
        setTimeout(startAnnouncementSystem, 5000);
    };

    ws.onerror = () => console.log("❌ WebSocket error");
}

// Make available globally
window.startAnnouncementSystem = startAnnouncementSystem;
window.detectionSystem = detectionSystem;

console.log("✅ TrainSystem ready! Type **startAnnouncementSystem()** in console to start.");
