import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTraducao } from "../context/TraducaoContext.jsx";
import { Eye, EyeOff, LogIn, Globe, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils.js";

function LoginLanguageSwitcher() {
  const { idioma, setIdioma, IDIOMAS } = useTraducao();
  const [open, setOpen] = useState(false);
  const atual = IDIOMAS.find((i) => i.codigo === idioma) ?? IDIOMAS[0];

  return (
    <div className="relative flex justify-end mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <Globe size={13} />
        <span>
          {atual.bandeira} {atual.nome}
        </span>
        <ChevronDown
          size={11}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-50 min-w-40">
          {IDIOMAS.map((lang) => (
            <button
              key={lang.codigo}
              onClick={() => {
                setIdioma(lang.codigo);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors",
                lang.codigo === idioma
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-semibold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5",
              )}
            >
              <span>{lang.bandeira}</span>
              <span>{lang.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTraducao();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, senha);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ??
          t("LOGIN_ERROR_DEFAULT", "Credenciais inválidas. Tente novamente."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-navy-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-blue-900/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Language switcher */}
        <LoginLanguageSwitcher />

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 mb-4 shadow-lg shadow-blue-900/40">
            <span className="text-2xl font-black text-white">GK</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("LOGIN_BRAND", "Grupo GK")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-500 mt-1">
            {t("LOGIN_SUBTITLE", "Sistema Financeiro Consolidado")}
          </p>
        </div>

        {/* Card */}
        <div className="glass card-shadow rounded-2xl p-8 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("LOGIN_CARD_TITLE", "Entrar na sua conta")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {t("LOGIN_EMAIL_LABEL", "E-mail")}
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-base"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {t("LOGIN_SENHA_LABEL", "Senha")}
              </label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading
                ? t("LOGIN_BTN_LOADING", "Entrando…")
                : t("LOGIN_BTN", "Entrar")}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 dark:text-slate-600 mt-6">
          Grupo GK © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
