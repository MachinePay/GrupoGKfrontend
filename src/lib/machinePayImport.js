import * as XLSX from "xlsx";

/**
 * Normaliza texto para comparar cabecalhos (sem acento/caixa/espacos extras).
 */
function chave(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const COLUNAS = {
  nome: ["nome do cliente", "cliente", "nome"],
  vencimento: ["data de vencimento", "vencimento", "dia de vencimento"],
  proprias: ["maquinas proprias", "maquinas"],
  plano36: ["maquinas plano 36", "plano 36"],
  valor: ["valor da mensalidade", "mensalidade"],
  valor36: ["valor da mensalidade 36", "mensalidade 36"],
  total: ["valor a pagar", "total"],
};

function numero(valor) {
  if (typeof valor === "number") return valor;
  const texto = String(valor ?? "")
    .replace(/[R$\s.]/g, "")
    .replace(",", ".");
  const n = Number(texto);
  return texto && !Number.isNaN(n) ? n : null;
}

/**
 * Separa nome e telefone do texto livre da planilha.
 * Ex.: "Cliente Jorge Pedroso (inova) *42-99855-4028" -> nome + "42998554028".
 */
function limparNome(bruto) {
  let nome = String(bruto ?? "")
    .replace(/\s+/g, " ") // \s cobre o espaco nao separavel da planilha
    .replace(/^\s*cliente\s+/i, "")
    .trim();

  let telefone = null;
  const fone = nome.match(/\(?\d{2}\)?[\s-]*\d{4,5}[\s-]*\d{4}/);
  if (fone) {
    const digitos = fone[0].replace(/\D/g, "");
    if (digitos.length >= 10 && digitos.length <= 11) {
      telefone = digitos;
      nome = nome.replace(fone[0], "");
      // Remove o ")" que sobra quando o telefone estava entre parenteses.
      if ((nome.match(/\)/g) || []).length > (nome.match(/\(/g) || []).length) {
        nome = nome.replace(/\(?\s*\)\s*$/, "").replace(/\s\)/, "");
      }
    }
  }

  nome = nome
    .replace(/\(\s*\)/g, "")
    .replace(/\*\s*\*/g, "")
    .replace(/[\s*]+$/g, "")
    .replace(/\s{2,}/g, " ")
    // Corrige acento maiusculo no meio da palavra vindo da planilha ("JosÉ" -> "José").
    .replace(/(?<=[a-zà-ÿ])[À-Ý]/g, (letra) => letra.toLowerCase())
    .trim();

  return { nome, telefone };
}

function diaDoVencimento(valor) {
  if (valor instanceof Date) return valor.getDate();
  const n = numero(valor);
  if (n && n >= 1 && n <= 31) return Math.trunc(n);
  return null;
}

/**
 * Le a planilha de controle Machine Pay e devolve clientes prontos para importar.
 * @param {File} arquivo
 * @returns {Promise<Array<object>>}
 */
export async function lerPlanilhaMachinePay(arquivo) {
  const buffer = await arquivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const idxCabecalho = linhas.findIndex((linha) =>
    linha.some((celula) => COLUNAS.nome.includes(chave(celula))),
  );
  if (idxCabecalho < 0) {
    throw new Error(
      'Cabeçalho não encontrado. A planilha precisa da coluna "Nome do Cliente".',
    );
  }

  const cabecalho = linhas[idxCabecalho].map(chave);
  const col = {};
  for (const [campo, nomes] of Object.entries(COLUNAS)) {
    // Prioriza o nome mais especifico (ex.: "valor da mensalidade 36").
    col[campo] = cabecalho.findIndex((h) => h === nomes[0]);
    if (col[campo] < 0) {
      col[campo] = cabecalho.findIndex((h) => nomes.includes(h));
    }
  }

  const clientes = [];
  for (const linha of linhas.slice(idxCabecalho + 1)) {
    const bruto = linha[col.nome];
    if (!bruto || !String(bruto).trim()) continue;

    const { nome, telefone } = limparNome(bruto);
    if (!nome) continue;

    const textoLinha = linha.map(chave).join(" ");
    const status = textoLinha.includes("inativo")
      ? "INATIVO"
      : textoLinha.includes("suspenso")
        ? "SUSPENSO"
        : "ATIVO";

    const maquinasProprias = Math.trunc(numero(linha[col.proprias]) ?? 0);
    const maquinasPlano36 = Math.trunc(numero(linha[col.plano36]) ?? 0);
    const valorMensalidade = numero(linha[col.valor]) ?? 0;
    const valorMensalidade36 = numero(linha[col.valor36]) ?? 0;
    const calculado =
      maquinasProprias * valorMensalidade + maquinasPlano36 * valorMensalidade36;
    const total = col.total >= 0 ? numero(linha[col.total]) : null;
    const valorFixo =
      total !== null && Math.abs(total - calculado) > 0.009 ? total : null;

    clientes.push({
      nome,
      telefone,
      diaVencimento: diaDoVencimento(linha[col.vencimento]),
      maquinasProprias,
      maquinasPlano36,
      valorMensalidade,
      valorMensalidade36,
      valorFixo,
      status,
      valorCalculado: valorFixo ?? calculado,
    });
  }

  return clientes;
}

/**
 * Exporta as cobrancas da competencia no mesmo formato da planilha original.
 */
export function exportarCobrancasExcel(cobrancas, rotuloCompetencia) {
  const linhas = cobrancas.map((c) => ({
    "Nome do Cliente": c.cliente?.nome,
    Telefone: c.cliente?.telefone || "",
    "Data de Vencimento": new Date(c.vencimento).toLocaleDateString("pt-BR"),
    "Maquinas Proprias": c.maquinasProprias,
    "Maquinas Plano 36": c.maquinasPlano36,
    "Valor da Mensalidade": c.valorMensalidade,
    "Valor da Mensalidade 36": c.valorMensalidade36,
    "Valor a pagar": c.valor,
    Situacao: c.situacao,
    "Pago em": c.pagoEm ? new Date(c.pagoEm).toLocaleDateString("pt-BR") : "",
    "Valor pago": c.valorPago ?? "",
    "Forma de pagamento": c.formaPagamento || "",
  }));

  const ws = XLSX.utils.json_to_sheet(linhas);
  ws["!cols"] = [{ wch: 45 }, { wch: 14 }, { wch: 14 }, ...Array(9).fill({ wch: 16 })];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cobrancas");
  XLSX.writeFile(wb, `Machine Pay ${rotuloCompetencia}.xlsx`);
}
