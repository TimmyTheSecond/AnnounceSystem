/**
 * Train Detection System - Integration Helpers
 * 
 * Provides ready-to-use functions for setup and processing.
 * Station coordinates extracted from public/index.js AREA_MARKERS
 * Radius set to 25 studs for detection zones
 */

import {
	trainDetectionSystem,
	type TrainState,
	type TrainData,
} from "./trainDetectionSystem";

interface Position {
	x: number;
	y: number;
}

interface StationZone {
	name: string;
	center: Position;
	radius: number;
}

interface Player {
	username: string;
	position: Position;
	trainData?: {
		destination: string;
		trainClass: string;
		headcode: string;
		trainType: string;
	};
}

/**
 * Station zones for Dovedale Railway
 * Extracted from public/index.js AREA_MARKERS
 * Radius: 25 studs for detection zones
 */
const DEFAULT_STATIONS: StationZone[] = [
	{
		name: "Gleethrop End",
		center: { x: 1274, y: 3563 },
		radius: 25,
	},
	{
		name: "Groenewoud",
		center: { x: -14658, y: -3762 },
		radius: 25,
	},
	{
		name: "Dovedale East",
		center: { x: 1231, y: 534 },
		radius: 25,
	},
	{
		name: "Fanory Mill",
		center: { x: -16821, y: -3954 },
		radius: 25,
	},
	{
		name: "Mazewood",
		center: { x: -4650, y: 5798 },
		radius: 25,
	},
	{
		name: "Conby",
		center: { x: -11688, y: -3270 },
		radius: 25,
	},
	{
		name: "Codsall Castle",
		center: { x: 9991, y: 5236 },
		radius: 25,
	},
	{
		name: "Masonfield",
		center: { x: 10667, y: -881 },
		radius: 25,
	},
	{
		name: "Benyhone Loop",
		center: { x: -19532, y: -5201 },
		radius: 25,
	},
	{
		name: "Perthtyne",
		center: { x: -490, y: 5268 },
		radius: 25,
	},
	{
		name: "Ashburn",
		center: { x: -22012, y: -6729 },
		radius: 25,
	},
	{
		name: "Cosdale Harbour",
		center: { x: 4325, y: -2518 },
		radius: 25,
	},
	{
		name: "Glassbury Junction",
		center: { x: 11592, y: 8663 },
		radius: 25,
	},
	{
		name: "Dovedale Central",
		center: { x: 3157, y: 805 },
		radius: 25,
	},
	{
		name: "Wington Mount",
		center: { x: 2922, y: -2830 },
		radius: 25,
	},
	{
		name: "Marigot Crossing",
		center: { x: 7692, y: 2205 },
		radius: 25,
	},
	{
		name: "Satus",
		center: { x: -7485, y: -3055 },
		radius: 25,
	},
];

/**
 * Initialize the train detection system with all Dovedale stations
 * Call this once on server startup
 */
export function initializeStationZones(): void {
	trainDetectionSystem.registerStationZones(DEFAULT_STATIONS);
	console.log(`✓ Train Detection System initialized with ${DEFAULT_STATIONS.length} stations`);
}

/**
 * Add a custom station zone to the system
 */
export function addCustomStation(zone: StationZone): void {
	trainDetectionSystem.registerStationZone(zone);
	console.log(`✓ Added station: ${zone.name}`);
}

/**
 * Get all registered stations
 */
export function getStations(): StationZone[] {
	return trainDetectionSystem.getStationZones();
}

/**
 * Process train data from player position updates
 * 
 * @param players Array of players with position and optional trainData
 * @returns Array of announcement strings (may be empty)
 * 
 * Usage:
 * ```typescript
 * const announcements = detectTrainsFromPlayerData(data.players);
 * announcements.forEach(ann => console.log(ann));
 * ```
 */
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

/**
 * Get formatted debug information
 * 
 * Usage:
 * ```typescript
 * const debug = getDebugJSON();
 * console.log(JSON.stringify(debug, null, 2));
 * ```
 */
export function getDebugJSON(): {
	stationZones: StationZone[];
	trainStates: any[];
	recentAnnouncements: any[];
	systemHealth: {
		activeTrains: number;
		totalAnnouncements: number;
		cleanupRunning: boolean;
	};
} {
	const state = trainDetectionSystem.getDebugState();
	return {
		stationZones: state.stationZones,
		trainStates: state.trainStates,
		recentAnnouncements: state.recentAnnouncements,
		systemHealth: {
			activeTrains: state.trainStates.length,
			totalAnnouncements: state.recentAnnouncements.length,
			cleanupRunning: true,
		},
	};
}

/**
 * Get announcement statistics
 */
export function getStatistics(): {
	totalAnnouncements: number;
	uniqueTrains: number;
	uniqueStations: number;
	averageAnnouncementsPerTrain: number;
} {
	const history = trainDetectionSystem.getAnnouncementHistory(1000);

	const uniqueTrains = new Set(history.map(a => a.headcode)).size;
	const uniqueStations = new Set(history.map(a => a.stationName)).size;

	return {
		totalAnnouncements: history.length,
		uniqueTrains,
		uniqueStations,
		averageAnnouncementsPerTrain:
			uniqueTrains > 0 ? history.length / uniqueTrains : 0,
	};
}

/**
 * Run a demo of the detection system with mock data
 * Useful for testing configuration and understanding behavior
 */


	if (announcements.length > 0) {
		console.log(`✓ Announcements generated (${announcements.length}):`);
		announcements.forEach(ann => console.log(`  - ${ann}`));
	} else {
		console.log("ℹ No announcements triggered (trains may already be announced)");
	}

	console.log();

	// Show debug state
	const debug = getDebugJSON();
	console.log("Debug State:");
	console.log(JSON.stringify(debug, null, 2));

	console.log("\n✓ Demo Complete!\n");
}

/**
 * Export announcement data for external storage
 * 
 * @param limit Maximum number of recent announcements to export
 * @returns JSON-serializable data
 */
export function exportAnnouncementData(limit: number = 100): string {
	const history = trainDetectionSystem.getAnnouncementHistory(limit);
	const stats = getStatistics();

	return JSON.stringify(
		{
			exportedAt: new Date().toISOString(),
			statistics: stats,
			announcements: history.map(a => ({
				...a,
				timestamp: new Date(a.timestamp).toISOString(),
			})),
		},
		null,
		2,
	);
}

/**
 * Helper: Check if a train is currently announced (recently)
 * Useful for UI indicators
 */
export function isTrainRecentlyAnnounced(
	headcode: string,
	stationName?: string,
	withinMs: number = 5 * 60 * 1000,
): boolean {
	const now = Date.now();
	const history = trainDetectionSystem.getAnnouncementHistory(100);

	return history.some(
		a =>
			a.headcode === headcode &&
			(!stationName || a.stationName === stationName) &&
			now - a.timestamp <= withinMs,
	);
}

/**
 * Helper: Get all trains announced at a specific station recently
 */
export function getTrainsAtStation(
	stationName: string,
	withinMinutes: number = 5,
): string[] {
	const now = Date.now();
	const threshold = withinMinutes * 60 * 1000;
	const history = trainDetectionSystem.getAnnouncementHistory(200);

	const trains = new Set<string>();
	history.forEach(a => {
		if (a.stationName === stationName && now - a.timestamp <= threshold) {
			trains.add(a.headcode);
		}
	});

	return Array.from(trains);
}

export default {
	initializeStationZones,
	addCustomStation,
	getStations,
	detectTrainsFromPlayerData,
	getDebugJSON,
	getStatistics,
	runDetectionDemo,
	exportAnnouncementData,
	isTrainRecentlyAnnounced,
	getTrainsAtStation,
};
