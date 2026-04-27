import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── Configuração ────────────────────────────────────────────────────────────
const TRADUTOR_URL =
  import.meta.env.VITE_TRADUTOR_URL ?? "http://localhost:3000";

const SISTEMA = "grupogk";

const IDIOMAS = [
  { codigo: "pt-BR", nome: "Português (BR)", bandeira: "🇧🇷" },
  { codigo: "pt-PT", nome: "Português (PT)", bandeira: "🇵🇹" },
  { codigo: "en-US", nome: "English", bandeira: "🇺🇸" },
  { codigo: "it-IT", nome: "Italiano", bandeira: "🇮🇹" },
  { codigo: "es-ES", nome: "Español", bandeira: "🇪🇸" },
  { codigo: "ar-MA", nome: "العربية", bandeira: "🇲🇦" },
];

const FALLBACK = "pt-BR";

// ─── Contexto ────────────────────────────────────────────────────────────────
const TraducaoContext = createContext(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function loadStoredIdioma() {
  try {
    const stored = localStorage.getItem("gk_idioma");
    if (stored && IDIOMAS.find((i) => i.codigo === stored)) return stored;
  } catch {
    // sem acesso a localStorage
  }
  return FALLBACK;
}

async function fetchTraducoes(idioma) {
  const res = await fetch(`${TRADUTOR_URL}/traducoes/${SISTEMA}/${idioma}`);
  if (!res.ok) throw new Error(`Tradutor retornou ${res.status}`);
  return res.json(); // { idioma, direcao, traducoes: {} }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function TraducaoProvider({ children }) {
  const [idioma, setIdiomaState] = useState(loadStoredIdioma);
  const [traducoes, setTraducoes] = useState({});
  const [direcao, setDirecao] = useState("ltr");
  const [carregando, setCarregando] = useState(true);

  const carregarTraducoes = useCallback(async (codigoIdioma) => {
    setCarregando(true);
    try {
      const data = await fetchTraducoes(codigoIdioma);
      setTraducoes(data.traducoes ?? {});
      setDirecao(data.direcao ?? "ltr");
    } catch {
      // Em caso de falha na API, mantém as traduções anteriores
      // (o fallback já é pt-BR no servidor)
    } finally {
      setCarregando(false);
    }
  }, []);

  // Carrega ao montar e ao trocar idioma
  useEffect(() => {
    carregarTraducoes(idioma);
  }, [idioma, carregarTraducoes]);

  // Aplica direção RTL/LTR no <html>
  useEffect(() => {
    document.documentElement.setAttribute("dir", direcao);
    document.documentElement.setAttribute("lang", idioma);
  }, [direcao, idioma]);

  const setIdioma = useCallback((codigo) => {
    if (!IDIOMAS.find((i) => i.codigo === codigo)) return;
    localStorage.setItem("gk_idioma", codigo);
    setIdiomaState(codigo);
  }, []);

  /**
   * Retorna a tradução de uma chave.
   * Se a chave não existir, retorna o `fallback` fornecido ou a própria chave.
   */
  const t = useCallback(
    (chave, fallback) => {
      return traducoes[chave] ?? fallback ?? chave;
    },
    [traducoes],
  );

  return (
    <TraducaoContext.Provider
      value={{ idioma, setIdioma, t, direcao, carregando, IDIOMAS }}
    >
      {children}
    </TraducaoContext.Provider>
  );
}

// ─── Hook público ─────────────────────────────────────────────────────────────
export function useTraducao() {
  const ctx = useContext(TraducaoContext);
  if (!ctx)
    throw new Error("useTraducao deve ser usado dentro de TraducaoProvider");
  return ctx;
}
