import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// Aviso flutuante das telas de cobranca (Machine Pay, CompactPay e Configuracoes).
export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  function show(message, opts = {}) {
    clearTimeout(timer.current);
    setToast({ message, ...opts });
    timer.current = setTimeout(() => setToast(null), opts.undo ? 6000 : 3500);
  }

  const node = toast && (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl card-shadow bg-slate-900 text-[#fff] text-sm max-w-[calc(100vw-1.5rem)]">
      {toast.error ? (
        <AlertTriangle size={16} className="text-red-400" />
      ) : (
        <CheckCircle2 size={16} className="text-emerald-400" />
      )}
      <span className="text-[#fff]">{toast.message}</span>
      {toast.undo && (
        <button
          onClick={() => {
            toast.undo();
            setToast(null);
          }}
          className="ml-2 text-xs font-semibold text-[#93c5fd] hover:underline"
        >
          Desfazer
        </button>
      )}
    </div>
  );

  return { show, node };
}
