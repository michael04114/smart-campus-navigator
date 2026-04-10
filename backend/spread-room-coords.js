// ============================================================
// spread-room-coords.js
// Repositions rooms within each building using a proper grid
// so each room is individually clickable at zoom 18.
//
// Grid spacing chosen so rooms are ~20m apart:
//   0.00020° lat  ≈  22 m  (one row / floor height)
//   0.00030° lng  ≈  20 m  (one column step)
// ============================================================

require('dotenv').config();
const db = require('./db');

// Grid helper: returns [lat, lng] for position [row, col]
// centred on the building centroid.
//   row 0 = ground floor (centre row)
//   row 1 = one floor up, row -1 = one floor down, etc.
//   col 0 = centre column, col ±1 = left/right wing
const R = 0.00020; // row step  (~22m)
const C = 0.00030; // col step  (~20m)
function pos(cLat, cLng, row, col) {
    return [cLat + row * R, cLng + col * C];
}

async function moveRoom(buildingId, roomCode, lat, lng) {
    await db.query(
        `UPDATE rooms
         SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326)
         WHERE building_id = $3 AND room_code = $4`,
        [lng, lat, buildingId, roomCode]
    );
}

async function run() {

    // ── 38: Salford Museum and Art Gallery ────────────────────────
    // centroid  53.48518, -2.27182
    const m = [53.48518, -2.27182];
    //  Ground floor   row -1 → lat - R
    await moveRoom(38, 'G.Reception',     ...pos(m[0], m[1], -1,  0));
    await moveRoom(38, 'G.Gallery-A',     ...pos(m[0], m[1], -1,  1));
    await moveRoom(38, 'G.Gallery-B',     ...pos(m[0], m[1], -1, -1));
    await moveRoom(38, 'G.Cafe',          ...pos(m[0], m[1], -1,  2));
    await moveRoom(38, 'G.Gift-Shop',     ...pos(m[0], m[1], -1, -2));
    //  First floor    row 0
    await moveRoom(38, '1.Gallery-C',     ...pos(m[0], m[1],  0,  0));
    await moveRoom(38, '1.Education',     ...pos(m[0], m[1],  0,  1));
    await moveRoom(38, '1.Conservation',  ...pos(m[0], m[1],  0, -1));
    console.log('✅ Salford Museum spread');

    // ── 39: Gilbert Room ──────────────────────────────────────────
    // centroid  53.48506, -2.27121
    const g = [53.48506, -2.27121];
    await moveRoom(39, 'G.Gilbert-Main',  ...pos(g[0], g[1],  0, -1));
    await moveRoom(39, 'G.Breakout-1',    ...pos(g[0], g[1],  0,  0));
    await moveRoom(39, 'G.Breakout-2',    ...pos(g[0], g[1],  0,  1));
    console.log('✅ Gilbert Room spread');

    // ── 52: Allerton Building (accommodation) ─────────────────────
    // centroid  53.48844, -2.27852
    const a = [53.48844, -2.27852];
    await moveRoom(52, 'G.Reception',     ...pos(a[0], a[1], -1,  0));
    await moveRoom(52, 'G.Common-Room',   ...pos(a[0], a[1], -1,  1));
    await moveRoom(52, 'G.Laundry',       ...pos(a[0], a[1], -1, -1));
    await moveRoom(52, 'G.Cycle-Store',   ...pos(a[0], a[1], -1,  2));
    await moveRoom(52, '1.Study-Room',    ...pos(a[0], a[1],  0,  0));
    console.log('✅ Allerton spread');

    // ── 54: Brian Blatchford Building ─────────────────────────────
    // centroid  53.48746, -2.27792
    const bb = [53.48746, -2.27792];
    await moveRoom(54, 'G.Reception',          ...pos(bb[0], bb[1], -1,  0));
    await moveRoom(54, 'G.Clinical-Skills',    ...pos(bb[0], bb[1], -1,  1));
    await moveRoom(54, 'G.Simulation-Suite',   ...pos(bb[0], bb[1], -1, -1));
    await moveRoom(54, '1.Lecture-Theatre',    ...pos(bb[0], bb[1],  0, -1));
    await moveRoom(54, '1.Seminar-1',          ...pos(bb[0], bb[1],  0,  0));
    await moveRoom(54, '1.Seminar-2',          ...pos(bb[0], bb[1],  0,  1));
    await moveRoom(54, '1.Staff-Offices',      ...pos(bb[0], bb[1],  0,  2));
    await moveRoom(54, '2.Research-Lab',       ...pos(bb[0], bb[1],  1, -1));
    await moveRoom(54, '2.IT-Suite',           ...pos(bb[0], bb[1],  1,  0));
    console.log('✅ Brian Blatchford spread');

    // ── 55: Salford Students Union ────────────────────────────────
    // centroid  53.48880, -2.27355
    const su = [53.48880, -2.27355];
    await moveRoom(55, 'G.The-Pint-Pot',    ...pos(su[0], su[1], -1, -1));
    await moveRoom(55, 'G.Atrium-Cafe',     ...pos(su[0], su[1], -1,  0));
    await moveRoom(55, 'G.Games-Room',      ...pos(su[0], su[1], -1,  1));
    await moveRoom(55, 'G.Advice-Centre',   ...pos(su[0], su[1], -1,  2));
    await moveRoom(55, 'G.Print-Post',      ...pos(su[0], su[1], -1, -2));
    await moveRoom(55, 'G.Events-Space',    ...pos(su[0], su[1], -1, -3));
    await moveRoom(55, '1.Meeting-Room-A',  ...pos(su[0], su[1],  0, -1));
    await moveRoom(55, '1.Meeting-Room-B',  ...pos(su[0], su[1],  0,  0));
    await moveRoom(55, '1.Society-Hub',     ...pos(su[0], su[1],  0,  1));
    await moveRoom(55, '1.SU-Offices',      ...pos(su[0], su[1],  0,  2));
    console.log('✅ Students Union spread');

    // ── 65: School of Science ─────────────────────────────────────
    // centroid  53.48827, -2.27451
    const sc = [53.48827, -2.27451];
    await moveRoom(65, 'G.Reception',        ...pos(sc[0], sc[1], -1,  0));
    await moveRoom(65, 'G.Physics-Lab',      ...pos(sc[0], sc[1], -1,  1));
    await moveRoom(65, 'G.Chemistry-Lab',    ...pos(sc[0], sc[1], -1, -1));
    await moveRoom(65, 'G.Biology-Lab',      ...pos(sc[0], sc[1], -1,  2));
    await moveRoom(65, '1.Lecture-Theatre',  ...pos(sc[0], sc[1],  0, -1));
    await moveRoom(65, '1.CS-Lab-1',         ...pos(sc[0], sc[1],  0,  0));
    await moveRoom(65, '1.CS-Lab-2',         ...pos(sc[0], sc[1],  0,  1));
    await moveRoom(65, '2.Research-Lab',     ...pos(sc[0], sc[1],  1, -1));
    await moveRoom(65, '2.PG-Suite',         ...pos(sc[0], sc[1],  1,  0));
    console.log('✅ School of Science spread');

    // ── 68: Daber Building ────────────────────────────────────────
    // centroid  53.48895, -2.27453
    const db2 = [53.48895, -2.27453];
    await moveRoom(68, 'G.Reception',        ...pos(db2[0], db2[1], -1,  0));
    await moveRoom(68, 'G.Open-Office',      ...pos(db2[0], db2[1], -1,  1));
    await moveRoom(68, '1.Meeting-Room-1',   ...pos(db2[0], db2[1],  0, -1));
    await moveRoom(68, '1.Academic-Offices', ...pos(db2[0], db2[1],  0,  0));
    await moveRoom(68, '2.Research-Suite',   ...pos(db2[0], db2[1],  1,  0));
    console.log('✅ Daber spread');

    // ── 69: Deleney 1 & 2 ─────────────────────────────────────────
    // centroid  53.48924, -2.27492
    const d = [53.48924, -2.27492];
    await moveRoom(69, 'D1.Reception',    ...pos(d[0], d[1], -1, -1));
    await moveRoom(69, 'D1.Common-Room',  ...pos(d[0], d[1], -1,  0));
    await moveRoom(69, 'D1.Laundry',      ...pos(d[0], d[1], -1,  1));
    await moveRoom(69, 'D2.Reception',    ...pos(d[0], d[1],  0, -1));
    await moveRoom(69, 'D2.Common-Room',  ...pos(d[0], d[1],  0,  0));
    await moveRoom(69, 'D1.Study-Room',   ...pos(d[0], d[1],  0,  1));
    console.log('✅ Deleney 1&2 spread');

    // ── 70: Unsworth Building ─────────────────────────────────────
    // centroid  53.48928, -2.27427
    const u = [53.48928, -2.27427];
    await moveRoom(70, 'G.Reception',        ...pos(u[0], u[1], -1,  0));
    await moveRoom(70, 'G.Seminar-Room',     ...pos(u[0], u[1], -1,  1));
    await moveRoom(70, '1.Research-Lab-A',   ...pos(u[0], u[1],  0, -1));
    await moveRoom(70, '1.Research-Lab-B',   ...pos(u[0], u[1],  0,  0));
    await moveRoom(70, '2.Academic-Offices', ...pos(u[0], u[1],  1,  0));
    console.log('✅ Unsworth spread');

    // ── 71: Lowry 1 ───────────────────────────────────────────────
    // centroid  53.48931, -2.27190
    const l1 = [53.48931, -2.27190];
    await moveRoom(71, 'G.Reception',    ...pos(l1[0], l1[1], -1,  0));
    await moveRoom(71, 'G.Common-Room',  ...pos(l1[0], l1[1], -1,  1));
    await moveRoom(71, 'G.Laundry',      ...pos(l1[0], l1[1], -1, -1));
    await moveRoom(71, 'G.Gym-Room',     ...pos(l1[0], l1[1],  0,  0));
    await moveRoom(71, '1.Study-Lounge', ...pos(l1[0], l1[1],  0,  1));
    console.log('✅ Lowry 1 spread');

    // ── 72: Lowry 2 ───────────────────────────────────────────────
    // centroid  53.48961, -2.27143
    const l2 = [53.48961, -2.27143];
    await moveRoom(72, 'G.Reception',    ...pos(l2[0], l2[1], -1,  0));
    await moveRoom(72, 'G.Common-Room',  ...pos(l2[0], l2[1], -1,  1));
    await moveRoom(72, 'G.Laundry',      ...pos(l2[0], l2[1], -1, -1));
    await moveRoom(72, '1.Study-Lounge', ...pos(l2[0], l2[1],  0,  0));
    console.log('✅ Lowry 2 spread');

    // ── 73: Ranulf Building ───────────────────────────────────────
    // centroid  53.48926, -2.27131
    const r = [53.48926, -2.27131];
    await moveRoom(73, 'G.Reception',       ...pos(r[0], r[1], -1,  0));
    await moveRoom(73, 'G.Office-Suite-A',  ...pos(r[0], r[1], -1,  1));
    await moveRoom(73, '1.Conference-Room', ...pos(r[0], r[1],  0, -1));
    await moveRoom(73, '1.Office-Suite-B',  ...pos(r[0], r[1],  0,  0));
    console.log('✅ Ranulf spread');

    // ── 74: Pankhurst Building ────────────────────────────────────
    // centroid  53.48963, -2.27036
    const p = [53.48963, -2.27036];
    await moveRoom(74, 'G.Reception',    ...pos(p[0], p[1], -1,  0));
    await moveRoom(74, 'G.Open-Office',  ...pos(p[0], p[1], -1,  1));
    await moveRoom(74, '1.Seminar-Room', ...pos(p[0], p[1],  0, -1));
    await moveRoom(74, '1.Staff-Offices',...pos(p[0], p[1],  0,  0));
    console.log('✅ Pankhurst spread');

    // ── 75: Radclyffe Building ────────────────────────────────────
    // centroid  53.48934, -2.27037
    const rad = [53.48934, -2.27037];
    await moveRoom(75, 'G.Reception',    ...pos(rad[0], rad[1], -1,  0));
    await moveRoom(75, 'G.Office-Suite', ...pos(rad[0], rad[1], -1,  1));
    await moveRoom(75, '1.Computer-Lab', ...pos(rad[0], rad[1],  0, -1));
    await moveRoom(75, '1.Meeting-Room', ...pos(rad[0], rad[1],  0,  0));
    console.log('✅ Radclyffe spread');

    // ── Verify final spread ───────────────────────────────────────
    const check = await db.query(`
        SELECT b.name,
               ROUND((MAX(ST_Y(r.geom)) - MIN(ST_Y(r.geom)))::numeric * 111000, 0) AS lat_m,
               ROUND((MAX(ST_X(r.geom)) - MIN(ST_X(r.geom)))::numeric * 66000, 0)  AS lng_m
        FROM buildings b
        JOIN rooms r ON r.building_id = b.id
        WHERE b.id IN (38,39,52,54,55,65,68,69,70,71,72,73,74,75)
        GROUP BY b.name ORDER BY b.name
    `);
    console.log('\n📐 Room spread after update:');
    check.rows.forEach(row =>
        console.log(`  ${row.name}: ${row.lat_m}m × ${row.lng_m}m`)
    );

    process.exit(0);
}

run().catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
});
