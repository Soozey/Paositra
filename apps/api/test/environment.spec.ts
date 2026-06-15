import { validateEnvironment } from "../src/config/environment";

describe("environment validation", () => {
  it("rejects short JWT secrets", () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: "postgresql://user:password@localhost:5432/database",
        JWT_SECRET: "too-short"
      })
    ).toThrow();
  });

  it("applies secure session defaults", () => {
    const environment = validateEnvironment({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      JWT_SECRET: "a-secure-secret-with-at-least-32-characters"
    });
    expect(environment.JWT_TTL_SECONDS).toBe(900);
    expect(environment.SESSION_IDLE_TIMEOUT_SECONDS).toBe(900);
    expect(environment.LOGIN_MAX_ATTEMPTS).toBe(5);
  });
});
