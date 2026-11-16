import { useEffect, useState } from "react";

const QUERY = "(max-width: 639px)";

// Retorna true em telas menores que o breakpoint `sm` do Tailwind (640px).
// Usado para ajustar gráficos (recharts) que recebem tamanhos via props.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
