// ============================================================
// seed-missing-buildings.js
// Run: node seed-missing-buildings.js
// Adds rooms for buildings that have none, adds image_url column,
// and populates building images (free OpenStreetMap static maps).
// ============================================================

require('dotenv').config();
const db = require('./db');

async function seed() {
    // ── 1. Add image_url column (safe to re-run) ──────────────────
    await db.query(`ALTER TABLE buildings ADD COLUMN IF NOT EXISTS image_url TEXT`);
    console.log('✅ image_url column ready');

    // ── 2. Building image URLs (free OSM static maps - no API key) ─
    // Format: center on the building, zoom 18, 400×240
    const imageBase = 'https://staticmap.openstreetmap.de/staticmap.php?zoom=18&size=400x240&maptype=mapnik&center=';
    const images = [
        [1,  `${imageBase}53.48488,-2.27091`],
        [2,  `${imageBase}53.48589,-2.27394`],
        [37, `${imageBase}53.48471,-2.27126`],
        [38, `${imageBase}53.48518,-2.27183`],
        [39, `${imageBase}53.48506,-2.27122`],
        [40, `${imageBase}53.48514,-2.27323`],
        [41, `${imageBase}53.48634,-2.27269`],
        [52, `${imageBase}53.48844,-2.27852`],
        [53, `${imageBase}53.48729,-2.27739`],
        [54, `${imageBase}53.48746,-2.27793`],
        [55, `${imageBase}53.48880,-2.27356`],
        [61, `${imageBase}53.48687,-2.27297`],
        [62, `${imageBase}53.48681,-2.27397`],
        [63, `${imageBase}53.48743,-2.27477`],
        [64, `${imageBase}53.48739,-2.27305`],
        [65, `${imageBase}53.48827,-2.27452`],
        [66, `${imageBase}53.48897,-2.27342`],
        [67, `${imageBase}53.48951,-2.27352`],
        [68, `${imageBase}53.48895,-2.27453`],
        [69, `${imageBase}53.48924,-2.27493`],
        [70, `${imageBase}53.48928,-2.27428`],
        [71, `${imageBase}53.48931,-2.27190`],
        [72, `${imageBase}53.48961,-2.27143`],
        [73, `${imageBase}53.48926,-2.27131`],
        [74, `${imageBase}53.48963,-2.27036`],
        [75, `${imageBase}53.48934,-2.27037`],
    ];

    for (const [id, url] of images) {
        await db.query('UPDATE buildings SET image_url = $1 WHERE id = $2', [url, id]);
    }
    console.log('✅ Building images set');

    // ── 3. Room helper ─────────────────────────────────────────────
    // Inserts a room only if the room_code doesn't already exist in that building
    async function addRoom(building_id, room_code, capacity, lat, lng) {
        const exists = await db.query(
            'SELECT id FROM rooms WHERE building_id = $1 AND room_code = $2',
            [building_id, room_code]
        );
        if (exists.rows.length > 0) return;
        await db.query(
            `INSERT INTO rooms (building_id, room_code, capacity, current_occupants, occupancy_status, geom)
             VALUES ($1, $2, $3, 0, 'empty', ST_SetSRID(ST_MakePoint($4, $5), 4326))`,
            [building_id, room_code, capacity, lng, lat]
        );
    }

    // ── 4. Rooms ───────────────────────────────────────────────────
    // Coordinates: building centroid ± tiny offset so each room pin
    // appears as a distinct point on the map.

    // ── 38: Salford Museum and Art Gallery ────────────────────────
    const m = { lat: 53.48518, lng: -2.27182 };
    await addRoom(38, 'G.Reception',     80,  m.lat,            m.lng           );
    await addRoom(38, 'G.Gallery-A',    100,  m.lat + 0.00003,  m.lng + 0.00003 );
    await addRoom(38, 'G.Gallery-B',     80,  m.lat - 0.00003,  m.lng + 0.00003 );
    await addRoom(38, 'G.Cafe',          60,  m.lat,            m.lng - 0.00004 );
    await addRoom(38, 'G.Gift-Shop',     30,  m.lat + 0.00004,  m.lng - 0.00003 );
    await addRoom(38, '1.Gallery-C',     80,  m.lat - 0.00004,  m.lng - 0.00003 );
    await addRoom(38, '1.Education',     30,  m.lat + 0.00005,  m.lng           );
    await addRoom(38, '1.Conservation',  20,  m.lat - 0.00005,  m.lng           );
    console.log('✅ Salford Museum rooms done');

    // ── 39: Gilbert Room ──────────────────────────────────────────
    const g = { lat: 53.48506, lng: -2.27121 };
    await addRoom(39, 'G.Gilbert-Main',  50,  g.lat,            g.lng           );
    await addRoom(39, 'G.Breakout-1',    20,  g.lat + 0.00003,  g.lng + 0.00002 );
    await addRoom(39, 'G.Breakout-2',    20,  g.lat - 0.00003,  g.lng + 0.00002 );
    console.log('✅ Gilbert Room rooms done');

    // ── 52: Allerton Building (student accommodation) ─────────────
    const a = { lat: 53.48844, lng: -2.27852 };
    await addRoom(52, 'G.Reception',     20,  a.lat,            a.lng           );
    await addRoom(52, 'G.Common-Room',   45,  a.lat + 0.00003,  a.lng + 0.00003 );
    await addRoom(52, 'G.Laundry',       20,  a.lat - 0.00003,  a.lng + 0.00003 );
    await addRoom(52, 'G.Cycle-Store',   15,  a.lat,            a.lng + 0.00005 );
    await addRoom(52, '1.Study-Room',    25,  a.lat + 0.00004,  a.lng - 0.00003 );
    console.log('✅ Allerton Building rooms done');

    // ── 54: Brian Blatchford Building (Health & Social Care) ──────
    const bb = { lat: 53.48746, lng: -2.27792 };
    await addRoom(54, 'G.Reception',         30,  bb.lat,            bb.lng           );
    await addRoom(54, 'G.Clinical-Skills',   40,  bb.lat + 0.00003,  bb.lng + 0.00003 );
    await addRoom(54, 'G.Simulation-Suite',  35,  bb.lat - 0.00003,  bb.lng + 0.00003 );
    await addRoom(54, '1.Lecture-Theatre',  120,  bb.lat,            bb.lng - 0.00004  );
    await addRoom(54, '1.Seminar-1',         40,  bb.lat + 0.00004,  bb.lng + 0.00004 );
    await addRoom(54, '1.Seminar-2',         40,  bb.lat - 0.00004,  bb.lng + 0.00004 );
    await addRoom(54, '1.Staff-Offices',     30,  bb.lat + 0.00005,  bb.lng           );
    await addRoom(54, '2.Research-Lab',      30,  bb.lat - 0.00005,  bb.lng           );
    await addRoom(54, '2.IT-Suite',          40,  bb.lat,            bb.lng + 0.00006 );
    console.log('✅ Brian Blatchford rooms done');

    // ── 55: Salford Students Union ────────────────────────────────
    const su = { lat: 53.48880, lng: -2.27355 };
    await addRoom(55, 'G.The-Pint-Pot',    200,  su.lat,            su.lng           );
    await addRoom(55, 'G.Atrium-Cafe',      80,  su.lat + 0.00003,  su.lng + 0.00003 );
    await addRoom(55, 'G.Games-Room',       60,  su.lat - 0.00003,  su.lng + 0.00003 );
    await addRoom(55, 'G.Advice-Centre',    20,  su.lat,            su.lng - 0.00004  );
    await addRoom(55, 'G.Print-Post',       20,  su.lat + 0.00004,  su.lng - 0.00003 );
    await addRoom(55, 'G.Events-Space',    400,  su.lat - 0.00004,  su.lng - 0.00003 );
    await addRoom(55, '1.Meeting-Room-A',   30,  su.lat + 0.00005,  su.lng + 0.00003 );
    await addRoom(55, '1.Meeting-Room-B',   30,  su.lat - 0.00005,  su.lng + 0.00003 );
    await addRoom(55, '1.Society-Hub',      60,  su.lat,            su.lng + 0.00006 );
    await addRoom(55, '1.SU-Offices',       40,  su.lat + 0.00005,  su.lng - 0.00004 );
    console.log('✅ Students Union rooms done');

    // ── 65: School of Science ─────────────────────────────────────
    const sc = { lat: 53.48827, lng: -2.27451 };
    await addRoom(65, 'G.Reception',       25,  sc.lat,            sc.lng           );
    await addRoom(65, 'G.Physics-Lab',     40,  sc.lat + 0.00003,  sc.lng + 0.00003 );
    await addRoom(65, 'G.Chemistry-Lab',   40,  sc.lat - 0.00003,  sc.lng + 0.00003 );
    await addRoom(65, 'G.Biology-Lab',     40,  sc.lat,            sc.lng + 0.00005  );
    await addRoom(65, '1.Lecture-Theatre', 200, sc.lat + 0.00004,  sc.lng - 0.00003 );
    await addRoom(65, '1.CS-Lab-1',        50,  sc.lat - 0.00004,  sc.lng - 0.00003 );
    await addRoom(65, '1.CS-Lab-2',        50,  sc.lat,            sc.lng - 0.00005  );
    await addRoom(65, '2.Research-Lab',    30,  sc.lat + 0.00005,  sc.lng           );
    await addRoom(65, '2.PG-Suite',        25,  sc.lat - 0.00005,  sc.lng           );
    console.log('✅ School of Science rooms done');

    // ── 68: Daber Building ────────────────────────────────────────
    const db2 = { lat: 53.48895, lng: -2.27453 };
    await addRoom(68, 'G.Reception',       15,  db2.lat,            db2.lng           );
    await addRoom(68, 'G.Open-Office',     50,  db2.lat + 0.00003,  db2.lng + 0.00003 );
    await addRoom(68, '1.Meeting-Room-1',  20,  db2.lat - 0.00003,  db2.lng + 0.00003 );
    await addRoom(68, '1.Academic-Offices',30,  db2.lat + 0.00003,  db2.lng - 0.00003 );
    await addRoom(68, '2.Research-Suite',  25,  db2.lat - 0.00003,  db2.lng - 0.00003 );
    console.log('✅ Daber Building rooms done');

    // ── 69: Deleney 1 & 2 (student accommodation) ─────────────────
    const d = { lat: 53.48924, lng: -2.27492 };
    await addRoom(69, 'D1.Reception',      15,  d.lat,            d.lng           );
    await addRoom(69, 'D1.Common-Room',    35,  d.lat + 0.00003,  d.lng + 0.00003 );
    await addRoom(69, 'D1.Laundry',        15,  d.lat - 0.00003,  d.lng + 0.00003 );
    await addRoom(69, 'D2.Reception',      15,  d.lat + 0.00005,  d.lng - 0.00003 );
    await addRoom(69, 'D2.Common-Room',    35,  d.lat - 0.00005,  d.lng - 0.00003 );
    await addRoom(69, 'D1.Study-Room',     20,  d.lat,            d.lng + 0.00006  );
    console.log('✅ Deleney 1&2 rooms done');

    // ── 70: Unsworth Building ─────────────────────────────────────
    const u = { lat: 53.48928, lng: -2.27427 };
    await addRoom(70, 'G.Reception',       15,  u.lat,            u.lng           );
    await addRoom(70, 'G.Seminar-Room',    30,  u.lat + 0.00003,  u.lng + 0.00003 );
    await addRoom(70, '1.Research-Lab-A',  25,  u.lat - 0.00003,  u.lng + 0.00003 );
    await addRoom(70, '1.Research-Lab-B',  25,  u.lat + 0.00003,  u.lng - 0.00003 );
    await addRoom(70, '2.Academic-Offices',40,  u.lat - 0.00003,  u.lng - 0.00003 );
    console.log('✅ Unsworth Building rooms done');

    // ── 71: Lowry 1 (student accommodation) ──────────────────────
    const l1 = { lat: 53.48931, lng: -2.27190 };
    await addRoom(71, 'G.Reception',     20,  l1.lat,            l1.lng           );
    await addRoom(71, 'G.Common-Room',   50,  l1.lat + 0.00003,  l1.lng + 0.00003 );
    await addRoom(71, 'G.Laundry',       15,  l1.lat - 0.00003,  l1.lng + 0.00003 );
    await addRoom(71, 'G.Gym-Room',      30,  l1.lat,            l1.lng - 0.00004  );
    await addRoom(71, '1.Study-Lounge',  25,  l1.lat + 0.00004,  l1.lng - 0.00003 );
    console.log('✅ Lowry 1 rooms done');

    // ── 72: Lowry 2 (student accommodation) ──────────────────────
    const l2 = { lat: 53.48961, lng: -2.27143 };
    await addRoom(72, 'G.Reception',     20,  l2.lat,            l2.lng           );
    await addRoom(72, 'G.Common-Room',   50,  l2.lat + 0.00003,  l2.lng + 0.00003 );
    await addRoom(72, 'G.Laundry',       15,  l2.lat - 0.00003,  l2.lng + 0.00003 );
    await addRoom(72, '1.Study-Lounge',  25,  l2.lat + 0.00004,  l2.lng - 0.00003 );
    console.log('✅ Lowry 2 rooms done');

    // ── 73: Ranulf Building ───────────────────────────────────────
    const r = { lat: 53.48926, lng: -2.27131 };
    await addRoom(73, 'G.Reception',       15,  r.lat,            r.lng           );
    await addRoom(73, 'G.Office-Suite-A',  35,  r.lat + 0.00003,  r.lng + 0.00003 );
    await addRoom(73, '1.Conference-Room', 25,  r.lat - 0.00003,  r.lng + 0.00003 );
    await addRoom(73, '1.Office-Suite-B',  35,  r.lat,            r.lng - 0.00004  );
    console.log('✅ Ranulf Building rooms done');

    // ── 74: Pankhurst Building ────────────────────────────────────
    const p = { lat: 53.48963, lng: -2.27036 };
    await addRoom(74, 'G.Reception',       15,  p.lat,            p.lng           );
    await addRoom(74, 'G.Open-Office',     40,  p.lat + 0.00003,  p.lng + 0.00003 );
    await addRoom(74, '1.Seminar-Room',    30,  p.lat - 0.00003,  p.lng + 0.00003 );
    await addRoom(74, '1.Staff-Offices',   25,  p.lat + 0.00003,  p.lng - 0.00003 );
    console.log('✅ Pankhurst Building rooms done');

    // ── 75: Radclyffe Building ────────────────────────────────────
    const rad = { lat: 53.48934, lng: -2.27036 };
    await addRoom(75, 'G.Reception',       15,  rad.lat,            rad.lng           );
    await addRoom(75, 'G.Office-Suite',    40,  rad.lat + 0.00003,  rad.lng + 0.00003 );
    await addRoom(75, '1.Computer-Lab',    35,  rad.lat - 0.00003,  rad.lng + 0.00003 );
    await addRoom(75, '1.Meeting-Room',    20,  rad.lat,            rad.lng - 0.00004  );
    console.log('✅ Radclyffe Building rooms done');

    // ── 5. Summary ────────────────────────────────────────────────
    const total = await db.query('SELECT COUNT(*) FROM rooms');
    const byBuilding = await db.query(
        'SELECT b.name, COUNT(r.id) as rooms FROM buildings b LEFT JOIN rooms r ON r.building_id = b.id GROUP BY b.id, b.name ORDER BY b.id'
    );
    console.log('\n📊 FINAL ROOM COUNTS:');
    byBuilding.rows.forEach(row =>
        console.log(`  ${row.name}: ${row.rooms} rooms`)
    );
    console.log(`\n✅ Total rooms in database: ${total.rows[0].count}`);
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
