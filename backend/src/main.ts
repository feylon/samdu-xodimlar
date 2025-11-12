import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.set('trust proxy', true);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: configService.getOrThrow<string[]>('corsOrigins'), credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: false, transformOptions: { enableImplicitConversion: false } }));
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Xodimlar HRMS API')
    .setDescription(
      'Employee Management System API. Web client endpoints are grouped by domain; the "Mobile App Operations" tag contains the endpoints dedicated to the mobile application, including session management.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth (Web)')
    .addTag('Mobile App Operations', 'Endpoints exclusively consumed by the mobile application')
    .addTag('Users (Superadmin)')
    .addTag('Employees (HR)')
    .addTag('Departments')
    .addTag('Attendance')
    .addTag('Tasks')
    .addTag('KPI')
    .addTag('Daily Reports')
    .addTag('Payroll')
    .addTag('Calendar')
    .addTag('Announcements')
    .addTag('Polls')
    .addTag('Notifications')
    .addTag('Organization')
    .addTag('Audit (Superadmin)')
    .addTag('Dashboard')
    .addTag('Export')
    .addTag('Health')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, { swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha', operationsSorter: 'alpha' } });

  const port = configService.getOrThrow<number>('port');
  await app.listen(port);
  logger.log(`Backend listening on port ${port}, Swagger at /api/docs`);
};

bootstrap();
