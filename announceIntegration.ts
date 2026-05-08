/**
 * Dovedale Live Announcement Integration - DEBUG VERSION
 */
import { initializeStationZones, detectTrainsFromPlayerData } from "./trainDetectionIntegration";

let ws: WebSocket | null = null;

export function startAnnouncementSystem() {
    console.log("🚀 startAnnouncementSystem() called");

    if (ws) {
        console.log("Closing existing connection...");
        ws.close();
    }

    const url = "wss://map.dovedale.wiki/api/ws";
    console.log(`Attempting to connect to: ${url}`);

    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log("✅ WebSocket CONNECTED successfully!");
    };

    ws.onmessage = (event) => {
        console.log("📥 Raw message received:", event.data.substring(0, 300) + "..."); // first 300 chars

        try {
            const data = JSON.parse(event.data);
            console.log("✅ Parsed data successfully");

            let players: any[] = [];

            if (Array.isArray(data)) {
                players = data;
                console.log(`Received array with ${players.length} players`);
            } else if (data && typeof data === "object") {
                if (data.username && data.position) {
                    players = [data];
                    console.log("Received single player update");
                } else if (Array.isArray(data.players)) {
                    players = data.players;
                    console.log(`Received data.players array with ${players.length} players`);
                }
            }

            console.log(`Total players to process: ${players.length}`);

            const trains = players.filter(p => p.trainData?.headcode);
            console.log(`Trains detected: ${trains.length}`);

            if (trains.length > 0) {
                const announcements = detectTrainsFromPlayerData(players);
                console.log(`Announcements generated: ${announcements.length}`);

                if (announcements.length > 0) {
                    console.log("🚨 ANNOUNCEMENTS:");
                    announcements.forEach(ann => console.log(`   → ${ann}`));
                }
            } else {
                console.log("No trains with headcodes right now.");
            }

        } catch (err) {
            console.error("❌ Error parsing message:", err);
        }
    };

    ws.onerror = (err) => {
        console.error("❌ WebSocket ERROR occurred", err);
    };

    ws.onclose = (event) => {
        console.warn(`⚠️ WebSocket CLOSED (code: ${event.code})`);
        setTimeout(() => {
            console.log("Reconnecting...");
            startAnnouncementSystem();
        }, 5000);
    };
}

// Auto start + big visible log
console.log("📌 Announcement Integration script LOADED");
initializeStationZones();

// Uncomment this if you want it to start automatically
startAnnouncementSystem();

export { startAnnouncementSystem };
