import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationDto, paginated } from "../common/pagination.dto";
import { AuditEvent } from "../database/entities";
import { RequirePermission } from "./rbac";

@ApiTags("Audit")
@ApiBearerAuth()
@Controller("api/v1/platform/audit-events")
export class AuditController {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly events: Repository<AuditEvent>
  ) {}

  @Get()
  @RequirePermission("platform:audit:read")
  async list(@Query() query: PaginationDto) {
    const builder = this.events
      .createQueryBuilder("event")
      .orderBy("event.occurredAt", "DESC")
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    if (query.search?.trim()) {
      builder.andWhere(
        "(event.action ILIKE :search OR event.objectType ILIKE :search)",
        { search: `%${query.search.trim()}%` }
      );
    }
    const [items, total] = await builder.getManyAndCount();
    return paginated(items, total, query.page, query.pageSize);
  }
}
