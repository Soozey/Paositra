import { BadRequestException, ConflictException, Controller, Get, Param, ParseUUIDPipe, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createHash, randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import type { AuthenticatedRequest } from "../common/request-context";
import { requestMetadata } from "../common/request-context";
import { AuditService } from "../platform/audit.service";
import { RequirePermission } from "../platform/rbac";

interface UploadedCsv { buffer: Buffer; originalname: string; mimetype: string; size: number }

function csvRow(line: string, separator: string) {
  const cells: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === separator && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

@ApiTags("Tresorerie - Imports bancaires")
@ApiBearerAuth()
@Controller("api/v1/treasury/bank-imports")
export class BankImportsController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService) {}

  @Get()
  @RequirePermission("treasury:imports:read")
  async list() {
    return { items: await this.ds.query(`SELECT b.id, b.original_name AS "originalName", b.imported_rows AS "importedRows",
      b.rejected_rows AS "rejectedRows", b.status, b.imported_at AS "importedAt", a.label AS "accountLabel"
      FROM treasury.bank_import_batches b JOIN treasury.current_accounts a ON a.id=b.account_id
      ORDER BY b.imported_at DESC LIMIT 100`) };
  }

  @Post(":accountId")
  @RequirePermission("treasury:imports:manage")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }))
  async import(@Param("accountId", ParseUUIDPipe) accountId: string, @UploadedFile() file: UploadedCsv, @Req() req: AuthenticatedRequest) {
    if (!file?.buffer) throw new BadRequestException("Selectionnez un fichier CSV de releve bancaire.");
    if (!file.originalname.toLowerCase().endsWith(".csv")) throw new BadRequestException("Seuls les releves CSV sont acceptes.");
    const content = file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) throw new BadRequestException("Le fichier doit contenir un en-tete et au moins une operation.");
    const separator = lines[0]!.includes(";") ? ";" : ",";
    const headers = csvRow(lines[0]!, separator).map((h) => h.toLowerCase());
    const required = ["date", "sens", "montant", "libelle", "reference"];
    if (required.some((name) => !headers.includes(name))) {
      throw new BadRequestException("Colonnes requises : date, sens, montant, libelle, reference.");
    }
    const get = (row: string[], key: string) => row[headers.indexOf(key)]?.trim() ?? "";
    const hash = createHash("sha256").update(file.buffer).digest("hex");
    const batchId = randomUUID(); let imported = 0; let rejected = 0;
    await this.ds.transaction(async (m) => {
      const account = await m.query("SELECT 1 FROM treasury.current_accounts WHERE id=$1 AND status='active'", [accountId]);
      if (!account.length) throw new BadRequestException("Compte courant actif introuvable.");
      const duplicate = await m.query("SELECT 1 FROM treasury.bank_import_batches WHERE account_id=$1 AND sha256=$2 AND status='processed'", [accountId, hash]);
      if (duplicate.length) throw new ConflictException("Ce releve a deja ete importe pour ce compte.");
      await m.query(`INSERT INTO treasury.bank_import_batches(id,account_id,original_name,sha256,imported_by)
        VALUES($1,$2,$3,$4,$5)`, [batchId, accountId, file.originalname.slice(0, 500), hash, req.user!.id]);
      for (const line of lines.slice(1)) {
        const row = csvRow(line, separator);
        const direction = get(row, "sens").toLowerCase();
        const amount = get(row, "montant").replace(/\s/g, "").replace(",", ".");
        const date = get(row, "date"); const label = get(row, "libelle"); const reference = get(row, "reference");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["encaissement", "decaissement"].includes(direction)
          || !/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || !label || !reference) { rejected += 1; continue; }
        const exists = await m.query("SELECT 1 FROM treasury.account_entries WHERE account_id=$1 AND external_reference=$2", [accountId, reference]);
        if (exists.length) { rejected += 1; continue; }
        await m.query(`INSERT INTO treasury.account_entries
          (id,account_id,entry_date,direction,amount,piece_reference,label,created_by,import_batch_id,external_reference)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [randomUUID(), accountId, date, direction, amount, reference, label.slice(0, 240), req.user!.id, batchId, reference]);
        imported += 1;
      }
      await m.query("UPDATE treasury.bank_import_batches SET imported_rows=$1,rejected_rows=$2 WHERE id=$3", [imported, rejected, batchId]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.bank_statement.imported", objectType: "treasury.bank_import_batch", objectId: batchId,
        metadata: { accountId, imported, rejected, sha256: hash }, ...requestMetadata(req) });
    });
    return { id: batchId, imported, rejected };
  }
}
