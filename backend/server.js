const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const compression = require("compression");
require("dotenv").config();

const db = require("./db");

// Import auth routes and middleware
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const { authenticateToken, authorizeRole } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

// NEW (allows localhost AND ngrok):
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps)
      if (!origin) return callback(null, true);
      
      // Allow localhost and ngrok
      if (origin.includes('localhost') || origin.includes('ngrok-free.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"]
  }
});

// ============================================================================
// MIDDLEWARE - ORDER MATTERS!
// ============================================================================
app.use(compression({ threshold: 0 })); // Enable compression for all responses
app.use(cors());
app.use(express.json());
app.use('/images', express.static(require('path').join(__dirname, 'public', 'images')));

// ============================================================================
// DATABASE MIDDLEWARE - Attach DB to Request
// ============================================================================
app.use((req, res, next) => {
  req.db = db;
  next();
});

// ============================================================================
// DATABASE MIGRATIONS — run once on startup
// ============================================================================
db.query(`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT NULL
`).catch(err => console.error('Migration error (user columns):', err));

db.query(`
  ALTER TABLE events
    ADD COLUMN IF NOT EXISTS created_by INTEGER
`).catch(err => console.error('Migration error (events.created_by):', err));

db.query(`
  CREATE TABLE IF NOT EXISTS saved_places (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id    VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(50)  NOT NULL DEFAULT 'building',
    building    VARCHAR(255),
    lat         DOUBLE PRECISION,
    lng         DOUBLE PRECISION,
    saved_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, place_id)
  )
`).catch(err => console.error('Migration error (saved_places):', err));

db.query(`
  CREATE TABLE IF NOT EXISTS timetable (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_name  VARCHAR(255) NOT NULL,
    day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    building_id  INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
    room_id      INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    location_note VARCHAR(255),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('Migration error (timetable):', err));

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================
app.use("/api/auth", authRoutes);

// ============================================================================
// ADMIN ROUTES
// ============================================================================
app.use("/api/admin", adminRoutes);

// ============================================================================
// WEBSOCKET CONNECTION HANDLING
// ============================================================================

let connectedClients = 0;

io.on('connection', (socket) => {
  connectedClients++;
  console.log(`✅ Client connected. Total clients: ${connectedClients}`);
  
  socket.emit('connection_success', {
    message: 'Connected to Smart Campus Navigator',
    timestamp: new Date().toISOString()
  });

  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`❌ Client disconnected. Total clients: ${connectedClients}`);
  });

  socket.on('subscribe_room', (roomId) => {
    socket.join(`room_${roomId}`);
    console.log(`📍 Client subscribed to room ${roomId}`);
  });

  socket.on('subscribe_building', (buildingId) => {
    socket.join(`building_${buildingId}`);
    console.log(`🏢 Client subscribed to building ${buildingId}`);
  });
});

// Helper functions for broadcasting
function broadcastEvent(eventType, data) {
  io.emit(eventType, data);
  console.log(`📡 Broadcasted ${eventType}`);
}

function broadcastToRoom(roomId, eventType, data) {
  io.to(`room_${roomId}`).emit(eventType, data);
}

function broadcastToBuilding(buildingId, eventType, data) {
  io.to(`building_${buildingId}`).emit(eventType, data);
}

// ============================================================================
// EXISTING ENDPOINTS (UNCHANGED)
// ============================================================================

// Root test
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Smart Campus Navigator Backend Running",
    websocket: "enabled",
    connectedClients: connectedClients,
    authentication: "enabled"
  });
});

// Env check
app.get("/env-check", (req, res) => {
  res.json({
    status: "ok",
    port: process.env.PORT || "5000",
    databaseUrlPresent: !!process.env.DATABASE_URL,
  });
});

// DB test
app.get("/db-test", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() AS now;");
    res.json({ status: "ok", now: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// Get buildings (GeoJSON)
app.get("/api/buildings", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        name,
        image_url,
        website_url,
        ST_AsGeoJSON(COALESCE(marker_geom, geom_poly, geom))::json AS geometry,
        ST_AsGeoJSON(geom_poly)::json AS polygon_geometry
      FROM buildings
      WHERE geom IS NOT NULL OR geom_poly IS NOT NULL
    `);

    const features = result.rows.map(row => ({
      type: "Feature",
      properties: {
        id: row.id,
        name: row.name,
        image_url: row.image_url,
        website_url: row.website_url,
      },
      geometry: row.geometry,
      polygon_geometry: row.polygon_geometry
    }));

    res.json({
      type: "FeatureCollection",
      features: features,
    });
  } catch (error) {
    console.error("Error fetching buildings:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FIXED: Get rooms (GeoJSON) - Explicitly extract coordinates
// ============================================================================
app.get("/api/rooms", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.id,
        r.room_code,
        r.building_id,
        r.occupancy_status,
        r.capacity,
        r.current_occupants,
        r.last_updated,
        b.name AS building_name,
        ST_X(r.geom) as longitude,
        ST_Y(r.geom) as latitude
      FROM rooms r
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE r.geom IS NOT NULL
    `);

    const features = result.rows.map(row => ({
      type: "Feature",
      properties: {
        id: row.id,
        room_code: row.room_code,
        building_id: row.building_id,
        building_name: row.building_name,
        occupancy_status: row.occupancy_status,
        capacity: row.capacity,
        current_occupants: row.current_occupants,
        last_updated: row.last_updated,
      },
      geometry: {
        type: "Point",
        coordinates: [row.longitude, row.latitude]  // Explicitly [lng, lat] for GeoJSON
      },
    }));

    console.log(`📍 Fetched ${features.length} rooms`);
    if (features.length > 0) {
      console.log(`   Sample room: ${features[0].properties.room_code} at [${features[0].geometry.coordinates}]`);
    }

    res.json({
      type: "FeatureCollection",
      features: features,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FIXED: Get single room by ID - Explicitly extract coordinates
// ============================================================================
app.get("/api/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        r.id,
        r.room_code,
        r.building_id,
        r.occupancy_status,
        r.capacity,
        r.current_occupants,
        r.last_updated,
        b.name AS building_name,
        ST_X(r.geom) as longitude,
        ST_Y(r.geom) as latitude
      FROM rooms r
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    const row = result.rows[0];
    
    res.json({
      type: "Feature",
      properties: {
        id: row.id,
        room_code: row.room_code,
        building_id: row.building_id,
        building_name: row.building_name,
        occupancy_status: row.occupancy_status,
        capacity: row.capacity,
        current_occupants: row.current_occupants,
        last_updated: row.last_updated,
      },
      geometry: {
        type: "Point",
        coordinates: [row.longitude, row.latitude]  // Explicitly [lng, lat]
      },
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ error: error.message });
  }
});

// Haversine straight-line distance in metres
function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Fetch one OSRM route, returns null on failure
async function osrmRoute(profile, sLng, sLat, eLng, eLat, extra = '') {
  try {
    const url = `http://router.project-osrm.org/route/v1/${profile}/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson&steps=true${extra}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    return data.routes[0];
  } catch { return null; }
}

// Routing endpoint — returns walking route (blue) + driving route (green)
app.get("/api/route", async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;
  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({ error: "Missing coordinates" });
  }

  const sLat = parseFloat(startLat), sLng = parseFloat(startLng);
  const eLat = parseFloat(endLat),   eLng = parseFloat(endLng);
  const straightLine = haversineMetres(sLat, sLng, eLat, eLng);

  try {
    const walkData = await osrmRoute('foot', sLng, sLat, eLng, eLat);
    if (!walkData) throw new Error("No route found");

    // OSRM public demo returns car-like speeds for foot profile — always
    // recalculate walking time at realistic 5 km/h (1.39 m/s) pedestrian speed.
    const walkDist = walkData.distance;
    const walkDur  = walkDist / 1.39; // seconds at 5 km/h

    const steps = walkData.legs[0].steps.map(step => ({
      instruction: step.maneuver.instruction || "Continue",
      distance_m: step.distance,
      duration_s: step.distance / 1.39,
      name: step.name || "",
    }));

    const result = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: walkData.geometry.coordinates },
      properties: { distance_m: walkDist, duration_s: walkDur, routeType: "walking", steps },
    };

    res.json(result);
  } catch (error) {
    console.error("Routing error:", error);
    const dist = straightLine;
    res.json({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[sLng, sLat], [eLng, eLat]] },
      properties: { distance_m: dist, duration_s: dist / 1.39, routeType: "walking", isFallback: true },
      isFallback: true,
    });
  }
});

// ============================================================================
// SAVED PLACES ENDPOINTS
// ============================================================================

// GET /api/saved-places — return all saved places for the authenticated user
app.get('/api/saved-places', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, place_id, name, type, building, lat, lng, saved_at
         FROM saved_places WHERE user_id = $1 ORDER BY saved_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/saved-places error:', err);
    res.status(500).json({ error: 'Failed to fetch saved places.' });
  }
});

// POST /api/saved-places — save a place for the authenticated user
app.post('/api/saved-places', authenticateToken, async (req, res) => {
  const { place_id, name, type, building, lat, lng } = req.body;
  if (!place_id || !name) return res.status(400).json({ error: 'place_id and name are required.' });
  try {
    const result = await db.query(
      `INSERT INTO saved_places (user_id, place_id, name, type, building, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, place_id) DO NOTHING
       RETURNING *`,
      [req.user.userId, place_id, name, type || 'building', building || null, lat || null, lng || null]
    );
    if (result.rows.length === 0) {
      // already exists — return existing row
      const existing = await db.query(
        'SELECT * FROM saved_places WHERE user_id=$1 AND place_id=$2',
        [req.user.userId, place_id]
      );
      return res.json(existing.rows[0]);
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/saved-places error:', err);
    res.status(500).json({ error: 'Failed to save place.' });
  }
});

// DELETE /api/saved-places/:placeId — remove by place_id (not row id)
app.delete('/api/saved-places/:placeId', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM saved_places WHERE user_id=$1 AND place_id=$2',
      [req.user.userId, req.params.placeId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/saved-places error:', err);
    res.status(500).json({ error: 'Failed to remove saved place.' });
  }
});

// ============================================================================
// TIMETABLE ENDPOINTS
// ============================================================================

// GET all timetable entries for logged-in user (with building/room info)
app.get('/api/timetable', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.id, t.module_name, t.day_of_week, t.start_time, t.end_time,
             t.building_id, t.room_id, t.location_note,
             b.name AS building_name,
             r.room_code,
             ST_X(ST_Centroid(COALESCE(b.marker_geom, b.geom_poly, b.geom))) AS building_lng,
             ST_Y(ST_Centroid(COALESCE(b.marker_geom, b.geom_poly, b.geom))) AS building_lat
      FROM timetable t
      LEFT JOIN buildings b ON b.id = t.building_id
      LEFT JOIN rooms r ON r.id = t.room_id
      WHERE t.user_id = $1
      ORDER BY t.day_of_week, t.start_time
    `, [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/timetable error:', err);
    res.status(500).json({ error: 'Failed to fetch timetable.' });
  }
});

// POST a new timetable entry
app.post('/api/timetable', authenticateToken, async (req, res) => {
  const { module_name, day_of_week, start_time, end_time, building_id, room_id, location_note } = req.body;
  if (!module_name || day_of_week == null || !start_time || !end_time) {
    return res.status(400).json({ error: 'module_name, day_of_week, start_time and end_time are required.' });
  }
  try {
    const result = await db.query(`
      INSERT INTO timetable (user_id, module_name, day_of_week, start_time, end_time, building_id, room_id, location_note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `, [req.user.userId, module_name, day_of_week, start_time, end_time,
        building_id || null, room_id || null, location_note || null]);
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('POST /api/timetable error:', err);
    res.status(500).json({ error: 'Failed to add timetable entry.' });
  }
});

// DELETE a timetable entry (only owner can delete)
app.delete('/api/timetable/:id', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM timetable WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/timetable error:', err);
    res.status(500).json({ error: 'Failed to delete timetable entry.' });
  }
});

// ============================================================================
// EVENT ENDPOINTS (PUBLIC)
// ============================================================================

// Get active events
app.get("/api/events", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.building_id,
        e.room_id,
        e.start_time,
        e.end_time,
        e.event_type,
        e.visibility,
        e.is_active,
        e.created_at,
        e.created_by,
        b.name AS building_name,
        r.room_code
      FROM events e
      LEFT JOIN buildings b ON e.building_id = b.id
      LEFT JOIN rooms r ON e.room_id = r.id
      WHERE e.is_active = true
        AND e.end_time > NOW()
      ORDER BY e.start_time ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PROTECTED ENDPOINTS - REQUIRE AUTHENTICATION
// ============================================================================

// Create event - STAFF/ADMIN ONLY
app.post("/api/events", authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  try {
    const { title, description, building_id, room_id, start_time, end_time, event_type, visibility } = req.body;

    if (!title || !building_id || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await db.query(
      `INSERT INTO events (title, description, building_id, room_id, start_time, end_time, event_type, visibility, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
       RETURNING *`,
      [title, description, building_id, room_id || null, start_time, end_time, event_type || 'general', visibility || 'public', req.user.userId]
    );

    const newEvent = result.rows[0];

    // Broadcast new event via WebSocket
    broadcastEvent('new_event', newEvent);

    // If event has a building, notify building subscribers
    if (building_id) {
      broadcastToBuilding(building_id, 'building_event', newEvent);
    }

    res.status(201).json(newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel event - STAFF/ADMIN ONLY
app.patch("/api/events/:id/cancel", authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE events 
       SET is_active = false 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const cancelledEvent = result.rows[0];

    // Broadcast event cancellation
    broadcastEvent('event_cancelled', { eventId: id });

    res.json(cancelledEvent);
  } catch (error) {
    console.error("Error cancelling event:", error);
    res.status(500).json({ error: error.message });
  }
});

// Edit event - creator or admin only
app.patch("/api/events/:id", authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, building_id, room_id, start_time, end_time, visibility } = req.body;

    // Fetch existing event to check ownership
    const existing = await db.query('SELECT created_by FROM events WHERE id = $1 AND is_active = true', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Event not found" });

    const isOwner = existing.rows[0].created_by === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "You can only edit your own events" });

    const result = await db.query(
      `UPDATE events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           building_id = COALESCE($3, building_id),
           room_id = $4,
           start_time = COALESCE($5, start_time),
           end_time = COALESCE($6, end_time),
           visibility = COALESCE($7, visibility)
       WHERE id = $8
       RETURNING *`,
      [title, description, building_id, room_id || null, start_time, end_time, visibility, id]
    );

    broadcastEvent('event_updated', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error editing event:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete event permanently - creator or admin only
app.delete("/api/events/:id", authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT created_by FROM events WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Event not found" });

    const isOwner = existing.rows[0].created_by === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "You can only delete your own events" });

    await db.query('DELETE FROM events WHERE id = $1', [id]);
    broadcastEvent('event_deleted', { eventId: parseInt(id) });
    res.json({ message: "Event deleted" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update room occupancy - STAFF/ADMIN ONLY
app.patch("/api/rooms/:id/occupancy", authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { current_occupants, occupancy_status: provided_status } = req.body;

    if (current_occupants === undefined || current_occupants < 0) {
      return res.status(400).json({ error: "Invalid occupancy value" });
    }

    const roomResult = await db.query(
      `SELECT capacity FROM rooms WHERE id = $1`,
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    const capacity = roomResult.rows[0].capacity;
    const occupancy_percentage = capacity > 0 ? (current_occupants / capacity) * 100 : 0;

    const validStatuses = ['empty', 'available', 'busy', 'occupied', 'full'];

    let occupancy_status;
    if (validStatuses.includes(provided_status)) {
      // Staff explicitly chose a status — always honour it
      occupancy_status = provided_status;
    } else if (capacity > 0) {
      // No explicit status sent — auto-compute from capacity
      if (occupancy_percentage === 0) occupancy_status = 'empty';
      else if (occupancy_percentage < 70) occupancy_status = 'available';
      else if (occupancy_percentage < 95) occupancy_status = 'busy';
      else occupancy_status = 'full';
    } else {
      occupancy_status = current_occupants > 0 ? 'occupied' : 'empty';
    }

    const result = await db.query(
      `UPDATE rooms 
       SET current_occupants = $1, 
           occupancy_status = $2,
           last_updated = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [current_occupants, occupancy_status, id]
    );

    const updatedRoom = result.rows[0];

    await db.query(
      `INSERT INTO room_occupancy_history (room_id, occupant_count, occupancy_percentage)
       VALUES ($1, $2, $3)`,
      [id, current_occupants, occupancy_percentage]
    );

    // Broadcast occupancy update
    broadcastEvent('occupancy_update', updatedRoom);
    broadcastToRoom(id, 'room_occupancy_change', updatedRoom);

    res.json(updatedRoom);
  } catch (error) {
    console.error("Error updating occupancy:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get room occupancy history - AUTHENTICATED USERS
app.get("/api/rooms/:id/occupancy-history", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { hours = 24 } = req.query;

    const result = await db.query(
      `SELECT 
        timestamp,
        occupant_count,
        occupancy_percentage
       FROM room_occupancy_history
       WHERE room_id = $1
         AND timestamp > NOW() - INTERVAL '${parseInt(hours)} hours'
       ORDER BY timestamp DESC
       LIMIT 100`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching occupancy history:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`🔐 Authentication enabled`);
});