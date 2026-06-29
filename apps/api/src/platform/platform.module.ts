import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AuditEvent,
  IdempotencyKey,
  Permission,
  RbacRoleTemplate,
  User
} from "../database/entities";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { PermissionGuard } from "./rbac";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditEvent,
      IdempotencyKey,
      User,
      RbacRoleTemplate,
      Permission
    ])
  ],
  controllers: [UsersController, AuditController, RolesController],
  providers: [
    AuditService,
    PermissionGuard,
    IdempotencyInterceptor,
    UsersService,
    RolesService
  ],
  exports: [AuditService, PermissionGuard, IdempotencyInterceptor]
})
export class PlatformModule {}
