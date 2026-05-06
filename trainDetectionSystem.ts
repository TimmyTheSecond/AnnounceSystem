/**
 * Train Detection System - Core Engine
 * 
 * Advanced detection system for train announcements
 * - Zone-based proximity detection (25 stud radius)
 * - Direction verification (velocity toward station)
 * - Entry detection (outside → inside only)
 * - 5-minute debounce per train per station
 * - Idle detection (no re-announcement after 5+ minutes)
 * - Automatic memory cleanup
 */

export interface Position {
	x: number;
	y: number;
}

export interface TrainData {
	destination: string;
	trainClass: string;
	headcode: string;
	trainType: string;
}

export interface TrainState {
	headcode: string;
	position: Position;
	trainData: TrainData;
	velocity?: Position;
}

export interface StationZone {
	name: string;
	center: Position;
	radius: number;
}

interface InternalTrainState {
	headcode: string;
	stationName: string;
	isInside: boolean;
	lastAnnouncementTime: number | null;
	lastSeenTime: number;
	lastPosition: Position;
}

interface AnnouncementRecord {
	timestamp: number;
	headcode: string;
	stationName: string;
}

/**
 * TrainDetectionSystem - Main detection engine
 */
class TrainDetectionSystem {
	private stationZones: StationZone[] = [];
	private trainStates: Map<string, InternalTrainState[]> = new Map();
	private announcementHistory: AnnouncementRecord[] = [];

	// Configuration (adjustable)
	private readonly DEBOUNCE_INTERVAL = 5 * 60 * 1000; // 5 minutes
	private readonly IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
	private readonly STALE_STATE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
	private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
	private readonly HISTORY_RETENTION = 60 * 60 * 1000; // 1 hour

	constructor() {
		// Start cleanup interval
		setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
	}

	/**
	 * Register a single station zone
	 */
	registerStationZone(zone: StationZone): void {
		this.stationZones.push(zone);
	}

	/**
	 * Register multiple station zones
	 */
	registerStationZones(zones: StationZone[]): void {
		this.stationZones.push(...zones);
	}

	/**
	 * Get all registered station zones
	 */
	getStationZones(): StationZone[] {
		return [...this.stationZones];
	}

	/**
	 * Calculate distance between two points
	 */
	private calculateDistance(p1: Position, p2: Position): number {
		const dx = p1.x - p2.x;
		const dy = p1.y - p2.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * Calculate dot product of velocity and station direction
	 * Returns positive if moving toward station, negative if away
	 */
	private calculateDotProduct(
		velocity: Position | undefined,
		trainPos: Position,
		stationCenter: Position,
	): number {
		if (!velocity || (velocity.x === 0 && velocity.y === 0)) {
			return 1; // No velocity data - allow
		}

		// Direction vector from train to station
		const stationDir = {
			x: stationCenter.x - trainPos.x,
			y: stationCenter.y - trainPos.y,
		};

		// Normalize station direction
		const stationDist = Math.sqrt(
			stationDir.x * stationDir.x + stationDir.y * stationDir.y,
		);
		if (stationDist === 0) return 1; // At station - allow

		const normalizedDir = {
			x: stationDir.x / stationDist,
			y: stationDir.y / stationDist,
		};

		// Dot product: velocity · stationDirection
		return velocity.x * normalizedDir.x + velocity.y * normalizedDir.y;
	}

	/**
	 * Process a single train
	 * Returns announcement string if triggered, null otherwise
	 */
	processTrain(train: TrainState): string | null {
		const now = Date.now();
		const headcode = train.headcode;

		// Get or create train state array
		if (!this.trainStates.has(headcode)) {
			this.trainStates.set(headcode, []);
		}
		const trainStateArray = this.trainStates.get(headcode)!;

		let announcement: string | null = null;

		// Check each station
		for (const zone of this.stationZones) {
			const distance = this.calculateDistance(train.position, zone.center);
			const isInside = distance <= zone.radius;

			// Find or create state for this train at this station
			let stateEntry = trainStateArray.find(s => s.stationName === zone.name);
			if (!stateEntry) {
				stateEntry = {
					headcode,
					stationName: zone.name,
					isInside: false,
					lastAnnouncementTime: null,
					lastSeenTime: now,
					lastPosition: { ...train.position },
				};
				trainStateArray.push(stateEntry);
			}

			// Update last seen
			stateEntry.lastSeenTime = now;
			stateEntry.lastPosition = { ...train.position };

			// Check for entry event
			const wasOutside = !stateEntry.isInside;
			const isNowInside = isInside;

			if (wasOutside && isNowInside) {
				// Train entering zone

				// Check direction
				const dotProduct = this.calculateDotProduct(
					train.velocity,
					train.position,
					zone.center,
				);
				if (dotProduct < 0) {
					// Train moving away from station
					stateEntry.isInside = true;
					continue;
				}

				// Check debounce
				if (
					stateEntry.lastAnnouncementTime !== null &&
					now - stateEntry.lastAnnouncementTime < this.DEBOUNCE_INTERVAL
				) {
					// Debounce active
					stateEntry.isInside = true;
					continue;
				}

				// Announce!
				announcement = `${headcode} is entering ${zone.name}`;
				stateEntry.lastAnnouncementTime = now;
				stateEntry.isInside = true;

				// Record in history
				this.announcementHistory.push({
					timestamp: now,
					headcode,
					stationName: zone.name,
				});

				// Log to console
				console.log(`🚂 ${announcement}`);

				return announcement;
			} else if (!isNowInside) {
				// Train exited or staying outside
				stateEntry.isInside = false;
			} else {
				// Train staying inside - update state
				stateEntry.isInside = true;
			}
		}

		return null;
	}

	/**
	 * Process multiple trains at once
	 */
	processTrains(trains: TrainState[]): string[] {
		const announcements: string[] = [];

		for (const train of trains) {
			const announcement = this.processTrain(train);
			if (announcement) {
				announcements.push(announcement);
			}
		}

		return announcements;
	}

	/**
	 * Get announcement history
	 */
	getAnnouncementHistory(limit: number = 100): AnnouncementRecord[] {
		return this.announcementHistory.slice(-limit);
	}

	/**
	 * Get debug state
	 */
	getDebugState(): {
		stationZones: StationZone[];
		trainStates: Array<{
			headcode: string;
			stationName: string;
			isInside: boolean;
			timeSinceLastAnnouncement: number | null;
		}>;
		recentAnnouncements: AnnouncementRecord[];
	} {
		const now = Date.now();
		const trainStatesFlat: Array<{
			headcode: string;
			stationName: string;
			isInside: boolean;
			timeSinceLastAnnouncement: number | null;
		}> = [];

		this.trainStates.forEach((stateArray, headcode) => {
			stateArray.forEach(state => {
				trainStatesFlat.push({
					headcode,
					stationName: state.stationName,
					isInside: state.isInside,
					timeSinceLastAnnouncement:
						state.lastAnnouncementTime !== null
							? now - state.lastAnnouncementTime
							: null,
				});
			});
		});

		return {
			stationZones: this.stationZones,
			trainStates: trainStatesFlat,
			recentAnnouncements: this.announcementHistory.slice(-50),
		};
	}

	/**
	 * Internal cleanup function
	 * Removes stale states and old announcement history
	 */
	private cleanup(): void {
		const now = Date.now();

		// Clean up stale train states
		this.trainStates.forEach((stateArray, headcode) => {
			const activeStates = stateArray.filter(
				s => now - s.lastSeenTime < this.STALE_STATE_TIMEOUT,
			);

			if (activeStates.length === 0) {
				this.trainStates.delete(headcode);
			} else {
				this.trainStates.set(headcode, activeStates);
			}
		});

		// Clean up old announcement history
		this.announcementHistory = this.announcementHistory.filter(
			a => now - a.timestamp < this.HISTORY_RETENTION,
		);
	}
}

/**
 * Global singleton instance
 */
export const trainDetectionSystem = new TrainDetectionSystem();
