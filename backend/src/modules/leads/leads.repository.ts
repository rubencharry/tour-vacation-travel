import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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
}
