import { Body, Controller, Post, Req, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import type { AuthenticatedRequest } from "../common/request-context";
import { requestMetadata } from "../common/request-context";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { RequirePermission } from "./rbac";
import { CreateUserDto } from "./users.dto";
import { UsersService } from "./users.service";

@ApiTags("Utilisateurs")
@ApiBearerAuth()
@Controller("api/v1/platform/users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @RequirePermission("platform:users:manage")
  @UseInterceptors(IdempotencyInterceptor)
  create(
    @Body() dto: CreateUserDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.users.create(dto, request.user, requestMetadata(request));
  }
}
