/**
 * Train Detection System - Core Engine
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
 * Main Detection Engine
 */
class TrainDetectionSystem {
    private stationZones: StationZone[] = [];
    private trainStates: Map<string, InternalTrainState[]> = new Map();
    private announcementHistory: AnnouncementRecord[] = [];

    private readonly DEBOUNCE_INTERVAL = 5 * 60 * 1000;   // 5 minutes
    private readonly IDLE_THRESHOLD = 5 * 60 * 1000;
    private readonly STALE_STATE_TIMEOUT = 30 * 60 * 1000;
    private readonly CLEANUP_INTERVAL = 10 * 60 * 1000;
    private readonly HISTORY_RETENTION = 60 * 60 * 1000;

    constructor() {
        setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    }

    registerStationZone(zone: StationZone): void {
        this.stationZones.push(zone);
    }

    registerStationZones(zones: StationZone[]): void {
        this.stationZones.push(...zones);
    }

    getStationZones(): StationZone[] {
        return [...this.stationZones];
    }

    private calculateDistance(p1: Position, p2: Position): number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private calculateDotProduct(velocity: Position | undefined, trainPos: Position, stationCenter: Position): number {
        if (!velocity || (velocity.x === 0 && velocity.y === 0)) return 1;

        const stationDir = { x: stationCenter.x - trainPos.x, y: stationCenter.y - trainPos.y };
        const stationDist = Math.sqrt(stationDir.x * stationDir.x + stationDir.y * stationDir.y);
        if (stationDist === 0) return 1;

        const normalizedDir = { x: stationDir.x / stationDist, y: stationDir.y / stationDist };
        return velocity.x * normalizedDir.x + velocity.y * normalizedDir.y;
    }

    processTrain(train: TrainState): string | null {
        const now = Date.now();
        const headcode = train.headcode;

        if (!this.trainStates.has(headcode)) {
            this.trainStates.set(headcode, []);
        }

        const trainStateArray = this.trainStates.get(headcode)!;
        let announcement: string | null = null;

        for (const zone of this.stationZones) {
            const distance = this.calculateDistance(train.position, zone.center);
            const isInside = distance <= zone.radius;

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

            stateEntry.lastSeenTime = now;
            stateEntry.lastPosition = { ...train.position };

            const wasOutside = !stateEntry.isInside;
            const isNowInside = isInside;

            if (wasOutside && isNowInside) {
                const dotProduct = this.calculateDotProduct(train.velocity, train.position, zone.center);

                if (dotProduct < 0) {
                    stateEntry.isInside = true;
                    continue;
                }

                if (stateEntry.lastAnnouncementTime !== null &&
                    now - stateEntry.lastAnnouncementTime < this.DEBOUNCE_INTERVAL) {
                    stateEntry.isInside = true;
                    continue;
                }

                announcement = `${headcode} is entering ${zone.name}`;
                stateEntry.lastAnnouncementTime = now;
                stateEntry.isInside = true;

                this.announcementHistory.push({ timestamp: now, headcode, stationName: zone.name });
                console.log(`🚂 ${announcement}`);
                return announcement;
            } else if (!isNowInside) {
                stateEntry.isInside = false;
            } else {
                stateEntry.isInside = true;
            }
        }
        return null;
    }

    processTrains(trains: TrainState[]): string[] {
        const announcements: string[] = [];
        for (const train of trains) {
            const ann = this.processTrain(train);
            if (ann) announcements.push(ann);
        }
        return announcements;
    }

    getAnnouncementHistory(limit: number = 100): AnnouncementRecord[] {
        return this.announcementHistory.slice(-limit);
    }

    getDebugState() {
        const now = Date.now();
        const trainStatesFlat: any[] = [];
        this.trainStates.forEach((stateArray, headcode) => {
            stateArray.forEach(state => {
                trainStatesFlat.push({
                    headcode,
                    stationName: state.stationName,
                    isInside: state.isInside,
                    timeSinceLastAnnouncement: state.lastAnnouncementTime ? now - state.lastAnnouncementTime : null,
                });
            });
        });

        return {
            stationZones: this.stationZones,
            trainStates: trainStatesFlat,
            recentAnnouncements: this.announcementHistory.slice(-50),
        };
    }

    private cleanup(): void {
        const now = Date.now();

        this.trainStates.forEach((stateArray, headcode) => {
            const active = stateArray.filter(s => now - s.lastSeenTime < this.STALE_STATE_TIMEOUT);
            if (active.length === 0) this.trainStates.delete(headcode);
            else this.trainStates.set(headcode, active);
        });

        this.announcementHistory = this.announcementHistory.filter(
            a => now - a.timestamp < this.HISTORY_RETENTION
        );
    }
}

export const trainDetectionSystem = new TrainDetectionSystem();
