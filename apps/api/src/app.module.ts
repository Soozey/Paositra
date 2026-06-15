import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { AuthGuard } from "./auth/auth.guard";
import { validateEnvironment } from "./config/environment";
import {
  Session,
  User,
  UserPermission,
  entities
} from "./database/entities";
import { HealthController } from "./health.controller";
import { OperationsModule } from "./operations/operations.module";
import { PermissionGuard } from "./platform/rbac";
import { PlatformModule } from "./platform/platform.module";
import { TreasuryModule } from "./treasury/treasury.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.getOrThrow<string>("DATABASE_URL"),
        entities,
        synchronize: false,
        logging: config.get<string>("NODE_ENV") === "development" ? ["error"] : false,
        ssl:
          config.get<string>("DATABASE_SSL") === "true"
            ? { rejectUnauthorized: true }
            : false
      })
    }),
    TypeOrmModule.forFeature([User, Session, UserPermission]),
    PlatformModule,
    AuthModule,
    TreasuryModule,
    OperationsModule
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard
    }
  ]
})
export class AppModule {}
