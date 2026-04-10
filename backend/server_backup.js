const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Root test
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend running" });
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

// Buildings GeoJSON
// - If geom_poly exists (polygon), we return that as geometry.
// - Otherwise we fall back to geom (point).
// - marker_geom is returned in properties.marker if present.
app.get("/api/buildings", async (req, res) => {
  try {
    const q = `
      SELECT jsonb_build_object(
        'type','FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'geometry',
              CASE
                WHEN geom_poly IS NOT NULL THEN ST_AsGeoJSON(geom_poly)::jsonb
                WHEN geom IS NOT NULL THEN ST_AsGeoJSON(geom)::jsonb
                ELSE NULL
              END,
            'properties', jsonb_build_object(
              'id', id,
              'name', name,
              'marker', CASE
                WHEN marker_geom IS NULL THEN NULL
                ELSE ST_AsGeoJSON(marker_geom)::jsonb
              END
            )
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM buildings;
    `;
    const result = await db.query(q);
    res.json(result.rows[0].geojson);
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// Rooms GeoJSON (Point) + building name
app.get("/api/rooms", async (req, res) => {
  try {
    const q = `
      SELECT jsonb_build_object(
        'type','FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type','Feature',
            'geometry', ST_AsGeoJSON(r.geom)::jsonb,
            'properties', jsonb_build_object(
              'id', r.id,
              'room_code', r.room_code,
              'building_id', r.building_id,
              'building_name', b.name
            )
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM rooms r
      LEFT JOIN buildings b ON b.id = r.building_id;
    `;
    const result = await db.query(q);
    res.json(result.rows[0].geojson);
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

/**
 * ROUTING (Option C)
 * Uses OSRM public server (walking).
 * Input: startLat,startLng,endLat,endLng
 * Output: GeoJSON Feature (LineString) + distance_m + duration_s
 */
app.get("/api/route", async (req, res) => {
  try {
    const startLat = Number(req.query.startLat);
    const startLng = Number(req.query.startLng);
    const endLat = Number(req.query.endLat);
    const endLng = Number(req.query.endLng);

    const bad =
      !Number.isFinite(startLat) ||
      !Number.isFinite(startLng) ||
      !Number.isFinite(endLat) ||
      !Number.isFinite(endLng);

    if (bad) {
      return res.status(400).json({
        status: "error",
        error: "Invalid or missing coordinates. Required: startLat,startLng,endLat,endLng",
      });
    }

    // OSRM expects lon,lat (NOT lat,lon)
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${startLng},${startLat};${endLng},${endLat}` +
      `?overview=full&geometries=geojson`;

    const r = await fetch(osrmUrl);
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({
        status: "error",
        error: `OSRM error: HTTP ${r.status} ${text.slice(0, 200)}`,
      });
    }

    const data = await r.json();

    if (!data?.routes?.length) {
      return res.status(404).json({ status: "error", error: "No route found" });
    }

    const best = data.routes[0];

    // Return a GeoJSON Feature
    res.json({
      type: "Feature",
      geometry: best.geometry, // LineString in GeoJSON coords [lng,lat]
      properties: {
        distance_m: best.distance,
        duration_s: best.duration,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);