/**
 * Dovedale Live Announcement Integration
 */
import { initializeStationZones, detectTrainsFromPlayerData } from "./integrationHelpers";

let ws: WebSocket | null = null;

export function startAnnouncementSystem() {
    if (ws) ws.close();

    const url = "wss://map.dovedale.wiki/api/ws";
    console.log("🚂 Starting Dovedale Announcement System...");

    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log("✅ Connected to Dovedale map - Live announcements active");
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            let players: any[] = [];

            if (Array.isArray(data)) {
                players = data;
            } else if (data && typeof data === "object") {
                if (data.username && data.position) {
                    players = [data];
                } else if (Array.isArray(data.players)) {
                    players = data.players;
                }
            }

            if (players.length > 0) {
                const announcements = detectTrainsFromPlayerData(players);

                if (announcements.length > 0) {
                    console.log(`📢 ${announcements.length} announcement(s) triggered:`);
                    announcements.forEach(ann => console.log(`   ${ann}`));
                }
            }
        } catch (err) {
            console.error("Failed to parse message:", err);
        }
    };

    ws.onerror = (err) => console.error("WebSocket Error:", err);

    ws.onclose = () => {
        console.warn("⚠️ WebSocket closed. Reconnecting in 5s...");
        setTimeout(startAnnouncementSystem, 5000);
    };
}

export function stopAnnouncementSystem() {
    ws?.close();
    ws = null;
}

// Auto-start when imported (optional)
if (typeof window !== "undefined") {
    initializeStationZones();
    // startAnnouncementSystem();   // Uncomment if you want auto-start
}

export { startAnnouncementSystem, stopAnnouncementSystem };
