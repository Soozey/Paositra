import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ProblemDetailsFilter } from "./common/problem-details.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const config = app.get(ConfigService);
  const origins = config
    .getOrThrow<string>("CORS_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.enableCors({
    origin: origins,
    credentials: false,
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
    methods: ["GET", "POST", "PATCH", "OPTIONS"]
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();

  if (config.get<string>("NODE_ENV") !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("PAOSITRA - API de gestion")
      .setDescription(
        "API versionnée des lots Trésorerie et Gestion des opérations"
      )
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      "api/docs",
      app,
      SwaggerModule.createDocument(app, swaggerConfig)
    );
  }

  await app.listen(config.getOrThrow<number>("PORT"), "0.0.0.0");
}

void bootstrap();
