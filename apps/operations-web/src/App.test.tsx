import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "@paositra/web-core";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { CashModule } from "./CashModule";

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

describe("Operations application shell", () => {
  it("renders the labelled login form with valid UTF-8 text", () => {
    renderApp();

    expect(
      screen.getByRole("heading", { name: "Gestion des opérations" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse e-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Ã.|â€™/);
  });

  it("hides agency write actions when the permission is absent", async () => {
    sessionStorage.setItem("paositra_access_token", "technical-test-token");
    sessionStorage.setItem(
      "paositra_user",
      JSON.stringify({
        id: "463db44f-23bc-4c0f-a0e4-87b3ad52da3c",
        email: "technical-test@example.invalid",
        displayName: "Technical Test User",
        sessionId: "2b8a74e7-a60c-4dc2-b752-52a56cf71b74",
        mustChangePassword: false,
        permissions: [
          {
            code: "operations:agencies:read",
            scopeType: "global",
            scopeId: null
          }
        ]
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0 })
      })
    );

    renderApp();

    expect(
      await screen.findByRole("heading", { name: "Agences enregistrées" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Ouvrir une agence" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fermer" })).not.toBeInTheDocument();
  });

  it("shows human source labels instead of API implementation details", async () => {
    sessionStorage.setItem("paositra_access_token", "technical-test-token");
    sessionStorage.setItem(
      "paositra_user",
      JSON.stringify({
        id: "463db44f-23bc-4c0f-a0e4-87b3ad52da3c",
        email: "demo.dop@paositra-demo.mg",
        displayName: "[DEMO] Directeur Operations",
        sessionId: "2b8a74e7-a60c-4dc2-b752-52a56cf71b74",
        mustChangePassword: false,
        permissions: [
          { code: "operations:agencies:read", scopeType: "global", scopeId: null },
          { code: "platform:roles:read", scopeType: "global", scopeId: null },
          { code: "platform:audit:read", scopeType: "global", scopeId: null }
        ]
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/v1/auth/me")) {
          return new Response(JSON.stringify(JSON.parse(sessionStorage.getItem("paositra_user")!)), { status: 200 });
        }
        return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
      })
    );

    renderApp();

    expect(await screen.findByText(/référentiel agences chargé dans la démonstration/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("/api/v1/operations/agencies");
    expect(document.body.textContent).not.toContain("Source paoma_validated");
    expect(document.body.textContent).not.toContain("Derniers événements chargés depuis l'API");
  });

  it("hides project framing paths from auditor profiles", async () => {
    sessionStorage.setItem("paositra_access_token", "technical-test-token");
    sessionStorage.setItem(
      "paositra_user",
      JSON.stringify({
        id: "463db44f-23bc-4c0f-a0e4-87b3ad52da3c",
        email: "demo.audit@paositra.local",
        displayName: "[DEMO] Audit",
        sessionId: "2b8a74e7-a60c-4dc2-b752-52a56cf71b74",
        mustChangePassword: false,
        permissions: [
          { code: "operations:agencies:read", scopeType: "global", scopeId: null },
          { code: "platform:roles:read", scopeType: "global", scopeId: null },
          { code: "platform:audit:read", scopeType: "global", scopeId: null }
        ]
      })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0 })
      })
    );

    renderApp();

    expect(await screen.findByRole("button", { name: "Agences" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Parcours à cadrer" })).not.toBeInTheDocument();
  });

  it("keeps focus while typing multi-digit billetage counts", async () => {
    const user = {
      id: "463db44f-23bc-4c0f-a0e4-87b3ad52da3c",
      email: "technical-test@example.invalid",
      displayName: "Technical Test User",
      sessionId: "2b8a74e7-a60c-4dc2-b752-52a56cf71b74",
      mustChangePassword: false,
      permissions: [
        { code: "operations:agencies:read", scopeType: "global", scopeId: null },
        { code: "operations:counters:read", scopeType: "global", scopeId: null },
        { code: "operations:cash:open", scopeType: "global", scopeId: null }
      ]
    };
    sessionStorage.setItem("paositra_access_token", "technical-test-token");
    sessionStorage.setItem("paositra_user", JSON.stringify(user));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/v1/auth/me")) {
          return new Response(JSON.stringify(user), { status: 200 });
        }
        if (url.includes("/api/v1/operations/agencies")) {
          return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
        }
        if (url.endsWith("/api/v1/operations/cash/sessions")) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({ detail: "Route inattendue." }), { status: 404 });
      })
    );

    render(
      <AuthProvider>
        <CashModule />
      </AuthProvider>
    );

    const billetInput = screen.getByLabelText(/20[\s\u202f]?000/);
    await userEvent.type(billetInput, "2000000");

    expect((billetInput as HTMLInputElement).value).toBe("2 000 000");
    expect(document.activeElement).toBe(billetInput);
    expect(screen.getByText(/40[\s\u202f]?000[\s\u202f]?000[\s\u202f]?000 MGA/)).toBeInTheDocument();
  });
});
