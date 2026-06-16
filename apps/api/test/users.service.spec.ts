import { UsersService } from "../src/platform/users.service";

describe("UsersService", () => {
  it("creates a user without assigning any permission", async () => {
    const saved: unknown[] = [];
    const auditEvents: unknown[] = [];
    const repository = {
      createQueryBuilder: () => ({
        where: () => ({ getOne: async () => null })
      }),
      create: (value: unknown) => value,
      manager: {
        transaction: async (callback: (manager: unknown) => Promise<void>) =>
          callback({
            save: async (value: unknown) => {
              saved.push(value);
            }
          })
      }
    };
    const audit = {
      record: async (_manager: unknown, event: unknown) => {
        auditEvents.push(event);
      }
    };
    const config = {
      getOrThrow: () => 12
    };
    const service = new UsersService(
      config as never,
      repository as never,
      audit as never
    );

    const result = await service.create(
      {
        email: "technical-user@example.invalid",
        displayName: "Technical Test User",
        password: "Strong-password-123!",
        mustChangePassword: true
      },
      {
        id: "8094e13f-d555-4af9-a0fb-905d0b247fdb",
        email: "actor@example.invalid",
        displayName: "Technical Test Actor",
        sessionId: "6922f256-f2e3-4414-8de0-4a52be082b22",
        mustChangePassword: false,
        permissions: []
      },
      { ipAddress: null, userAgent: null }
    );

    expect(saved).toHaveLength(1);
    expect(auditEvents).toHaveLength(1);
    expect(result.permissionCodes).toEqual([]);
    expect(auditEvents[0]).not.toEqual(
      expect.objectContaining({
        afterState: expect.objectContaining({ permissionCodes: expect.anything() })
      })
    );
  });
});
