// =============================================
// Dovedale Train Announcement System (v2.3)
// Fixed Server Filtering
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
        this.stationZones = DEFAULT_STATIONS;
        this.trainStates = new Map();

        this.DEBOUNCE_INTERVAL = 5 * 60 * 1000;
        this.EXPIRY_TIME = 10000;
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
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: message
                })
            });
        } catch (e) {
            console.warn("⚠️ Failed to send announcement");
        }
    }

    // Build lookup map
    getPlayerServerMap() {
        const serverData = window.state?.serverData;

        if (!serverData) {
            return new Map();
        }

        const map = new Map();

        for (const [jobId, data] of Object.entries(serverData)) {
            if (!Array.isArray(data.players)) continue;

            for (const player of data.players) {
                if (!player?.userId) continue;

                map.set(String(player.userId), {
                    full: jobId,
                    short: jobId.slice(-6)
                });
            }
        }

        return map;
    }

    getServerNameForPlayer(player, playerServerMap) {
        if (!player?.userId) {
            return null;
        }

        return playerServerMap.get(String(player.userId)) || null;
    }

    // Get active servers
    getAllServers() {
        const serverData = window.state?.serverData;

        if (!serverData) {
            console.warn("⚠️ state.serverData not loaded yet");
            return [];
        }

        return Object.keys(serverData).map(jobId => ({
            full: jobId,
            short: jobId.slice(-6)
        }));
    }

    processTrains(players, targetServerId = null) {
        const now = Date.now();

        let filteredPlayers = players;

        const playerServerMap = this.getPlayerServerMap();

        // Filter by server
        if (targetServerId && targetServerId !== "all") {
            const target = String(targetServerId).trim();

            filteredPlayers = players.filter(player => {
                const serverInfo = this.getServerNameForPlayer(
                    player,
                    playerServerMap
                );

                if (!serverInfo) {
                    return false;
                }

                return (
                    serverInfo.short === target ||
                    serverInfo.full === target
                );
            });

            console.log(
                `🎯 Server filter ${target}: ${filteredPlayers.length}/${players.length} players matched`
            );
        }

        const activeTrains = filteredPlayers.filter(player => {
            return player?.trainData?.headcode;
        });

        for (const train of activeTrains) {
            const trainId = train.username || train.id;

            const currentHeadcode = train.trainData.headcode;

            const pos = train.position;

            if (!pos) continue;

            // New train
            if (!this.trainStates.has(trainId)) {
                const spawnZone = this.stationZones.find(zone => {
                    return (
                        this.calculateDistance(pos, zone.center) <=
                        zone.radius
                    );
                });

                const spawnedInStation = !!spawnZone;

                if (spawnedInStation) {
                    this.announce(
                        `${currentHeadcode} spawned at ${spawnZone.name}`
                    );
                } else {
                    this.announce(
                        `${currentHeadcode} spawned out on the line`
                    );
                }

                this.trainStates.set(trainId, {
                    lastHeadcode: currentHeadcode,
                    lastHeadcodeChange: now,
                    stationStates: [],
                    lastSeen: now,
                    suppressNextEntry: !spawnedInStation
                });

                if (spawnedInStation) {
                    this.trainStates.get(trainId).stationStates.push({
                        stationName: spawnZone.name,
                        isInside: true,
                        lastAnnouncement: now
                    });
                }

                continue;
            }

            const stateData = this.trainStates.get(trainId);

            stateData.lastSeen = now;

            // Headcode changed
            if (stateData.lastHeadcode !== currentHeadcode) {
                if (
                    now - (stateData.lastHeadcodeChange || 0) >
                    this.DEBOUNCE_INTERVAL
                ) {
                    this.announce(
                        `${stateData.lastHeadcode} changed its headcode to ${currentHeadcode}`
                    );

                    stateData.lastHeadcodeChange = now;
                }

                stateData.lastHeadcode = currentHeadcode;
            }

            // Station detection
            for (const zone of this.stationZones) {
                const distance = this.calculateDistance(
                    pos,
                    zone.center
                );

                const isInside = distance <= zone.radius;

                let zoneState = stateData.stationStates.find(
                    s => s.stationName === zone.name
                );

                if (!zoneState) {
                    zoneState = {
                        stationName: zone.name,
                        isInside: false,
                        lastAnnouncement: 0
                    };

                    stateData.stationStates.push(zoneState);
                }

                // Entered station
                if (!zoneState.isInside && isInside) {
                    if (
                        !stateData.suppressNextEntry &&
                        now - zoneState.lastAnnouncement >
                        this.DEBOUNCE_INTERVAL
                    ) {
                        this.announce(
                            `${currentHeadcode} is entering ${zone.name}`
                        );

                        zoneState.lastAnnouncement = now;
                    }

                    if (stateData.suppressNextEntry) {
                        stateData.suppressNextEntry = false;
                    }
                }

                zoneState.isInside = isInside;
            }
        }

        // Cleanup old trains
        for (const [id, state] of this.trainStates.entries()) {
            if (now - state.lastSeen > this.EXPIRY_TIME) {
                this.trainStates.delete(id);
            }
        }
    }
}

const detectionSystem = new TrainDetectionSystem();

let ws = null;

export function startAnnouncementSystem(serverId = "all") {
    if (ws) {
        ws.close();
    }

    // Delay server listing slightly so state.serverData can load
    setTimeout(() => {
        const availableServers =
            detectionSystem.getAllServers();

        console.log(
            `📡 Found ${availableServers.length} active servers:`
        );

        availableServers.forEach(server => {
            console.log(`   → ${server.short}`);
        });
    }, 2000);

    if (serverId && serverId !== "all") {
        console.log(`🎯 Targeting server: ${serverId}`);
    } else {
        console.log(`🌐 Monitoring ALL servers`);
    }

    ws = new WebSocket(
        "wss://map.dovedale.wiki/api/ws"
    );

    ws.onopen = () => {
        console.log("✅ WebSocket connected");
    };

    ws.onmessage = event => {
        try {
            const data = JSON.parse(event.data);

            let players = [];

            if (Array.isArray(data)) {
                players = data;
            } else if (Array.isArray(data.players)) {
                players = data.players;
            } else if (data.username) {
                players = [data];
            }

            if (players.length > 0) {
                detectionSystem.processTrains(
                    players,
                    serverId
                );
            }
        } catch (e) {
            console.error("❌ Parse error:", e);
        }
    };

    ws.onclose = () => {
        console.log(
            "⚠️ WebSocket closed. Reconnecting in 5s..."
        );

        setTimeout(() => {
            startAnnouncementSystem(serverId);
        }, 5000);
    };

    ws.onerror = err => {
        console.error("❌ WebSocket error:", err);
    };
}

window.startAnnouncementSystem =
    startAnnouncementSystem;

console.log("✅ System ready!");
console.log("Usage:");
console.log(
    "   startAnnouncementSystem()"
);
console.log(
    "   startAnnouncementSystem('2e1a96')"
);
console.log(
    "   startAnnouncementSystem('full-job-id')"
);
