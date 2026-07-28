import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDbService } from '../dynamodb/dynamodb.service';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  private readonly table: string;

  constructor(
    private readonly db: DynamoDbService,
    config: ConfigService,
  ) {
    this.table = config.getOrThrow<string>('DDB_TABLE_USERS');
  }

  async put(user: User): Promise<void> {
    await this.db.client.send(
      new PutCommand({ TableName: this.table, Item: user }),
    );
  }

  async findById(userId: string): Promise<User | undefined> {
    const result = await this.db.client.send(
      new GetCommand({ TableName: this.table, Key: { userId } }),
    );
    return result.Item as User | undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.client.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
      }),
    );
    return result.Items?.[0] as User | undefined;
  }

  async findAll(): Promise<User[]> {
    const result = await this.db.client.send(
      new ScanCommand({ TableName: this.table }),
    );
    return (result.Items ?? []) as User[];
  }

  async update(
    userId: string,
    updates: Partial<Omit<User, 'userId' | 'createdAt'>>,
  ): Promise<User> {
    const entries = Object.entries(updates);
    const expression = entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const names = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
    const values = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

    const result = await this.db.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { userId },
        UpdateExpression: `SET ${expression}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes as User;
  }
}
