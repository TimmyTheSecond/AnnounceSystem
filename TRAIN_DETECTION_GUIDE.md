````markdown name=TRAIN_DETECTION_GUIDE.md

# Train Detection and Announcement System

## Overview

This is an **advanced train detection system** that monitors trains entering station proximity zones and announces them with the format:

```
[HEADCODE] is entering [STATION NAME]
```

Example: `1A75 is entering Dovedale East`

---

## Features

### ✅ Core Functionality

- **Zone-Based Detection**: Uses circular proximity zones around stations (radius: 25 studs)
- **Direction Verification**: Confirms trains are moving toward the station (not away)
- **Entry Detection**: Triggers only on zone entry (from outside → inside), not while lingering
- **Headcode Retrieval**: Automatically extracts train headcode from player train data
- **State Tracking**: Maintains per-train, per-station state

### ✅ Smart Rules & Constraints

1. **Single Announcement Per Entry** - Each train announced only once when entering
2. **5-Minute Debounce** - Same train cannot be announced at same station within 5 minutes
3. **Idle Detection** - Won't re-announce if train stays idle in station
4. **Direction Check** - Validates train velocity is toward station center
5. **Physics Jitter Handling** - Prevents multiple triggers from boundary crossing

### ✅ Memory Management

- Automatic cleanup of old announcement records (>1 hour old)
- Stale state removal (trains not seen for 30+ minutes)
- Configurable intervals to prevent memory bloat

---

## All Dovedale Stations (17 Total)

Detection zones configured with exact coordinates from `public/index.js` and radius of 25 studs:

| Station | X | Y | Radius |
|---------|---|---|--------|
| Gleethrop End | 1274 | 3563 | 25 |
| Groenewoud | -14658 | -3762 | 25 |
| Dovedale East | 1231 | 534 | 25 |
| Fanory Mill | -16821 | -3954 | 25 |
| Mazewood | -4650 | 5798 | 25 |
| Conby | -11688 | -3270 | 25 |
| Codsall Castle | 9991 | 5236 | 25 |
| Masonfield | 10667 | -881 | 25 |
| Benyhone Loop | -19532 | -5201 | 25 |
| Perthtyne | -490 | 5268 | 25 |
| Ashburn | -22012 | -6729 | 25 |
| Cosdale Harbour | 4325 | -2518 | 25 |
| Glassbury Junction | 11592 | 8663 | 25 |
| Dovedale Central | 3157 | 805 | 25 |
| Wington Mount | 2922 | -2830 | 25 |
| Marigot Crossing | 7692 | 2205 | 25 |
| Satus | -7485 | -3055 | 25 |

---

## Architecture

### File Structure

```
├── trainDetectionSystem.ts          # Core system (main logic)
├── trainDetectionIntegration.ts     # Integration helpers & setup
├── server-enhanced.ts               # Example: Updated server.ts
└── TRAIN_DETECTION_GUIDE.md         # This file
```

### Class: `TrainDetectionSystem`

**Main class** that handles all detection logic.

#### Key Methods

| Method | Description |
|--------|-------------|
| `registerStationZone(zone)` | Register a single station zone |
| `registerStationZones(zones)` | Register multiple zones at once |
| `processTrain(train)` | Process a single train; returns announcement string or null |
| `processTrains(trains)` | Process multiple trains; returns array of announcements |
| `getAnnouncementHistory(limit)` | Retrieve recent announcements |
| `getDebugState()` | Get system state for debugging |

#### Configuration

All timing values are configurable in the class:

```typescript
private readonly DEBOUNCE_INTERVAL = 5 * 60 * 1000;      // 5 minutes
private readonly IDLE_THRESHOLD = 5 * 60 * 1000;         // 5 minutes
private readonly STALE_STATE_TIMEOUT = 30 * 60 * 1000;   // 30 minutes
```

---

## Setup & Integration

### Step 1: Initialize Station Zones

Station zones are automatically initialized with all Dovedale stations:

```typescript
import { initializeStationZones } from "./trainDetectionIntegration";

// Call on server startup
initializeStationZones();
```

### Step 2: Process Trains from Position Updates

In your position update handler, extract trains and process them:

```typescript
import { detectTrainsFromPlayerData } from "./trainDetectionIntegration";

async function positionsApi(context: Context) {
	const data = result.data;
	
	// ... existing validation code ...

	// Process trains (this triggers announcements)
	const announcements = detectTrainsFromPlayerData(data.players);

	// Broadcast announcements via WebSocket
	announcements.forEach(announcement => {
		webSockets.forEach(ws => {
			ws.send(JSON.stringify({
				type: "train-announcement",
				message: announcement
			}));
		});
	});

	// ... existing cache/broadcast code ...
}
```

### Step 3: Handle Announcements

The system logs announcements to console and stores them:

```typescript
// Announcements are automatically logged:
// "🚂 1A75 is entering Dovedale East"

// Retrieve announcement history
const history = trainDetectionSystem.getAnnouncementHistory(50);
// [{ timestamp, headcode, stationName }, ...]
```

---

## Data Structures

### StationZone

```typescript
interface StationZone {
	name: string;           // Station name ("Dovedale East")
	center: Position;       // Station center coordinates { x, y }
	radius: number;         // Detection radius in studs (25)
}
```

### TrainState

```typescript
interface TrainState {
	headcode: string;       // Train identifier ("1A75")
	position: Position;     // Current position { x, y }
	trainData: TrainData;   // Full train info { destination, trainClass, headcode, trainType }
	velocity?: Position;    // Optional: movement vector { x, y }
}
```

### AnnouncementRecord

```typescript
interface AnnouncementRecord {
	timestamp: number;      // Unix timestamp
	headcode: string;       // Train headcode
	stationName: string;    // Station name
}
```

---

## Advanced Usage

### Debug Endpoint

```typescript
// Add to your Hono server:
app.get("/api/train-detection/debug", (context) => {
	const state = trainDetectionSystem.getDebugState();
	return context.json(state);
});
```

**Response:**
```json
{
	"stationZones": [
		{ "name": "Dovedale East", "center": { "x": 1231, "y": 534 }, "radius": 25 }
	],
	"trainStates": [
		{
			"headcode": "1A75",
			"stationName": "Dovedale East",
			"isInside": true,
			"timeSinceLastAnnouncement": 12345
		}
	],
	"recentAnnouncements": [
		{ "timestamp": 1234567890, "headcode": "1A75", "stationName": "Dovedale East" }
	]
}
```

### Export Analytics

```typescript
const history = trainDetectionSystem.getAnnouncementHistory();

const stats = {
	totalAnnouncements: history.length,
	uniqueTrains: new Set(history.map(a => a.headcode)).size,
	uniqueStations: new Set(history.map(a => a.stationName)).size,
};

console.log(stats);
// { totalAnnouncements: 42, uniqueTrains: 8, uniqueStations: 5 }
```

---

## How It Works: State Flow

### Initial State
```
Train outside zone → isInside: false, lastAnnouncementTime: null
```

### Train Enters Zone
```
Train crosses boundary into zone (distance ≤ 25 studs):
1. Check: Was outside → Now inside? ✓
2. Check: Moving toward station center? ✓
3. Check: No debounce active? ✓
4. Action: Announce "1A75 is entering Dovedale East"
5. Update: isInside: true, lastAnnouncementTime: NOW
```

### Train Stays in Zone (5+ minutes)
```
Train remains in zone:
- isInside: true (doesn't change)
- No re-announcement (idle rule prevents it)
```

### Train Exits Zone
```
Train crosses boundary out of zone:
- isInside: false
- lastAnnouncementTime remains set
```

### Train Re-Enters (5+ minutes later)
```
Train re-enters zone:
1. Check: Was outside → Now inside? ✓
2. Check: Moving toward station? ✓
3. Check: Debounce expired (>5 min)? ✓
4. Action: Announce again
```

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| **Train exiting zone** | isInside flips to false; no announcement |
| **Train briefly leaves & re-enters** | Only announces if >5 min since last announcement |
| **Train facing away from station** | Velocity check prevents announcement |
| **Multiple trains entering simultaneously** | Each processed independently with own state |
| **Physics jitter at boundary** | Enters/exits in single frame → debounce prevents duplicate trigger |
| **Train idle for hours** | Won't announce again; different train can use same headcode |
| **Server crashes** | State lost (session-only; rebuild on startup) |

---

## Performance Considerations

### Memory Usage

- **Per train/station**: ~200 bytes of state
- **Announcement history**: ~100 bytes per record
- **Auto-cleanup**: Runs every 10 minutes, removes >1-hour-old records

### CPU Usage

- **Per train**: 1 distance calculation + velocity dot product
- **Per station zone**: O(1) lookup + state update
- **Processing**: ~1ms for 50 trains across 17 stations

### Optimization Tips

1. **Zone radius is set to 25 studs** - adjust if needed for precision
2. **Increase debounce interval** if duplicates happen
3. **Filter out non-train players** before processing
4. **Use batch processing** with `processTrains()` instead of individual calls

---

## Testing & Debugging

### Run Demo

```typescript
import { runDetectionDemo } from "./trainDetectionIntegration";

runDetectionDemo();
```

**Output:**
```
🚂 Starting Train Detection System Demo...

✓ Train Detection System initialized with 17 stations

Processing mock trains...

✓ Announcements generated:
  - 1A75 is entering Dovedale East
  - 3E22 is entering Dovedale Central

Debug State:
{
  "stationZones": [...],
  "trainStates": [...],
  "recentAnnouncements": [...]
}

✓ Demo Complete!
```

### Check History

```typescript
const history = trainDetectionSystem.getAnnouncementHistory(10);
history.forEach(record => {
	const date = new Date(record.timestamp);
	console.log(`${date.toISOString()}: ${record.headcode} @ ${record.stationName}`);
});
```

---

## Troubleshooting

### Problem: No announcements occurring

**Checklist:**
- [ ] `initializeStationZones()` called on startup?
- [ ] Trains have `headcode` in trainData?
- [ ] Train position within 25 stud radius of station?
- [ ] Train moving toward center (velocity > 0 dot product)?
- [ ] Check console logs for processing details

### Problem: Duplicate announcements

**Solutions:**
- Ensure debounce is working (5 min interval)
- Check that train position isn't oscillating at boundary
- Verify velocity data is accurate

### Problem: Memory growing indefinitely

**Check:**
- Ensure cleanup interval is running (every 10 min)
- Verify announcement history isn't being externally stored
- Monitor `getDebugState()` train state count

---

## Integration Checklist

- [ ] Import `TrainDetectionSystem`
- [ ] Initialize station zones on server startup
- [ ] Process trains in position update handler
- [ ] Broadcast announcements via WebSocket
- [ ] Add debug endpoints (optional)
- [ ] Test with mock data
- [ ] Monitor logs for announcements
- [ ] Verify debounce behavior

---

## Future Enhancements

Possible improvements:
- Platform-specific detection (left vs. right platform)
- Speed-based filtering (ignore very slow trains)
- Custom event handlers (instead of console logging)
- Persistence (save state across restarts)
- Predictive announcements (pre-announce based on velocity)
- Multi-zone "approach" announcements

---

*Last Updated: 2026-05-06*
*Station data from: public/index.js AREA_MARKERS*

````
