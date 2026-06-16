import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuditEvent,
  IdempotencyKey,
  User
} from "../database/entities";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { PermissionGuard } from "./rbac";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditEvent,
      IdempotencyKey,
      User
    ])
  ],
  controllers: [UsersController, AuditController],
  providers: [
    AuditService,
    PermissionGuard,
    IdempotencyInterceptor,
    UsersService
  ],
  exports: [AuditService, PermissionGuard, IdempotencyInterceptor]
})
export class PlatformModule {}
