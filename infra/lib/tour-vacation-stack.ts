import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';

export class TourVacationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── DynamoDB tables ──────────────────────────────────────────────────────

    const plansTable = new dynamodb.Table(this, 'PlansTable', {
      tableName: 'Plans',
      partitionKey: { name: 'planId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const leadsTable = new dynamodb.Table(this, 'LeadsTable', {
      tableName: 'Leads',
      partitionKey: { name: 'leadId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    leadsTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const providersTable = new dynamodb.Table(this, 'ProvidersTable', {
      tableName: 'Providers',
      partitionKey: { name: 'providerId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'Users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ── Cognito (usuarios del panel admin) ───────────────────────────────────

    const userPool = new cognito.UserPool(this, 'AdminUserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true, username: false },
      autoVerify: { email: true },
      accountRecovery: cognito.AccountRecovery.NONE,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      'AdminUserPoolClient',
      {
        userPool,
        authFlows: { userPassword: true },
        generateSecret: false,
      },
    );

    const roleGroups = ['admin', 'gerente', 'asesor'];
    for (const roleName of roleGroups) {
      new cognito.CfnUserPoolGroup(this, `${roleName}Group`, {
        userPoolId: userPool.userPoolId,
        groupName: roleName,
      });
    }

    // ── Media bucket (imágenes de planes) ────────────────────────────────────

    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── Lambda ───────────────────────────────────────────────────────────────

    const backendLambda = new lambda.Function(this, 'BackendLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'main.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../backend/dist-lambda'),
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
        DDB_TABLE_PLANS: plansTable.tableName,
        DDB_TABLE_LEADS: leadsTable.tableName,
        DDB_TABLE_PROVIDERS: providersTable.tableName,
        DDB_TABLE_USERS: usersTable.tableName,
        MEDIA_BUCKET_NAME: mediaBucket.bucketName,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        SES_FROM_ADDRESS: process.env.SES_FROM_ADDRESS ?? '',
        APP_URL: 'https://tourvacationtravel.com',
      },
    });

    plansTable.grantReadWriteData(backendLambda);
    leadsTable.grantReadWriteData(backendLambda);
    providersTable.grantReadWriteData(backendLambda);
    usersTable.grantReadWriteData(backendLambda);
    mediaBucket.grantReadWrite(backendLambda);

    backendLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminRemoveUserFromGroup',
          'cognito-idp:AdminUpdateUserAttributes',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminDisableUser',
          'cognito-idp:AdminEnableUser',
        ],
        resources: [userPool.userPoolArn],
      }),
    );

    backendLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      }),
    );

    // ── API Gateway HTTP API ──────────────────────────────────────────────────

    const api = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: 'tour-vacation-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    api.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration(
        'LambdaIntegration',
        backendLambda,
      ),
    });

    // ── S3 frontend bucket ────────────────────────────────────────────────────

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── CloudFront ────────────────────────────────────────────────────────────

    const oac = new cloudfront.S3OriginAccessControl(this, 'FrontendOAC');

    const apiOriginHostname = `${api.apiId}.execute-api.${this.region}.amazonaws.com`;

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'CustomDomainCert',
      'arn:aws:acm:us-east-1:507744946224:certificate/a23df631-6eb6-4228-aa73-4ce933c75b96',
    );

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      domainNames: ['tourvacationtravel.com', 'www.tourvacationtravel.com'],
      certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiOriginHostname, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      defaultRootObject: 'index.html',
    });

    // ── Outputs ───────────────────────────────────────────────────────────────

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'URL pública de la app',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url ?? '',
      description: 'URL directa del API Gateway (sólo para debug)',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Nombre del bucket S3 para el deploy del frontend',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'ID de la distribución CloudFront (para invalidaciones)',
    });

    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: mediaBucket.bucketName,
      description: 'Nombre del bucket S3 para imágenes de planes',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'ID del User Pool de Cognito (usuarios del panel admin)',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'ID del App Client de Cognito',
    });
  }
}
