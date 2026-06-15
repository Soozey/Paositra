import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseInterceptors
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../common/request-context";
import { requestMetadata } from "../common/request-context";
import { IdempotencyInterceptor } from "../platform/idempotency.interceptor";
import { RequirePermission } from "../platform/rbac";
import {
  AgencyQueryDto,
  CloseAgencyDto,
  CreateAgencyDto
} from "./operations.dto";
import { OperationsService } from "./operations.service";

@ApiTags("Opérations")
@ApiBearerAuth()
@Controller("api/v1/operations")
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get("agencies")
  @RequirePermission("operations:agencies:read")
  listAgencies(@Query() query: AgencyQueryDto) {
    return this.operations.listAgencies(query);
  }

  @Post("agencies")
  @RequirePermission("operations:agencies:write")
  @UseInterceptors(IdempotencyInterceptor)
  createAgency(
    @Body() dto: CreateAgencyDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.operations.createAgency(
      dto,
      request.user,
      requestMetadata(request)
    );
  }

  @Post("agencies/:id/close")
  @RequirePermission("operations:agencies:close")
  @UseInterceptors(IdempotencyInterceptor)
  closeAgency(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CloseAgencyDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.operations.closeAgency(
      id,
      dto,
      request.user,
      requestMetadata(request)
    );
  }
}
