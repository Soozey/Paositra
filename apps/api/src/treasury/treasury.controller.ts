import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../common/request-context";
import { requestMetadata } from "../common/request-context";
import { PaginationDto } from "../common/pagination.dto";
import { IdempotencyInterceptor } from "../platform/idempotency.interceptor";
import { RequirePermission } from "../platform/rbac";
import {
  CreateInstitutionDto,
  CreatePlacementDto,
  PlacementActionDto,
  PlacementQueryDto,
  UpdateInstitutionDto,
  UpdatePlacementDto
} from "./treasury.dto";
import { TreasuryService } from "./treasury.service";

@ApiTags("Trésorerie")
@ApiBearerAuth()
@Controller("api/v1/treasury")
export class TreasuryController {
  constructor(private readonly treasury: TreasuryService) {}

  @Get("institutions")
  @RequirePermission("treasury:institutions:read")
  listInstitutions(@Query() query: PaginationDto) {
    return this.treasury.listInstitutions(
      query.page,
      query.pageSize,
      query.search
    );
  }

  @Post("institutions")
  @RequirePermission("treasury:institutions:write")
  @UseInterceptors(IdempotencyInterceptor)
  createInstitution(
    @Body() dto: CreateInstitutionDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.treasury.createInstitution(
      dto,
      request.user,
      requestMetadata(request)
    );
  }

  @Patch("institutions/:id")
  @RequirePermission("treasury:institutions:write")
  updateInstitution(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.treasury.updateInstitution(
      id,
      dto,
      request.user,
      requestMetadata(request)
    );
  }

  @Get("placements")
  @RequirePermission("treasury:placements:read")
  listPlacements(@Query() query: PlacementQueryDto) {
    return this.treasury.listPlacements(query);
  }

  @Post("placements")
  @RequirePermission("treasury:placements:write")
  @UseInterceptors(IdempotencyInterceptor)
  createPlacement(
    @Body() dto: CreatePlacementDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.treasury.createPlacement(
      dto,
      request.user,
      requestMetadata(request)
    );
  }

  @Patch("placements/:id")
  @RequirePermission("treasury:placements:write")
  updatePlacement(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlacementDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.treasury.updatePlacement(
      id,
      dto,
      request.user,
      requestMetadata(request)
    );
  }

  @Post("placements/:id/cancel")
  @RequirePermission("treasury:placements:cancel")
  @UseInterceptors(IdempotencyInterceptor)
  cancelPlacement(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PlacementActionDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.treasury.cancelPlacement(
      id,
      dto,
      request.user,
      requestMetadata(request)
    );
  }

  @Post("placements/:id/close")
  @RequirePermission("treasury:placements:close")
  @UseInterceptors(IdempotencyInterceptor)
  closePlacement(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PlacementActionDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.treasury.closePlacement(
      id,
      dto,
      request.user,
      requestMetadata(request)
    );
  }
}
