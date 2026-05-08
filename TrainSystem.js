// =============================================
// Dovedale Train Announcement System (Updated)
// Tracking by Player ID to detect headcode changes
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
        // Map stores player unique ID -> { currentHeadcode, stationStates: [] }
        this.trainStates = new Map();
        this.DEBOUNCE_INTERVAL = 5 * 60 * 1000; 
    }

    init() {
        this.stationZones = DEFAULT_STATIONS;
        console.log(`✅ Train Detection System initialized.`);
    }

    calculateDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    async announce(message) {
        console.log(`📢 ANNOUNCEMENT: ${message}`);
        try {
            await fetch("http://127.0.0.1:3000", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: message })
            });
        } catch (e) {
            console.error("Failed to send announcement to local server");
        }
    }

    processTrains(players) {
        const activeTrains = players.filter(p => p.trainData?.headcode);

        for (const train of activeTrains) {
            // Use username or unique ID as the primary key, NOT the headcode
            const trainId = train.username || train.id; 
            const headcode = train.trainData.headcode;
            const pos = train.position;

            // 1. Check if it's a brand new spawn
            if (!this.trainStates.has(trainId)) {
                const nearestStation = this.stationZones.find(z => this.calculateDistance(pos, z.center) <= z.radius);
                const spawnLoc = nearestStation ? `at ${nearestStation.name}` : "outside a station";
                
                this.announce(`${headcode} spawned ${spawnLoc}`);
                
                this.trainStates.set(trainId, {
                    lastHeadcode: headcode,
                    stationStates: []
                });
                continue;
            }

            const stateData = this.trainStates.get(trainId);

            // 2. Check for Headcode Change
            if (stateData.lastHeadcode !== headcode) {
                this.announce(`${stateData.lastHeadcode} changed its headcode to ${headcode}`);
                stateData.lastHeadcode = headcode;
            }

            // 3. Process Station Entries
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
                        this.announce(`${headcode} is entering ${zone.name}`);
                        zoneState.lastAnnouncement = now;
                    }
                }
                zoneState.isInside = isInside;
            }
        }
    }
}

// ... (Rest of the WebSocket logic remains the same)
