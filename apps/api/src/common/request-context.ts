import type { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  sessionId: string;
  mustChangePassword: boolean;
  permissions: Array<{
    code: string;
    scopeType: string;
    scopeId: string | null;
  }>;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export function requestMetadata(request: Request) {
  return {
    ipAddress: request.ip || null,
    userAgent: request.get("user-agent") || null
  };
}
