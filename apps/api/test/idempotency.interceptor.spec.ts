import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";
import { vi } from "vitest";
import { IdempotencyInterceptor } from "../src/platform/idempotency.interceptor";

function createHarness(initialRecord: Record<string, unknown> | null = null) {
  let record = initialRecord;
  let completionPersisted = false;
  const repository = {
    findOneBy: async () => record,
    insert: async (value: Record<string, unknown>) => {
      if (record) {
        throw Object.assign(new Error("duplicate"), { code: "23505" });
      }
      record = { ...value };
    },
    update: async (
      _criteria: Record<string, unknown>,
      values: Record<string, unknown>
    ) => {
      if (!record) {
        return { affected: 0 };
      }
      record = { ...record, ...values };
      if (values.state === "completed") {
        await new Promise((resolve) => setTimeout(resolve, 5));
        completionPersisted = true;
      }
      return { affected: 1 };
    },
    delete: async () => {
      record = null;
      return { affected: 1 };
    }
  };
  const dataSource = {
    getRepository: () => repository
  };
  const response = {
    statusCode: 201,
    status: vi.fn(function status(this: { statusCode: number }, code: number) {
      this.statusCode = code;
      return this;
    })
  };
  const request = {
    body: { technical: "value" },
    method: "POST",
    route: { path: "/technical" },
    user: { id: "0fd6605b-4083-4d55-aa31-6e0954355a56" },
    get: (name: string) =>
      name.toLowerCase() === "idempotency-key" ? "technical-key" : undefined
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response
    })
  } as unknown as ExecutionContext;

  return {
    interceptor: new IdempotencyInterceptor(dataSource as never),
    context,
    response,
    getRecord: () => record,
    isCompletionPersisted: () => completionPersisted
  };
}

describe("IdempotencyInterceptor", () => {
  it("reuses a completed result and executes the handler once", async () => {
    const harness = createHarness();
    let executions = 0;
    const next: CallHandler = {
      handle: () => {
        executions += 1;
        return of({ accepted: true });
      }
    };

    const first = await lastValueFrom(
      harness.interceptor.intercept(harness.context, next)
    );
    const second = await lastValueFrom(
      harness.interceptor.intercept(harness.context, next)
    );

    expect(first).toEqual({ accepted: true });
    expect(second).toEqual({ accepted: true });
    expect(executions).toBe(1);
    expect(harness.isCompletionPersisted()).toBe(true);
  });

  it("marks a failed request and permits a controlled retry", async () => {
    const harness = createHarness();
    const failure = new Error("technical failure");
    await expect(
      lastValueFrom(
        harness.interceptor.intercept(harness.context, {
          handle: () => throwError(() => failure)
        })
      )
    ).rejects.toThrow("technical failure");
    expect(harness.getRecord()).toEqual(
      expect.objectContaining({ state: "failed" })
    );

    const result = await lastValueFrom(
      harness.interceptor.intercept(harness.context, {
        handle: () => of({ retried: true })
      })
    );
    expect(result).toEqual({ retried: true });
    expect(harness.getRecord()).toEqual(
      expect.objectContaining({ state: "completed" })
    );
  });

  it("reclaims an expired key instead of replaying stale data", async () => {
    const harness = createHarness({
      actorUserId: "0fd6605b-4083-4d55-aa31-6e0954355a56",
      route: "POST /technical",
      idempotencyKey: "technical-key",
      requestHash: "stale",
      state: "completed",
      responseStatus: 200,
      responseBody: { stale: true },
      expiresAt: new Date(Date.now() - 1_000)
    });

    const result = await lastValueFrom(
      harness.interceptor.intercept(harness.context, {
        handle: () => of({ fresh: true })
      })
    );

    expect(result).toEqual({ fresh: true });
    expect(harness.getRecord()).toEqual(
      expect.objectContaining({
        state: "completed",
        responseBody: { fresh: true }
      })
    );
  });
});
