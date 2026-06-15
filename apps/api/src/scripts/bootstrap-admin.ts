import "reflect-metadata";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { DataSource, In } from "typeorm";
import {
  Permission,
  User,
  UserPermission,
  entities
} from "../database/entities";

const databaseUrl = process.env.DATABASE_URL;
const bootstrapEnabled = process.env.CONTROLLED_BOOTSTRAP_ENABLED === "true";
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const displayName = process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME?.trim();
const requestedPermissionCodes = (process.env.BOOTSTRAP_PERMISSION_CODES || "")
  .split(",")
  .map((code) => code.trim())
  .filter(Boolean);

if (!bootstrapEnabled) {
  throw new Error(
    "Controlled bootstrap is disabled. Set CONTROLLED_BOOTSTRAP_ENABLED=true only for an approved provisioning operation."
  );
}

if (!databaseUrl || !email || !password || !displayName) {
  throw new Error(
    "DATABASE_URL, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD and BOOTSTRAP_ADMIN_DISPLAY_NAME are required"
  );
}

if (requestedPermissionCodes.length === 0) {
  throw new Error(
    "BOOTSTRAP_PERMISSION_CODES must explicitly list approved technical permissions"
  );
}

if (
  password.length < 12 ||
  !/[a-z]/.test(password) ||
  !/[A-Z]/.test(password) ||
  !/\d/.test(password) ||
  !/[^A-Za-z0-9]/.test(password)
) {
  throw new Error(
    "BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters, upper/lower case, a digit and a special character"
  );
}

async function main(
  requiredDatabaseUrl: string,
  requiredEmail: string,
  requiredPassword: string,
  requiredDisplayName: string,
  requiredPermissionCodes: string[]
) {
  const dataSource = new DataSource({
    type: "postgres",
    url: requiredDatabaseUrl,
    entities,
    synchronize: false
  });

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const existing = await manager
        .getRepository(User)
        .createQueryBuilder("user")
        .where("lower(user.email) = :email", { email: requiredEmail })
        .getOne();
      if (existing) {
        throw new Error("An account already exists for this email");
      }

      const permissions = await manager.findBy(Permission, {
        code: In(requiredPermissionCodes)
      });
      if (permissions.length !== new Set(requiredPermissionCodes).size) {
        throw new Error(
          "One or more BOOTSTRAP_PERMISSION_CODES are unknown or duplicated"
        );
      }

      const user = manager.create(User, {
        id: randomUUID(),
        email: requiredEmail,
        displayName: requiredDisplayName,
        passwordHash: await bcrypt.hash(requiredPassword, 12),
        isActive: true,
        blockedUntil: null,
        mustChangePassword: true
      });
      await manager.save(user);

      await manager.insert(
        UserPermission,
        permissions.map((permission) => ({
          id: randomUUID(),
          userId: user.id,
          permissionCode: permission.code,
          scopeType: "global",
          scopeId: null,
          grantedBy: user.id
        }))
      );
      console.log(`Bootstrap administrator created: ${requiredEmail}`);
    });
  } finally {
    await dataSource.destroy();
  }
}

void main(
  databaseUrl,
  email,
  password,
  displayName,
  requestedPermissionCodes
);
