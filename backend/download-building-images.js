// download-building-images.js
// Run: node download-building-images.js
// Downloads real building photos to backend/public/images/buildings/
// then updates the database image_url to point to the local path.
// This avoids all cross-origin / hotlink-blocking issues.

require('dotenv').config();
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const OUTPUT_DIR = path.join(__dirname, 'public', 'images', 'buildings');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const lib = url.startsWith('https') ? https : http;

        const req = lib.get(url, {
            headers: {
                // Wikimedia requires a User-Agent
                'User-Agent': 'SmartCampusNavigator/1.0 (university project)'
            }
        }, (res) => {
            // Follow redirects (up to 5)
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                file.close();
                fs.unlinkSync(dest);
                return download(res.headers.location, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                file.close();
                fs.unlinkSync(dest);
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        });

        req.on('error', (err) => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            reject(err);
        });

        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error(`Timeout downloading ${url}`));
        });
    });
}

const buildings = [
    {
        name: 'Maxwell Building',
        filename: 'maxwell-building.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Maxwell_Building%2C_Salford_University.jpg/800px-Maxwell_Building%2C_Salford_University.jpg',
    },
    {
        name: 'Peel Building',
        filename: 'peel-building.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Peel_building_salford_university.jpg/800px-Peel_building_salford_university.jpg',
    },
    {
        name: 'Allerton Building',
        filename: 'allerton-building.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Allerton_Building%2C_Broad_Street%2C_Salford_-_geograph.org.uk_-_7868271.jpg/800px-Allerton_Building%2C_Broad_Street%2C_Salford_-_geograph.org.uk_-_7868271.jpg',
    },
    {
        name: 'New Adelphi',
        filename: 'new-adelphi.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/University_of_Salford%2C_New_Adelphi_building_-_geograph.org.uk_-_4838745.jpg/800px-University_of_Salford%2C_New_Adelphi_building_-_geograph.org.uk_-_4838745.jpg',
    },
    {
        name: 'New Adelphi & Chapman Building',
        filename: 'new-adelphi-chapman.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/University_of_Salford%2C_New_Adelphi_building_-_geograph.org.uk_-_4838745.jpg/800px-University_of_Salford%2C_New_Adelphi_building_-_geograph.org.uk_-_4838745.jpg',
    },
    {
        name: 'SEE Building',
        filename: 'see-building.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/SEE_Building%2C_University_of_Salford_-_geograph.org.uk_-_8084602.jpg/800px-SEE_Building%2C_University_of_Salford_-_geograph.org.uk_-_8084602.jpg',
    },
    {
        name: 'School of Science',
        filename: 'see-building.jpg', // reuse same file
        url: null, // already downloaded above
    },
    {
        name: 'Clifford Whitworth Library',
        filename: 'clifford-whitworth-library.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/University_of_Salford%2C_interior_of_the_Clifford_Whitworth_Library_-_geograph.org.uk_-_4838773.jpg/800px-University_of_Salford%2C_interior_of_the_Clifford_Whitworth_Library_-_geograph.org.uk_-_4838773.jpg',
    },
    {
        name: 'Salford Museum and Art Gallery',
        filename: 'salford-museum.jpg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Salford_Museum_and_Art_Gallery_-_geograph.org.uk_-_1700855.jpg/800px-Salford_Museum_and_Art_Gallery_-_geograph.org.uk_-_1700855.jpg',
    },
];

async function run() {
    await db.query(`ALTER TABLE buildings ADD COLUMN IF NOT EXISTS image_url TEXT`);

    for (const building of buildings) {
        const dest = path.join(OUTPUT_DIR, building.filename);
        const localUrl = `/images/buildings/${building.filename}`;

        // Download only if a URL is provided and file doesn't already exist
        if (building.url && !fs.existsSync(dest)) {
            process.stdout.write(`  Downloading ${building.name}... `);
            // Wait 2s between requests to avoid rate limiting
            await new Promise(r => setTimeout(r, 2000));
            try {
                await download(building.url, dest);
                console.log('✅');
            } catch (err) {
                console.log(`❌ ${err.message}`);
                continue;
            }
        } else if (!building.url) {
            // Reusing a file downloaded for another building name
            if (!fs.existsSync(dest)) {
                console.log(`  ⚠️  ${building.name} — shared file missing, skipping`);
                continue;
            }
        } else {
            console.log(`  ⏭  ${building.name} — already downloaded`);
        }

        // Update DB
        const result = await db.query(
            `UPDATE buildings SET image_url = $1 WHERE LOWER(name) = LOWER($2)`,
            [localUrl, building.name]
        );
        if (result.rowCount > 0) {
            console.log(`  💾 DB updated: ${building.name} → ${localUrl}`);
        } else {
            console.log(`  ⚠️  "${building.name}" not found in database (check exact name)`);
        }
    }

    console.log('\n✅ All done. Restart your backend server then clear localStorage and refresh the app.');
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
});
