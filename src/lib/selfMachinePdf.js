import jsPDF from "jspdf";
import { formatCurrency, formatDate } from "./utils.js";

const PRIMARY = [18, 18, 18];
const ACCENT = [224, 140, 29];
const LIGHT = [245, 245, 245];
const SELF_MACHINE_LOGO_PATH = "/logoSelfmachine.png";

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadImageAsDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao carregar imagem: ${url}`);
  }
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

// Helper para desenhar tabelas sem plugin
function drawSimpleTable(doc, startY, headers, rows, options = {}) {
  const {
    cellWidth = 60,
    headerBgColor = PRIMARY,
    textColor = [0, 0, 0],
  } = options;
  const colWidths = options.colWidths || [cellWidth, 186 - cellWidth];
  const lineHeight = 8;
  const padding = 2;

  let y = startY;

  // Desenhar headers
  doc.setFillColor(...headerBgColor);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);

  let x = 12;
  for (let i = 0; i < headers.length; i++) {
    doc.rect(x, y, colWidths[i], lineHeight, "F");
    doc.text(headers[i], x + padding, y + lineHeight - padding);
    x += colWidths[i];
  }

  y += lineHeight;

  // Desenhar linhas
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.setFontSize(9);

  let alternateRow = false;
  for (const row of rows) {
    if (alternateRow) {
      doc.setFillColor(250, 250, 250);
      doc.rect(12, y, 186, lineHeight, "F");
    }

    x = 12;
    for (let i = 0; i < row.length; i++) {
      doc.text(String(row[i]), x + padding, y + lineHeight - padding);
      x += colWidths[i];
    }

    y += lineHeight;
    alternateRow = !alternateRow;
  }

  return y;
}

async function drawHeader(doc, contrato, title) {
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, width, 40, "F");

  // Logo SelfMachine fixa no lado esquerdo
  try {
    const selfMachineLogoDataUrl = await loadImageAsDataUrl(
      SELF_MACHINE_LOGO_PATH,
    );
    doc.addImage(selfMachineLogoDataUrl, "PNG", 8, 4, 70, 32);
  } catch {
    // Fallback para texto se a imagem local nao carregar
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SELFMACHINE", 12, 14);

    doc.setTextColor(...ACCENT);
    doc.setFontSize(10);
    doc.text("Centro de Comando SaaS - Grupo GK", 12, 20);
  }

  const hasLogo = contrato.logoParceiraUrl?.startsWith("data:image");

  if (hasLogo) {
    // Logo only on right — no overlapping text
    try {
      doc.addImage(contrato.logoParceiraUrl, "PNG", width - 50, 4, 40, 32);
    } catch {
      // Ignora erro de imagem invalida; mostra texto como fallback
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, width - 12, 14, { align: "right" });
    }
  } else {
    // Sem logo: mostra titulo e cliente no lado direito
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, width - 12, 14, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT);
    doc.setFontSize(9);
    doc.text(contrato.nomeCliente || "Cliente", width - 12, 22, {
      align: "right",
    });
  }
}

export async function generatePedidoPagamentoPdf(contrato) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await drawHeader(doc, contrato, "Pedido de Pagamento / Recibo");

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Dados do Pedido", 12, 58);

  const tableData = [
    ["Numero do PC", contrato.numeroPc || "-"],
    ["Data de Emissao", formatDate(contrato.dataEmissao)],
    ["Cliente", contrato.nomeCliente || "-"],
    ["Sistema", contrato.nomeSistema || "-"],
    ["Vendedor", contrato.vendedor || "-"],
    ["Tipo de Remessa", contrato.tipoRemessa || "-"],
    ["Plano", contrato.tipoPlano || "-"],
    [
      "Desenvolvimento (Setup)",
      formatCurrency(contrato.valorDesenvolvimento || 0),
    ],
    ["Mensalidade", formatCurrency(contrato.valorMensalidade || 0)],
    ["Inicio da Mensalidade", formatDate(contrato.dataInicioMensalidade)],
    ["Condicoes de Pagamento", contrato.condicoesPagamento || "-"],
    ["Meio de Pagamento", contrato.meioPagamento || "-"],
  ];

  // Add PIX key if payment method is PIX
  if (contrato.meioPagamento?.toUpperCase() === "PIX") {
    tableData.push(["Chave PIX", contrato.chavePix || "-"]);
  }

  tableData.push([
    "Status Atual",
    `${contrato.statusSistema || "-"} / ${contrato.statusMensalidade || "-"}`,
  ]);

  let y = drawSimpleTable(doc, 61, ["Campo", "Valor"], tableData, {
    cellWidth: 60,
    headerBgColor: PRIMARY,
  });
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Descricao do Servico", 12, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(contrato.descricao || "Sem descricao informada.", 12, y, {
    maxWidth: 186,
  });

  const assinaturaY = 270;
  doc.setDrawColor(120, 120, 120);
  doc.line(12, assinaturaY, 85, assinaturaY);
  doc.line(125, assinaturaY, 198, assinaturaY);
  doc.setFontSize(9);
  doc.text("SelfMachine - Responsavel", 12, assinaturaY + 4);
  doc.text("Cliente / Parceiro", 125, assinaturaY + 4);

  doc.save(
    `pedido-pagamento-${(contrato.nomeCliente || "cliente").toLowerCase()}.pdf`,
  );
}

export async function generatePropostaSistemaPdf(contrato) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await drawHeader(doc, contrato, "Proposta Comercial de Sistema");

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(contrato.nomeSistema || "Projeto SaaS", 12, 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Cliente: ${contrato.nomeCliente || "-"}`, 12, 62);
  doc.text(`Vendedor: ${contrato.vendedor || "-"}`, 12, 68);
  doc.text(`Plano: ${contrato.tipoPlano || "-"}`, 12, 74);

  doc.setFillColor(250, 244, 230);
  doc.rect(12, 82, 186, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT);
  doc.text("Escopo Tecnico", 16, 89);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(35, 35, 35);
  doc.text(
    contrato.descricao ||
      "Desenvolvimento de sistema web com foco operacional, financeiro e escalabilidade em modelo SaaS multi-tenant.",
    16,
    95,
    { maxWidth: 176 },
  );

  const propostaTableData = [
    ["Tipo de Remessa", contrato.tipoRemessa || "-"],
    [
      "Data de Inicio da Mensalidade",
      formatDate(contrato.dataInicioMensalidade),
    ],
    ["Condicoes de Pagamento", contrato.condicoesPagamento || "-"],
    ["Meio de Pagamento", contrato.meioPagamento || "-"],
    [
      "Investimento de Setup",
      formatCurrency(contrato.valorDesenvolvimento || 0),
    ],
    ["Mensalidade", formatCurrency(contrato.valorMensalidade || 0)],
  ];

  let tableY = drawSimpleTable(
    doc,
    118,
    ["Item", "Detalhe"],
    propostaTableData,
    {
      cellWidth: 62,
      headerBgColor: PRIMARY,
    },
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT);
  doc.text("Prazos", 12, tableY + 12);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(
    contrato.prazosDescricao ||
      "Kickoff imediato apos aceite. Entrega inicial prevista em ate 30 dias, com evolucao continua sob contrato mensal.",
    12,
    tableY + 18,
    { maxWidth: 186 },
  );

  doc.save(
    `proposta-sistema-${(contrato.nomeCliente || "cliente").toLowerCase()}.pdf`,
  );
}
