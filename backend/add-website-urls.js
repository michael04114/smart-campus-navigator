// add-website-urls.js
// Run: node add-website-urls.js
// Adds website_url column to buildings table and populates known URLs
// from the University of Salford website.

require('dotenv').config();
const db = require('./db');

async function run() {
    // 1. Add column (safe to re-run)
    await db.query(`ALTER TABLE buildings ADD COLUMN IF NOT EXISTS website_url TEXT`);
    console.log('✅ website_url column ready');

    // 2. Map building names to their official Salford website pages
    const urlMap = [
        ['Maxwell Building',                    'https://www.salford.ac.uk/conferencing/maxwell-building'],
        ['Peel Building',                        'https://www.salford.ac.uk/conferencing/peel-building'],
        ['Allerton Building',                    'https://www.salford.ac.uk/conferencing/allerton-building'],
        ['Mary Seacole Building',                'https://www.salford.ac.uk/conferencing/mary-seacole-building'],
        ['New Adelphi',                          'https://www.salford.ac.uk/conferencing/new-adelphi-chapman-building'],
        ['Chapman Building',                     'https://www.salford.ac.uk/conferencing/new-adelphi-chapman-building'],
        ['New Adelphi & Chapman Building',       'https://www.salford.ac.uk/conferencing/new-adelphi-chapman-building'],
        ['SEE Building',                         'https://www.salford.ac.uk/school-of-science-engineering-and-environment/see-building'],
        ['School of Science',                    'https://www.salford.ac.uk/school-of-science-engineering-and-environment/see-building'],
        ['Clifford Whitworth Library',           'https://www.salford.ac.uk/library'],
        ['Library',                              'https://www.salford.ac.uk/library'],
        ['MediaCity',                            'https://www.salford.ac.uk/mediacityuk'],
        ['MediaCityUK',                          'https://www.salford.ac.uk/mediacityuk'],
        ['Salford Students Union',               'https://www.salfordstudentsunion.com/'],
        ['Students Union',                       'https://www.salfordstudentsunion.com/'],
        ['Salford Museum and Art Gallery',       'https://www.salfordmuseum.org.uk/'],
        ['Brian Blatchford Building',            'https://www.salford.ac.uk/health-and-social-care'],
        ['Lowry 1',                              'https://www.salford.ac.uk/accommodation'],
        ['Lowry 2',                              'https://www.salford.ac.uk/accommodation'],
        ['Deleney 1',                            'https://www.salford.ac.uk/accommodation'],
        ['Deleney 2',                            'https://www.salford.ac.uk/accommodation'],
        ['Deleney 1 & 2',                        'https://www.salford.ac.uk/accommodation'],
    ];

    let updated = 0;
    for (const [name, url] of urlMap) {
        const result = await db.query(
            `UPDATE buildings SET website_url = $1 WHERE LOWER(name) = LOWER($2)`,
            [url, name]
        );
        if (result.rowCount > 0) {
            console.log(`  ✅ ${name}`);
            updated += result.rowCount;
        }
    }

    console.log(`\n✅ Updated ${updated} building(s) with website URLs`);

    // 3. Summary of what has URLs and what doesn't
    const withUrl = await db.query(`SELECT name FROM buildings WHERE website_url IS NOT NULL ORDER BY name`);
    const withoutUrl = await db.query(`SELECT name FROM buildings WHERE website_url IS NULL ORDER BY name`);

    console.log('\n📋 Buildings WITH website links:');
    withUrl.rows.forEach(r => console.log(`  ✅ ${r.name}`));

    console.log('\n📋 Buildings WITHOUT website links (will show no button):');
    withoutUrl.rows.forEach(r => console.log(`  — ${r.name}`));

    process.exit(0);
}

run().catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
});
