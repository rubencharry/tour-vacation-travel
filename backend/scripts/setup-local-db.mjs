/**
 * Crea las tablas necesarias en DynamoDB Local (http://localhost:8000).
 * Requiere DynamoDB Local corriendo: java -jar DynamoDBLocal.jar -sharedDb
 * Si una tabla ya existe, la ignora.
 */
import { CreateTableCommand, DynamoDBClient, ResourceInUseException } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

const tables = [
  {
    TableName: 'Plans',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'planId', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'planId', KeyType: 'HASH' }],
  },
  {
    TableName: 'Leads',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'leadId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'leadId', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'Providers',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'providerId', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'providerId', KeyType: 'HASH' }],
  },
];

for (const def of tables) {
  try {
    await client.send(new CreateTableCommand(def));
    console.log(`✓ Tabla '${def.TableName}' creada`);
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`· Tabla '${def.TableName}' ya existe, ignorada`);
    } else {
      throw err;
    }
  }
}

console.log('\nSetup completo. DynamoDB Local listo para desarrollo.');
