import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDbService {
  readonly client: DynamoDBDocumentClient;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('DDB_ENDPOINT');
    const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';

    const raw = new DynamoDBClient({
      region,
      ...(endpoint
        ? {
            endpoint,
            credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
          }
        : {}),
    });

    this.client = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
}
