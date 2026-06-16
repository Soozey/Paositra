import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn
} from "typeorm";

@Entity({ schema: "platform", name: "users" })
export class User {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ length: 320 })
  email!: string;

  @Column({ name: "display_name", length: 200 })
  displayName!: string;

  @Column({ name: "password_hash", type: "text", nullable: true, select: false })
  passwordHash!: string | null;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;

  @Column({ name: "blocked_until", type: "timestamptz", nullable: true })
  blockedUntil!: Date | null;

  @Column({ name: "must_change_password", default: false })
  mustChangePassword!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity({ schema: "platform", name: "permissions" })
export class Permission {
  @PrimaryColumn({ length: 160 })
  code!: string;

  @Column("text")
  description!: string;
}

@Entity({ schema: "platform", name: "user_permissions" })
export class UserPermission {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid", { name: "user_id" })
  userId!: string;

  @Column({ name: "permission_code", length: 160 })
  permissionCode!: string;

  @Column({ name: "scope_type", length: 30, default: "global" })
  scopeType!: string;

  @Column("uuid", { name: "scope_id", nullable: true })
  scopeId!: string | null;

  @CreateDateColumn({ name: "granted_at", type: "timestamptz" })
  grantedAt!: Date;

  @Column("uuid", { name: "granted_by", nullable: true })
  grantedBy!: string | null;
}

@Entity({ schema: "platform", name: "sessions" })
export class Session {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid", { name: "user_id" })
  userId!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "last_seen_at", type: "timestamptz" })
  lastSeenAt!: Date;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({ name: "ip_address", type: "inet", nullable: true })
  ipAddress!: string | null;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent!: string | null;

  @Column({ name: "second_factor_verified", default: false })
  secondFactorVerified!: boolean;
}

@Entity({ schema: "platform", name: "login_attempts" })
export class LoginAttempt {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ length: 320 })
  email!: string;

  @CreateDateColumn({ name: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;

  @Column()
  succeeded!: boolean;

  @Column({ name: "ip_address", type: "inet", nullable: true })
  ipAddress!: string | null;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent!: string | null;

  @Column({ name: "failure_reason", type: "varchar", length: 80, nullable: true })
  failureReason!: string | null;
}

@Entity({ schema: "platform", name: "audit_events" })
export class AuditEvent {
  @PrimaryColumn("uuid")
  id!: string;

  @CreateDateColumn({ name: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;

  @Column("uuid", { name: "actor_user_id", nullable: true })
  actorUserId!: string | null;

  @Column("uuid", { name: "session_id", nullable: true })
  sessionId!: string | null;

  @Column({ length: 160 })
  action!: string;

  @Column({ name: "object_type", length: 160 })
  objectType!: string;

  @Column("uuid", { name: "object_id", nullable: true })
  objectId!: string | null;

  @Column({ name: "ip_address", type: "inet", nullable: true })
  ipAddress!: string | null;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent!: string | null;

  @Column({ name: "before_state", type: "jsonb", nullable: true })
  beforeState!: Record<string, unknown> | null;

  @Column({ name: "after_state", type: "jsonb", nullable: true })
  afterState!: Record<string, unknown> | null;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;
}

@Entity({ schema: "platform", name: "idempotency_keys" })
export class IdempotencyKey {
  @PrimaryColumn("uuid", { name: "actor_user_id" })
  actorUserId!: string;

  @PrimaryColumn({ length: 300 })
  route!: string;

  @PrimaryColumn({ name: "idempotency_key", length: 200 })
  idempotencyKey!: string;

  @Column({ name: "request_hash", length: 64 })
  requestHash!: string;

  @Column({ length: 20 })
  state!: "processing" | "completed" | "failed" | "expired";

  @Column({ name: "response_status", type: "integer", nullable: true })
  responseStatus!: number | null;

  @Column({ name: "response_body", type: "jsonb", nullable: true })
  responseBody!: unknown | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "failed_at", type: "timestamptz", nullable: true })
  failedAt!: Date | null;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;
}

@Entity({ schema: "treasury", name: "institutions" })
export class Institution {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ length: 240 })
  name!: string;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "archived_at", type: "timestamptz", nullable: true })
  archivedAt!: Date | null;

  @VersionColumn()
  version!: number;
}

@Entity({ schema: "treasury", name: "placements" })
export class Placement {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid", { name: "institution_id" })
  institutionId!: string;

  @ManyToOne(() => Institution)
  @JoinColumn({ name: "institution_id" })
  institution!: Institution;

  @Column("numeric", { name: "principal_amount", precision: 20, scale: 2 })
  principalAmount!: string;

  @Column({ length: 3 })
  currency!: string;

  @Column("numeric", { name: "annual_interest_rate", precision: 9, scale: 6 })
  annualInterestRate!: string;

  @Column("integer", { name: "duration_days" })
  durationDays!: number;

  @Column({ name: "deposit_mode", length: 120 })
  depositMode!: string;

  @Column({ name: "interest_calculation_mode", length: 160 })
  interestCalculationMode!: string;

  @Column({ name: "start_date", type: "date" })
  startDate!: string;

  @Column({ length: 20, default: "open" })
  status!: "open" | "cancelled" | "closed";

  @Column({ name: "cancellation_reason", type: "text", nullable: true })
  cancellationReason!: string | null;

  @Column({ name: "cancelled_at", type: "timestamptz", nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt!: Date | null;

  @Column("uuid", { name: "created_by" })
  createdBy!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}

@Entity({ schema: "treasury", name: "placement_history" })
export class PlacementHistory {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid", { name: "placement_id" })
  placementId!: string;

  @Column({ length: 40 })
  action!: string;

  @Column("text", { nullable: true })
  reason!: string | null;

  @Column("uuid", { name: "actor_user_id" })
  actorUserId!: string;

  @Column({ name: "before_state", type: "jsonb", nullable: true })
  beforeState!: Record<string, unknown> | null;

  @Column({ name: "after_state", type: "jsonb", nullable: true })
  afterState!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;
}

@Entity({ schema: "operations", name: "agencies" })
export class Agency {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ length: 80 })
  code!: string;

  @Column({ length: 240 })
  name!: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  zone!: string | null;

  @Column({ name: "parent_organ", type: "varchar", length: 240, nullable: true })
  parentOrgan!: string | null;

  @Column("numeric", { name: "cash_max_amount", precision: 20, scale: 2, nullable: true })
  cashMaxAmount!: string | null;

  @Column("numeric", { name: "postal_value_max_amount", precision: 20, scale: 2, nullable: true })
  postalValueMaxAmount!: string | null;

  @Column("numeric", { name: "foreign_currency_max_amount", precision: 20, scale: 2, nullable: true })
  foreignCurrencyMaxAmount!: string | null;

  @Column({ name: "manager_management_start_date", type: "date", nullable: true })
  managerManagementStartDate!: string | null;

  @Column({ length: 20, default: "open" })
  status!: "open" | "closed";

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt!: Date | null;

  @Column({ name: "closure_reason", type: "text", nullable: true })
  closureReason!: string | null;

  @Column("uuid", { name: "created_by" })
  createdBy!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}

export const entities = [
  User,
  Permission,
  UserPermission,
  Session,
  LoginAttempt,
  AuditEvent,
  IdempotencyKey,
  Institution,
  Placement,
  PlacementHistory,
  Agency
];
