import { Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseInterceptors } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNumberString, IsOptional, IsString, Length, Matches, MaxLength, Min, MinLength } from "class-validator";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import type { AuthenticatedRequest } from "../common/request-context";
import { requestMetadata } from "../common/request-context";
import { AuditService } from "../platform/audit.service";
import { RequirePermission } from "../platform/rbac";
import { IdempotencyInterceptor } from "../platform/idempotency.interceptor";

class CreateWalletDto {
  @IsString() @MinLength(2) @MaxLength(120) provider!: string;
  @IsString() @MinLength(2) @MaxLength(200) label!: string;
  @IsString() @MinLength(2) @MaxLength(80) walletNumber!: string;
  @IsOptional() @IsString() @Length(3, 3) @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsNumberString() openingBalance?: string;
}

class CreateWalletEntryDto {
  @IsString() operationDate!: string;
  @IsIn(["encaissement", "decaissement"]) direction!: string;
  @IsNumberString() amount!: string;
  @IsOptional() @IsString() @MaxLength(120) externalReference?: string;
  @IsString() @MinLength(2) @MaxLength(240) label!: string;
}

class WalletEntryStatusDto {
  @IsIn(["valide", "rejete"]) target!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

@ApiTags("Tresorerie - Portefeuilles electroniques")
@ApiBearerAuth()
@Controller("api/v1/treasury/wallets")
export class DigitalWalletsController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService) {}

  @Get()
  @RequirePermission("treasury:wallets:read")
  async list() {
    const items = await this.ds.query(`
      SELECT w.id, w.provider, w.label, w.wallet_number AS "walletNumber", w.currency, w.status, w.version,
        w.opening_balance + COALESCE(sum(CASE WHEN e.status='valide' AND e.direction='encaissement' THEN e.amount
          WHEN e.status='valide' AND e.direction='decaissement' THEN -e.amount ELSE 0 END),0) AS balance,
        count(e.id) FILTER (WHERE e.status='a_valider') AS "pendingCount"
      FROM treasury.digital_wallets w
      LEFT JOIN treasury.digital_wallet_entries e ON e.wallet_id=w.id
      WHERE w.status='active'
      GROUP BY w.id ORDER BY w.created_at DESC`);
    return { items };
  }

  @Post()
  @RequirePermission("treasury:wallets:manage")
  @UseInterceptors(IdempotencyInterceptor)
  async create(@Body() dto: CreateWalletDto, @Req() req: AuthenticatedRequest) {
    const id = randomUUID();
    await this.ds.transaction(async (m) => {
      await m.query(`INSERT INTO treasury.digital_wallets
        (id,provider,label,wallet_number,currency,opening_balance,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, dto.provider.trim(), dto.label.trim(), dto.walletNumber.trim(), dto.currency ?? "MGA", dto.openingBalance ?? "0", req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.wallet.created", objectType: "treasury.digital_wallet", objectId: id,
        afterState: { provider: dto.provider, walletNumber: dto.walletNumber }, ...requestMetadata(req) });
    });
    return { id, status: "active" };
  }

  @Get(":id/entries")
  @RequirePermission("treasury:wallets:read")
  async entries(@Param("id", ParseUUIDPipe) id: string) {
    return { items: await this.ds.query(`SELECT id, operation_date AS "operationDate", direction, amount,
      external_reference AS "externalReference", label, status, reconciled, version
      FROM treasury.digital_wallet_entries WHERE wallet_id=$1 ORDER BY operation_date DESC, created_at DESC`, [id]) };
  }

  @Post(":id/entries")
  @RequirePermission("treasury:wallets:manage")
  @UseInterceptors(IdempotencyInterceptor)
  async addEntry(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateWalletEntryDto, @Req() req: AuthenticatedRequest) {
    const entryId = randomUUID();
    await this.ds.transaction(async (m) => {
      const wallet = await m.query("SELECT 1 FROM treasury.digital_wallets WHERE id=$1 AND status='active'", [id]);
      if (!wallet.length) throw new NotFoundException("Portefeuille actif introuvable.");
      await m.query(`INSERT INTO treasury.digital_wallet_entries
        (id,wallet_id,operation_date,direction,amount,external_reference,label,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [entryId, id, dto.operationDate, dto.direction, dto.amount,
        dto.externalReference?.trim() || null, dto.label.trim(), req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.wallet.entry.created", objectType: "treasury.digital_wallet_entry", objectId: entryId,
        afterState: { walletId: id, direction: dto.direction, amount: dto.amount }, ...requestMetadata(req) });
    });
    return { id: entryId, status: "a_valider" };
  }

  @Post("entries/:entryId/status")
  @RequirePermission("treasury:wallets:manage")
  @UseInterceptors(IdempotencyInterceptor)
  async status(@Param("entryId", ParseUUIDPipe) id: string, @Body() dto: WalletEntryStatusDto, @Req() req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const rows = await m.query("SELECT status,version FROM treasury.digital_wallet_entries WHERE id=$1 FOR UPDATE", [id]);
      if (!rows.length) throw new NotFoundException("Mouvement introuvable.");
      if (rows[0].version !== dto.version) throw new ConflictException("Ce mouvement a ete modifie entre-temps.");
      if (rows[0].status !== "a_valider") throw new ConflictException("Ce mouvement a deja ete traite.");
      await m.query("UPDATE treasury.digital_wallet_entries SET status=$1,version=version+1 WHERE id=$2", [dto.target, id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: `treasury.wallet.entry.${dto.target}`, objectType: "treasury.digital_wallet_entry", objectId: id,
        beforeState: { status: rows[0].status }, afterState: { status: dto.target }, ...requestMetadata(req) });
      return { id, status: dto.target };
    });
  }
}
