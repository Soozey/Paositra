import {
  createContext,
  type FormEvent,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState
} from "react";

export interface Permission {
  code: string;
  scopeType: string;
  scopeId: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  sessionId: string;
  mustChangePassword?: boolean;
  permissions: Permission[];
}

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
  setSession: (token: string, user: CurrentUser) => void;
  clearSession: () => void;
  hasPermission: (
    permission: string,
    scope?: { type: Exclude<string, "global">; id: string }
  ) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null; idempotent?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  if (options.idempotent) {
    headers.set("Idempotency-Key", crypto.randomUUID());
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const detail = Array.isArray(problem?.detail)
      ? problem.detail.join(" ")
      : problem?.detail;
    throw new ApiError(
      detail || "La demande n'a pas pu être traitée.",
      response.status
    );
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("paositra_access_token")
  );
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const saved = sessionStorage.getItem("paositra_user");
    return saved ? (JSON.parse(saved) as CurrentUser) : null;
  });

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      setSession: (newToken, newUser) => {
        sessionStorage.setItem("paositra_access_token", newToken);
        sessionStorage.setItem("paositra_user", JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
      },
      clearSession: () => {
        sessionStorage.removeItem("paositra_access_token");
        sessionStorage.removeItem("paositra_user");
        setToken(null);
        setUser(null);
      },
      hasPermission: (permission, scope) =>
        Boolean(
          user?.permissions.some(
            (entry) =>
              entry.code === permission &&
              ((entry.scopeType === "global" && entry.scopeId === null) ||
                (scope &&
                  entry.scopeType === scope.type &&
                  entry.scopeId === scope.id))
          )
        )
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("AuthProvider is missing");
  }
  return context;
}

export function LoginPage({ applicationName }: { applicationName: string }) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest<{
        accessToken: string;
        user: CurrentUser;
      }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      auth.setSession(result.accessToken, result.user);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "La connexion n'a pas pu être établie."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">PAOSITRA MALAGASY</p>
        <h1 id="login-title">{applicationName}</h1>
        <p className="muted">Connectez-vous avec votre compte autorisé.</p>
        <form onSubmit={submit}>
          <label>
            Adresse e-mail
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="message error">{error}</p>}
          <button className="primary" disabled={loading} type="submit">
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}

export function ChangePasswordPage({
  applicationName
}: {
  applicationName: string;
}) {
  const auth = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    setLoading(true);
    try {
      const result = await apiRequest<{ user: CurrentUser }>(
        "/api/v1/auth/change-password",
        {
          method: "POST",
          token: auth.token,
          body: JSON.stringify({ currentPassword, newPassword })
        }
      );
      auth.setSession(auth.token!, result.user);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Le mot de passe n'a pas pu être modifié."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="password-title">
        <p className="eyebrow">PAOSITRA MALAGASY</p>
        <h1 id="password-title">{applicationName}</h1>
        <p>
          Vous devez définir un nouveau mot de passe avant d'accéder à
          l'application.
        </p>
        <form onSubmit={submit}>
          <label>
            Mot de passe actuel
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Nouveau mot de passe
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Confirmer le nouveau mot de passe
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </label>
          <p className="muted">
            Minimum 12 caractères avec majuscule, minuscule, chiffre et
            caractère spécial.
          </p>
          {error && <p className="message error">{error}</p>}
          <button className="primary" disabled={loading} type="submit">
            {loading ? "Modification en cours..." : "Changer le mot de passe"}
          </button>
        </form>
      </section>
    </main>
  );
}

export function AppShell({
  title,
  children
}: PropsWithChildren<{ title: string }>) {
  const auth = useAuth();

  async function logout() {
    try {
      await apiRequest("/api/v1/auth/logout", {
        method: "POST",
        token: auth.token
      });
    } finally {
      auth.clearSession();
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PAOSITRA MALAGASY</p>
          <h1>{title}</h1>
        </div>
        <div className="session">
          <span>{auth.user?.displayName}</span>
          <button className="secondary" onClick={logout} type="button">
            Se déconnecter
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}

export function Message({
  type,
  children
}: PropsWithChildren<{ type: "error" | "success" | "info" }>) {
  return <p className={`message ${type}`}>{children}</p>;
}
