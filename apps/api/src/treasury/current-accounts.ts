import {
  Body, ConflictException, Controller, Get, NotFoundException,
  Param, ParseUUIDPipe, Post, Query, Req, Res
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNumberString, IsOptional, IsString, Length, Matches, MaxLength, Min, MinLength } from "class-validator";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import { RequirePermission } from "../platform/rbac";
import { requestMetadata } from "../common/request-context";
import type { AuthenticatedRequest } from "../common/request-context";
import { AuditService } from "../platform/audit.service";
import { buildXlsx, buildPdf } from "../common/exporters";

export class CreateAccountDto {
  @IsString() @MinLength(2) @MaxLength(200) label!: string;
  @IsString() @MinLength(2) @MaxLength(160) bank!: string;
  @IsString() @MinLength(2) @MaxLength(60) accountNumber!: string;
  @IsOptional() @IsString() @Length(3,3) @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsNumberString() openingBalance?: string;
}
export class CreateEntryDto {
  @IsString() entryDate!: string;
  @IsIn(["encaissement","decaissement"]) direction!: "encaissement"|"decaissement";
  @IsNumberString() amount!: string;
  @IsOptional() @IsString() @MaxLength(80) pieceReference?: string;
  @IsString() @MinLength(2) @MaxLength(240) label!: string;
}
export class CreateChequeDto {
  @IsString() accountId!: string;
  @IsString() @MinLength(1) @MaxLength(40) chequeNumber!: string;
  @IsString() @MinLength(2) @MaxLength(240) beneficiary!: string;
  @IsNumberString() amount!: string;
  @IsString() issueDate!: string;
}
export class ChequeStatusDto {
  @IsIn(["en_circulation","encaisse","annule","expire"]) target!: string;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

@ApiTags("Trésorerie — Comptes courants")
@ApiBearerAuth()
@Controller("api/v1/treasury")
export class CurrentAccountsController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService) {}

  @Get("accounts")
  @RequirePermission("treasury:accounts:read")
  async list() {
    const rows = await this.ds.query(
      `SELECT a.id, a.label, a.bank, a.account_number AS "accountNumber", a.currency,
              a.opening_balance AS "openingBalance", a.status, a.version,
              a.opening_balance
              + COALESCE((SELECT sum(CASE WHEN direction='encaissement' THEN amount ELSE -amount END)
                          FROM treasury.account_entries e WHERE e.account_id=a.id),0) AS "balance"
       FROM treasury.current_accounts a ORDER BY a.created_at DESC`);
    return { items: rows };
  }

  @Post("accounts")
  @RequirePermission("treasury:accounts:manage")
  async create(@Body() dto: CreateAccountDto, @Req() req: AuthenticatedRequest) {
    const id = randomUUID();
    await this.ds.transaction(async (m) => {
      await m.query(
        `INSERT INTO treasury.current_accounts(id,label,bank,account_number,currency,opening_balance,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, dto.label.trim(), dto.bank.trim(), dto.accountNumber.trim(),
         (dto.currency ?? "MGA").toUpperCase(), dto.openingBalance ?? "0", req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.account.created", objectType: "treasury.current_account", objectId: id,
        afterState: { label: dto.label }, ...requestMetadata(req) });
    });
    return { id, status: "active" };
  }

  @Get("accounts/:id/entries")
  @RequirePermission("treasury:accounts:read")
  async entries(@Param("id", ParseUUIDPipe) id: string) {
    return this.ds.query(
      `SELECT id, entry_date AS "entryDate", direction, amount, piece_reference AS "pieceReference",
              label, reconciled FROM treasury.account_entries WHERE account_id=$1 ORDER BY entry_date DESC, created_at DESC`, [id]);
  }

  @Post("accounts/:id/entries")
  @RequirePermission("treasury:accounts:manage")
  async addEntry(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateEntryDto, @Req() req: AuthenticatedRequest) {
    const eid = randomUUID();
    await this.ds.transaction(async (m) => {
      const acc = await m.query("SELECT 1 FROM treasury.current_accounts WHERE id=$1 AND status='active'", [id]);
      if (!acc.length) throw new NotFoundException("Compte courant actif introuvable.");
      await m.query(
        `INSERT INTO treasury.account_entries(id,account_id,entry_date,direction,amount,piece_reference,label,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [eid, id, dto.entryDate, dto.direction, dto.amount, dto.pieceReference ?? null, dto.label.trim(), req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.account.entry.created", objectType: "treasury.account_entry", objectId: eid,
        afterState: { accountId: id, direction: dto.direction, amount: dto.amount }, ...requestMetadata(req) });
    });
    return { id: eid };
  }

  @Post("accounts/entries/:entryId/reconcile")
  @RequirePermission("treasury:accounts:manage")
  async reconcile(@Param("entryId", ParseUUIDPipe) entryId: string, @Req() req: AuthenticatedRequest) {
    const r = await this.ds.query(
      "UPDATE treasury.account_entries SET reconciled=true, reconciled_at=now() WHERE id=$1 AND reconciled=false RETURNING id", [entryId]);
    if (!r.length) throw new ConflictException("Écriture introuvable ou déjà rapprochée.");
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.account.entry.reconciled", objectType: "treasury.account_entry", objectId: entryId, ...requestMetadata(req) });
    return { id: entryId, reconciled: true };
  }

  @Get("accounts/:id/reconciliation")
  @RequirePermission("treasury:accounts:read")
  async reconciliation(@Param("id", ParseUUIDPipe) id: string) {
    const rows = await this.ds.query(
      `SELECT count(*) FILTER (WHERE reconciled) AS rapprochees,
              count(*) FILTER (WHERE NOT reconciled) AS ecarts, count(*) AS total
       FROM treasury.account_entries WHERE account_id=$1`, [id]);
    return rows[0];
  }

  @Get("cheques")
  @RequirePermission("treasury:accounts:read")
  async cheques() {
    return this.ds.query(
      `SELECT c.id, c.cheque_number AS "chequeNumber", c.beneficiary, c.amount, c.status,
              c.issue_date AS "issueDate", c.version, a.label AS "accountLabel"
       FROM treasury.cheques c JOIN treasury.current_accounts a ON a.id=c.account_id ORDER BY c.created_at DESC`);
  }

  @Post("cheques")
  @RequirePermission("treasury:accounts:manage")
  async createCheque(@Body() dto: CreateChequeDto, @Req() req: AuthenticatedRequest) {
    const id = randomUUID();
    await this.ds.transaction(async (m) => {
      const acc = await m.query("SELECT 1 FROM treasury.current_accounts WHERE id=$1", [dto.accountId]);
      if (!acc.length) throw new NotFoundException("Compte introuvable.");
      await m.query(
        `INSERT INTO treasury.cheques(id,account_id,cheque_number,beneficiary,amount,issue_date,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, dto.accountId, dto.chequeNumber.trim(), dto.beneficiary.trim(), dto.amount, dto.issueDate, req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.cheque.created", objectType: "treasury.cheque", objectId: id,
        afterState: { number: dto.chequeNumber, status: "emis" }, ...requestMetadata(req) });
    });
    return { id, status: "emis" };
  }

  @Post("cheques/:id/status")
  @RequirePermission("treasury:accounts:manage")
  async chequeStatus(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ChequeStatusDto, @Req() req: AuthenticatedRequest) {
    const allowed: Record<string,string[]> = {
      emis: ["en_circulation","annule"],
      en_circulation: ["encaisse","annule","expire"],
    };
    return this.ds.transaction(async (m) => {
      const rows = await m.query("SELECT status, version FROM treasury.cheques WHERE id=$1 FOR UPDATE", [id]);
      if (!rows.length) throw new NotFoundException("Chèque introuvable.");
      if (rows[0].version !== dto.version) throw new ConflictException("Ce chèque a été modifié entre-temps.");
      if (!(allowed[rows[0].status] || []).includes(dto.target))
        throw new ConflictException(`Transition impossible depuis « ${rows[0].status} ».`);
      if (dto.target === "annule" && !dto.reason?.trim())
        throw new ConflictException("Le motif est obligatoire pour annuler un chèque.");
      await m.query("UPDATE treasury.cheques SET status=$1, cancel_reason=$2, version=version+1, updated_at=now() WHERE id=$3",
        [dto.target, dto.target === "annule" ? dto.reason!.trim() : null, id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: `treasury.cheque.${dto.target}`, objectType: "treasury.cheque", objectId: id,
        beforeState: { status: rows[0].status }, afterState: { status: dto.target }, ...requestMetadata(req) });
      return { id, status: dto.target };
    });
  }

  @Get("account-journal.xlsx")
  @RequirePermission("treasury:accounts:read")
  async journalXlsx(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const rows = await this.ds.query(
      `SELECT a.label AS account, e.entry_date AS d, e.direction, e.amount, e.piece_reference AS piece, e.label,
              CASE WHEN e.reconciled THEN 'oui' ELSE 'non' END AS reconciled
       FROM treasury.account_entries e JOIN treasury.current_accounts a ON a.id=e.account_id
       ORDER BY e.entry_date DESC`);
    const buf = await buildXlsx("Journal comptes", [
      { header: "Compte", key: "account", width: 24 }, { header: "Date", key: "d", width: 13 },
      { header: "Sens", key: "direction", width: 14 }, { header: "Montant", key: "amount", width: 16 },
      { header: "Pièce", key: "piece", width: 16 }, { header: "Libellé", key: "label", width: 30 },
      { header: "Rapproché", key: "reconciled", width: 11 }
    ], rows, "[DÉMONSTRATION] Journal des comptes courants — NON CONTRACTUEL");
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.accounts.export.xlsx", objectType: "treasury.account_entry", metadata: { count: rows.length }, ...requestMetadata(req) });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="journal-comptes-DEMO.xlsx"');
    res.end(buf);
  }

  @Get("account-journal.pdf")
  @RequirePermission("treasury:accounts:read")
  async journalPdf(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const rows = await this.ds.query(
      `SELECT a.label AS account, e.entry_date AS d, e.direction, e.amount, e.piece_reference AS piece, e.label,
              CASE WHEN e.reconciled THEN 'Oui' ELSE 'Non' END AS reconciled
       FROM treasury.account_entries e JOIN treasury.current_accounts a ON a.id=e.account_id
       ORDER BY e.entry_date DESC`
    );
    const lines = rows.map((row: Record<string, unknown>) => [
      String(row.account ?? ""),
      String(row.d ?? ""),
      String(row.direction ?? ""),
      Number(row.amount ?? 0).toLocaleString("fr-FR"),
      String(row.piece ?? ""),
      String(row.reconciled ?? "")
    ]);
    const buf = await buildPdf(
      "Journal des comptes courants",
      "[DÉMONSTRATION] PAOSITRA — données non contractuelles — format A4",
      lines,
      ["Compte", "Date", "Sens", "Montant", "Pièce", "Rapproché"]
    );
    await this.audit.record(this.ds.manager, {
      actorUserId: req.user!.id,
      sessionId: req.user!.sessionId,
      action: "treasury.accounts.export.pdf",
      objectType: "treasury.account_entry",
      metadata: { count: rows.length },
      ...requestMetadata(req)
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="journal-comptes-DEMO.pdf"');
    res.end(buf);
  }

  @Get("cheques-register.pdf")
  @RequirePermission("treasury:accounts:read")
  async chequesPdf(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const rows = await this.ds.query(
      `SELECT cheque_number AS n, beneficiary AS b, amount, status FROM treasury.cheques ORDER BY created_at DESC`);
    const lines = rows.map((r: { n: string; b: string; amount: string; status: string }) =>
      [r.n, r.b, Number(r.amount).toLocaleString("fr-FR"), r.status]);
    const buf = await buildPdf("Registre des chèques", "[DÉMONSTRATION] PAOSITRA — NON CONTRACTUEL",
      lines, ["N° chèque", "Bénéficiaire", "Montant", "Statut"]);
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.cheques.export.pdf", objectType: "treasury.cheque", metadata: { count: rows.length }, ...requestMetadata(req) });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="registre-cheques-DEMO.pdf"');
    res.end(buf);
  }

  @Get("cheques-register.xlsx")
  @RequirePermission("treasury:accounts:read")
  async chequesXlsx(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const rows = await this.ds.query(
      `SELECT c.cheque_number AS number, c.beneficiary, c.amount, c.status,
              c.issue_date AS "issueDate", a.label AS account
       FROM treasury.cheques c JOIN treasury.current_accounts a ON a.id=c.account_id
       ORDER BY c.created_at DESC`
    );
    const buf = await buildXlsx("Registre cheques", [
      { header: "N° chèque", key: "number", width: 18 },
      { header: "Bénéficiaire", key: "beneficiary", width: 30 },
      { header: "Montant", key: "amount", width: 18 },
      { header: "Compte", key: "account", width: 26 },
      { header: "Date d'émission", key: "issueDate", width: 16 },
      { header: "Statut", key: "status", width: 16 }
    ], rows, "[DÉMONSTRATION] Registre des chèques — non contractuel");
    await this.audit.record(this.ds.manager, {
      actorUserId: req.user!.id,
      sessionId: req.user!.sessionId,
      action: "treasury.cheques.export.xlsx",
      objectType: "treasury.cheque",
      metadata: { count: rows.length },
      ...requestMetadata(req)
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="registre-cheques-DEMO.xlsx"');
    res.end(buf);
  }
}
