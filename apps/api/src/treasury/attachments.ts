import { BadRequestException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DataSource } from "typeorm";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import type { AuthenticatedRequest } from "../common/request-context";
import { requestMetadata } from "../common/request-context";
import { AuditService } from "../platform/audit.service";
import { RequirePermission } from "../platform/rbac";
import { IdempotencyInterceptor } from "../platform/idempotency.interceptor";

interface UploadedDocument { buffer: Buffer; originalname: string; mimetype: string; size: number }
const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"]);
const OBJECT_QUERIES: Record<string, string> = {
  engagement: "SELECT 1 FROM treasury.engagements WHERE id=$1",
  account_entry: "SELECT 1 FROM treasury.account_entries WHERE id=$1",
  receivable: "SELECT 1 FROM treasury.receivables WHERE id=$1",
  placement: "SELECT 1 FROM treasury.placements WHERE id=$1"
};

@ApiTags("Tresorerie - Pieces jointes")
@ApiBearerAuth()
@Controller("api/v1/treasury/attachments")
export class TreasuryAttachmentsController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService, private readonly config: ConfigService) {}

  @Get("objects/:objectType/:objectId")
  @RequirePermission("treasury:attachments:read")
  async list(@Param("objectType") objectType: string, @Param("objectId", ParseUUIDPipe) objectId: string) {
    this.assertObjectType(objectType);
    return { items: await this.ds.query(`SELECT id, original_name AS "originalName", media_type AS "mediaType",
      size_bytes AS "sizeBytes", sha256, uploaded_at AS "uploadedAt"
      FROM platform.attachments WHERE object_type=$1 AND object_id=$2 AND archived_at IS NULL ORDER BY uploaded_at DESC`,
      [`treasury.${objectType}`, objectId]) };
  }

  @Post("objects/:objectType/:objectId")
  @RequirePermission("treasury:attachments:manage")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 100 * 1024 * 1024 } }))
  async upload(@Param("objectType") objectType: string, @Param("objectId", ParseUUIDPipe) objectId: string,
    @UploadedFile() file: UploadedDocument, @Req() req: AuthenticatedRequest) {
    const query = this.assertObjectType(objectType);
    if (!file?.buffer) throw new BadRequestException("Selectionnez une piece jointe.");
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) throw new BadRequestException("Format refuse. Utilisez PDF, image, Word, Excel, CSV ou TXT.");
    const object = await this.ds.query(query, [objectId]);
    if (!object.length) throw new NotFoundException("Objet metier introuvable.");
    const id = randomUUID(); const storageKey = `${new Date().getFullYear()}/${id}${extension}`;
    const root = path.resolve(this.config.get<string>("UPLOAD_ROOT") ?? "./uploads");
    const target = path.join(root, storageKey); await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.buffer, { flag: "wx" });
    try {
      await this.ds.transaction(async (m) => {
        const sha256 = createHash("sha256").update(file.buffer).digest("hex");
        await m.query(`INSERT INTO platform.attachments
          (id,object_type,object_id,original_name,storage_key,media_type,size_bytes,sha256,uploaded_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, `treasury.${objectType}`, objectId,
          file.originalname.slice(0, 500), storageKey, file.mimetype || "application/octet-stream", file.size, sha256, req.user!.id]);
        await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
          action: "treasury.attachment.uploaded", objectType: `treasury.${objectType}`, objectId,
          metadata: { attachmentId: id, originalName: file.originalname, size: file.size, sha256 }, ...requestMetadata(req) });
      });
    } catch (error) { await unlink(target).catch(() => undefined); throw error; }
    return { id, originalName: file.originalname, sizeBytes: file.size };
  }

  @Get("file/:id")
  @RequirePermission("treasury:attachments:read")
  async download(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response, @Req() req: AuthenticatedRequest) {
    const rows = await this.ds.query(`SELECT original_name,storage_key,media_type FROM platform.attachments
      WHERE id=$1 AND object_type LIKE 'treasury.%' AND archived_at IS NULL`, [id]);
    if (!rows.length) throw new NotFoundException("Piece jointe introuvable.");
    const root = path.resolve(this.config.get<string>("UPLOAD_ROOT") ?? "./uploads");
    const content = await readFile(path.join(root, rows[0].storage_key)).catch(() => { throw new NotFoundException("Fichier indisponible dans le stockage."); });
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.attachment.downloaded", objectType: "platform.attachment", objectId: id, ...requestMetadata(req) });
    res.setHeader("Content-Type", rows[0].media_type);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(rows[0].original_name)}`);
    res.end(content);
  }

  @Post("file/:id/archive")
  @RequirePermission("treasury:attachments:manage")
  @UseInterceptors(IdempotencyInterceptor)
  async archive(@Param("id", ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const rows = await this.ds.query(`UPDATE platform.attachments SET archived_at=now()
      WHERE id=$1 AND object_type LIKE 'treasury.%' AND archived_at IS NULL RETURNING object_type,object_id`, [id]);
    if (!rows.length) throw new NotFoundException("Piece jointe introuvable ou deja archivee.");
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.attachment.archived", objectType: rows[0].object_type, objectId: rows[0].object_id,
      metadata: { attachmentId: id }, ...requestMetadata(req) });
    return { id, archived: true };
  }

  private assertObjectType(type: string) {
    const query = OBJECT_QUERIES[type];
    if (!query) throw new BadRequestException("Type de dossier non pris en charge.");
    return query;
  }
}
