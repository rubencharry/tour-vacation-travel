const path = require('path');
const dynamoDbLocal = require('dynamodb-local');

const DB_PATH = path.resolve(__dirname, '../.dynamodb-data');

async function main() {
  console.log('Iniciando DynamoDB Local en :8000...');
  await dynamoDbLocal.launch(8000, DB_PATH, ['-sharedDb'], true);

  process.on('SIGINT', () => {
    dynamoDbLocal.stop(8000);
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    dynamoDbLocal.stop(8000);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Error al iniciar DynamoDB Local:', err.message);
  process.exit(1);
});
