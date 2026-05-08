/**
 * Train Detection System - Integration Helpers
 */
import { trainDetectionSystem, type TrainState, type StationZone } from "./trainDetectionSystem";

interface Position {
    x: number;
    y: number;
}

interface Player {
    username: string;
    userId?: number;
    position: Position;
    trainData?: {
        destination: string;
        trainClass: string;
        headcode: string;
        trainType: string;
    };
}

/** Station Zones */
const DEFAULT_STATIONS: StationZone[] = [
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

export function initializeStationZones(): void {
    trainDetectionSystem.registerStationZones(DEFAULT_STATIONS);
    console.log(`✓ Train Detection System initialized with ${DEFAULT_STATIONS.length} stations`);
}

export function detectTrainsFromPlayerData(players: Player[]): string[] {
    const trains: TrainState[] = players
        .filter(p => p.trainData?.headcode)
        .map(p => ({
            headcode: p.trainData!.headcode,
            position: p.position,
            trainData: p.trainData!,
        }));

    return trainDetectionSystem.processTrains(trains);
}

export function getDebugJSON() {
    return trainDetectionSystem.getDebugState();
}

export function getAnnouncementHistory(limit = 100) {
    return trainDetectionSystem.getAnnouncementHistory(limit);
}

export default {
    initializeStationZones,
    detectTrainsFromPlayerData,
    getDebugJSON,
    getAnnouncementHistory,
};
