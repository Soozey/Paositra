import { fireEvent, render, screen } from "@testing-library/react";
import { AmountInput, AuthProvider, formatAmountInput, sanitizeAmountInput } from "@paositra/web-core";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

describe("Treasury application shell", () => {
  it("formats amount input while keeping the raw numeric value", () => {
    let raw = "";
    const { rerender } = render(
      <AmountInput
        aria-label="Montant"
        value={raw}
        onValueChange={(value) => {
          raw = value;
        }}
      />
    );
    const input = screen.getByLabelText("Montant");

    fireEvent.change(input, { target: { value: "2" } });
    rerender(<AmountInput aria-label="Montant" value={raw} onValueChange={(value) => { raw = value; }} />);
    fireEvent.change(input, { target: { value: "20" } });
    rerender(<AmountInput aria-label="Montant" value={raw} onValueChange={(value) => { raw = value; }} />);
    fireEvent.change(input, { target: { value: "200" } });
    rerender(<AmountInput aria-label="Montant" value={raw} onValueChange={(value) => { raw = value; }} />);
    fireEvent.change(input, { target: { value: "2000" } });
    rerender(<AmountInput aria-label="Montant" value={raw} onValueChange={(value) => { raw = value; }} />);

    expect(raw).toBe("2000");
    expect(input).toHaveValue("2 000");
    expect(formatAmountInput("1234567.5")).toBe("1 234 567.5");
    expect(sanitizeAmountInput("1 234 567,5")).toBe("1234567.5");
  });

  it("renders the labelled login form with valid UTF-8 text", () => {
    renderApp();

    expect(
      screen.getByRole("heading", { name: "Gestion de la Trésorerie" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse e-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Ã.|â€™/);
  });

  it("shows a comprehensible API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          detail: "Votre session est absente ou a expiré."
        })
      })
    );
    renderApp();

    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "test@example.invalid" }
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "technical-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(
      await screen.findByText("Votre session est absente ou a expiré.")
    ).toBeInTheDocument();
  });

  it("keeps the presentation demo disabled by default", async () => {
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
            code: "treasury:institutions:read",
            scopeType: "global",
            scopeId: null
          },
          {
            code: "treasury:placements:read",
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
      await screen.findByRole("heading", { name: "Placements enregistrés" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("DÉMONSTRATION PROVISOIRE — CONFORME DAO — DONNÉES MÉTIER À VALIDER")
    ).not.toBeInTheDocument();
  });
});
