import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDbService } from '../dynamodb/dynamodb.service';
import { Lead } from './entities/lead.entity';

@Injectable()
export class LeadsRepository {
  private readonly table: string;

  constructor(
    private readonly db: DynamoDbService,
    config: ConfigService,
  ) {
    this.table = config.getOrThrow<string>('DDB_TABLE_LEADS');
  }

  async put(lead: Lead): Promise<void> {
    await this.db.client.send(
      new PutCommand({ TableName: this.table, Item: lead }),
    );
  }

  async findByEmail(email: string): Promise<Lead[]> {
    const result = await this.db.client.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
      }),
    );
    return (result.Items ?? []) as Lead[];
  }

  async findAll(): Promise<Lead[]> {
    const result = await this.db.client.send(
      new ScanCommand({ TableName: this.table }),
    );
    return (result.Items ?? []) as Lead[];
  }

  async findById(leadId: string): Promise<Lead | undefined> {
    const result = await this.db.client.send(
      new GetCommand({ TableName: this.table, Key: { leadId } }),
    );
    return result.Item as Lead | undefined;
  }

  async markEmailSent(leadId: string): Promise<void> {
    await this.db.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { leadId },
        UpdateExpression: 'SET emailSent = :val',
        ExpressionAttributeValues: { ':val': true },
      }),
    );
  }

  async update(
    leadId: string,
    updates: Partial<Omit<Lead, 'leadId' | 'createdAt'>>,
  ): Promise<Lead> {
    const entries = Object.entries(updates);
    const expression = entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
    const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

    const result = await this.db.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { leadId },
        UpdateExpression: `SET ${expression}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes as Lead;
  }

  async delete(leadId: string): Promise<void> {
    await this.db.client.send(
      new DeleteCommand({ TableName: this.table, Key: { leadId } }),
    );
  }
}
