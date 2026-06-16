import { fireEvent, render, screen } from "@testing-library/react";
import { AuthProvider } from "@paositra/web-core";
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
});
