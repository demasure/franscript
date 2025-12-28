const { initDatabase } = require('./database');

console.log('🔧 Exécution des migrations de base de données...\n');

try {
    initDatabase();
    console.log('\n✅ Migrations terminées avec succès!');
    process.exit(0);
} catch (error) {
    console.error('❌ Erreur lors des migrations:', error);
    process.exit(1);
}
