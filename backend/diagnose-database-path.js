const path = require('path');

console.log('=== DIAGNOSTIC CHEMINS BASE DE DONNÉES ===\n');

// 1. Chemin utilisé par database.js
const dbPathFromDatabase = path.join(__dirname, 'franscript.db');
console.log('1. Chemin database.js utilise:');
console.log('   __dirname:', __dirname);
console.log('   Chemin complet:', dbPathFromDatabase);

// 2. Vérifier si le fichier existe
const fs = require('fs');
console.log('\n2. Fichiers .db existants:');

const checkFile = (filepath) => {
    try {
        const stats = fs.statSync(filepath);
        console.log(`   ✅ ${filepath} (${stats.size} bytes)`);
        return true;
    } catch (e) {
        console.log(`   ❌ ${filepath} (n'existe pas)`);
        return false;
    }
};

checkFile(dbPathFromDatabase);
checkFile(path.join(__dirname, '..', 'franscript.db'));
checkFile('franscript.db');
checkFile('./franscript.db');

// 3. Inspecter LA base que database.js utilise
console.log('\n3. Schéma de la base utilisée par database.js:');
const Database = require('better-sqlite3');
const db = new Database(dbPathFromDatabase);

const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='comments'`).get();
if (schema) {
    console.log(schema.sql);

    // Extraire les colonnes
    const cols = db.prepare('PRAGMA table_info(comments)').all();
    console.log('\n   Colonnes réelles:');
    cols.forEach(c => console.log(`   - ${c.name} (${c.type})`));
} else {
    console.log('   ❌ Table comments n\'existe pas!');
}

db.close();

console.log('\n=== FIN DIAGNOSTIC ===');
