import { formatCurrency } from "../../../lib/utils.js";

export default function PerformanceTable({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Performance de Contas Bancárias
        </h3>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin">⚙️</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Performance de Contas Bancárias
        </h3>
        <div className="text-slate-500 text-sm">Nenhuma conta cadastrada</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Performance de Contas Bancárias
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                Banco
              </th>
              <th className="px-4 py-3 text-left text-slate-300 font-semibold">
                Conta
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                Saldo Inicial (Período)
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                Entradas
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                Saídas
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                Saldo Final (Período)
              </th>
              <th className="px-4 py-3 text-right text-slate-300 font-semibold">
                % do Grupo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3 text-slate-300 font-medium">
                  {row.banco}
                </td>
                <td className="px-4 py-3 text-slate-400">{row.conta}</td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {formatCurrency(row.saldoInicial)}
                </td>
                <td className="px-4 py-3 text-right text-green-400">
                  {formatCurrency(row.entradas)}
                </td>
                <td className="px-4 py-3 text-right text-red-400">
                  {formatCurrency(row.saidas)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    row.saldoFinal >= 0 ? "text-blue-400" : "text-red-400"
                  }`}
                >
                  {formatCurrency(row.saldoFinal)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-slate-300">{row.participacao}%</span>
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.min(row.participacao, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/70">
        <p className="text-xs text-slate-400">
          Os saldos apresentados representam o resultado dentro do período
          filtrado.
        </p>
      </div>
    </div>
  );
}
