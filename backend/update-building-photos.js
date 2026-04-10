// update-building-photos.js
// Run: node update-building-photos.js
// Replaces OSM static map images with real building photos.
// All sources from Wikimedia Commons (CC-BY-SA) — cross-origin safe, no hotlink blocking.

require('dotenv').config();
const db = require('./db');

async function run() {
    // Ensure image_url column exists
    await db.query(`ALTER TABLE buildings ADD COLUMN IF NOT EXISTS image_url TEXT`);

    const photos = [
        [
            'Maxwell Building',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Maxwell_Building%2C_Salford_University.jpg/800px-Maxwell_Building%2C_Salford_University.jpg',
        ],
        [
            'Peel Building',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Peel_building_salford_university.jpg/800px-Peel_building_salford_university.jpg',
        ],
        [
            'Allerton Building',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Allerton_Building%2C_Broad_Street%2C_Salford_-_geograph.org.uk_-_7868271.jpg/800px-Allerton_Building%2C_Broad_Street%2C_Salford_-_geograph.org.uk_-_7868271.jpg',
        ],
        [
            'New Adelphi',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/University_of_Salford%2C_New_Adelphi_building_-_geograph.org.uk_-_4838745.jpg/800px-University_of_Salford%2C_New_Adelphi_building_-_geograph.org.uk_-_4838745.jpg',
        ],
        [
            'New Adelphi & Chapman Building',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/University_of_Salford%2C_New_Adelphi_building_-_geograph.org.uk_-_4838745.jpg/800px-University_of_Salford%2C_New_Adelphi_building_-_geograph.org.uk_-_4838745.jpg',
        ],
        [
            'SEE Building',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/SEE_Building%2C_University_of_Salford_-_geograph.org.uk_-_8084602.jpg/800px-SEE_Building%2C_University_of_Salford_-_geograph.org.uk_-_8084602.jpg',
        ],
        [
            'School of Science',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/SEE_Building%2C_University_of_Salford_-_geograph.org.uk_-_8084602.jpg/800px-SEE_Building%2C_University_of_Salford_-_geograph.org.uk_-_8084602.jpg',
        ],
        [
            'Clifford Whitworth Library',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/University_of_Salford%2C_interior_of_the_Clifford_Whitworth_Library_-_geograph.org.uk_-_4838773.jpg/800px-University_of_Salford%2C_interior_of_the_Clifford_Whitworth_Library_-_geograph.org.uk_-_4838773.jpg',
        ],
        [
            'Salford Museum and Art Gallery',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Salford_Museum_and_Art_Gallery_-_geograph.org.uk_-_1700855.jpg/800px-Salford_Museum_and_Art_Gallery_-_geograph.org.uk_-_1700855.jpg',
        ],
    ];

    let updated = 0;
    for (const [name, url] of photos) {
        const result = await db.query(
            `UPDATE buildings SET image_url = $1 WHERE LOWER(name) = LOWER($2)`,
            [url, name]
        );
        if (result.rowCount > 0) {
            console.log(`  ✅ ${name}`);
            updated += result.rowCount;
        } else {
            console.log(`  — "${name}" not found in DB (check exact building name)`);
        }
    }

    // Show what every building has now
    const all = await db.query(`SELECT name, image_url FROM buildings ORDER BY name`);
    console.log('\n📋 All buildings:');
    for (const row of all.rows) {
        console.log(`  ${row.image_url ? '🖼 ' : '  '} ${row.name}`);
    }

    console.log(`\n✅ Done — ${updated} building(s) updated with real photos`);
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
});
