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
import { Plan } from './entities/plan.entity';

@Injectable()
export class PlansRepository {
  private readonly table: string;

  constructor(
    private readonly db: DynamoDbService,
    config: ConfigService,
  ) {
    this.table = config.getOrThrow<string>('DDB_TABLE_PLANS');
  }

  async put(plan: Plan): Promise<void> {
    await this.db.client.send(
      new PutCommand({ TableName: this.table, Item: plan }),
    );
  }

  async findById(planId: string): Promise<Plan | undefined> {
    const result = await this.db.client.send(
      new GetCommand({ TableName: this.table, Key: { planId } }),
    );
    return result.Item as Plan | undefined;
  }

  async findAll(): Promise<Plan[]> {
    const result = await this.db.client.send(
      new ScanCommand({ TableName: this.table }),
    );
    return (result.Items ?? []) as Plan[];
  }

  async update(
    planId: string,
    updates: Partial<Omit<Plan, 'planId' | 'createdAt'>>,
  ): Promise<Plan> {
    const entries = Object.entries(updates);
    const expression = entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
    const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

    const result = await this.db.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { planId },
        UpdateExpression: `SET ${expression}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes as Plan;
  }

  async delete(planId: string): Promise<void> {
    await this.db.client.send(
      new DeleteCommand({ TableName: this.table, Key: { planId } }),
    );
  }
}
