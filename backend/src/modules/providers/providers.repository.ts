import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDbService } from '../dynamodb/dynamodb.service';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProvidersRepository {
  private readonly table: string;

  constructor(
    private readonly db: DynamoDbService,
    config: ConfigService,
  ) {
    this.table = config.getOrThrow<string>('DDB_TABLE_PROVIDERS');
  }

  async put(provider: Provider): Promise<void> {
    await this.db.client.send(
      new PutCommand({ TableName: this.table, Item: provider }),
    );
  }

  async findById(providerId: string): Promise<Provider | undefined> {
    const result = await this.db.client.send(
      new GetCommand({ TableName: this.table, Key: { providerId } }),
    );
    return result.Item as Provider | undefined;
  }

  async findAll(): Promise<Provider[]> {
    const result = await this.db.client.send(
      new ScanCommand({ TableName: this.table }),
    );
    return (result.Items ?? []) as Provider[];
  }

  async update(
    providerId: string,
    updates: Partial<Omit<Provider, 'providerId' | 'registrationDate'>>,
  ): Promise<Provider> {
    const entries = Object.entries(updates);
    const expression = entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
    const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

    const result = await this.db.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { providerId },
        UpdateExpression: `SET ${expression}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes as Provider;
  }

  async delete(providerId: string): Promise<void> {
    await this.db.client.send(
      new DeleteCommand({ TableName: this.table, Key: { providerId } }),
    );
  }
}
