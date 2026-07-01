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
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import type { AuthenticatedRequest } from "../common/request-context";
import { requestMetadata } from "../common/request-context";
import { IdempotencyInterceptor } from "../platform/idempotency.interceptor";
import { RequirePermission } from "../platform/rbac";
import {
  AgencyQueryDto,
  CloseAgencyDto,
  CreateAgencyDto,
  ValidateAgencyDto
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

  @Get("agencies/export")
  @RequirePermission("operations:agencies:export")
  async exportAgencies(@Res() res: Response) {
    const csv = await this.operations.exportAgencies();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="agences-paoma-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  }

  @Get("agencies/export.xlsx")
  @RequirePermission("operations:agencies:export")
  async exportAgenciesXlsx(@Res() res: Response) {
    const workbook = await this.operations.exportAgenciesXlsx();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="referentiel-agences-${new Date().toISOString().slice(0, 10)}.xlsx"`
    );
    res.end(workbook);
  }

  @Get("agencies/export.pdf")
  @RequirePermission("operations:agencies:export")
  async exportAgenciesPdf(@Res() res: Response) {
    const pdf = await this.operations.exportAgenciesPdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="referentiel-agences-${new Date().toISOString().slice(0, 10)}.pdf"`
    );
    res.end(pdf);
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

  @Post("agencies/import")
  @RequirePermission("operations:agencies:import")
  @UseInterceptors(FileInterceptor("file"))
  importAgencies(
    @UploadedFile() file: MulterFile,
    @Req() request: AuthenticatedRequest
  ) {
    return this.operations.importAgencies(file, request.user, requestMetadata(request));
  }

  @Patch("agencies/:id/validate")
  @RequirePermission("operations:agencies:validate")
  @UseInterceptors(IdempotencyInterceptor)
  validateAgency(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ValidateAgencyDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.operations.validateAgency(
      id,
      dto,
      request.user,
      requestMetadata(request)
    );
  }

  @Post("agencies/:id/close")
  @RequirePermission("operations:agencies:close", {
    type: "agency",
    routeParam: "id"
  })
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
