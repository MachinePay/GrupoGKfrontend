import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatCurrency, formatDate } from "./utils.js";

const PRIMARY = [18, 18, 18];
const ACCENT = [224, 140, 29];
const LIGHT = [245, 245, 245];

function drawHeader(doc, contrato, title) {
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, width, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SELFMACHINE", 12, 14);

  doc.setTextColor(...ACCENT);
  doc.setFontSize(10);
  doc.text("Centro de Comando SaaS - Grupo GK", 12, 20);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.text(title, width - 12, 14, { align: "right" });
  doc.setTextColor(...LIGHT);
  doc.text(contrato.nomeCliente || "Cliente", width - 12, 20, {
    align: "right",
  });

  if (contrato.logoParceiraUrl?.startsWith("data:image")) {
    try {
      doc.addImage(contrato.logoParceiraUrl, "PNG", width - 34, 6, 18, 18);
    } catch {
      // Ignora erro de imagem invalida.
    }
  }
}

export function generatePedidoPagamentoPdf(contrato) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, contrato, "Pedido de Pagamento / Recibo");

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Dados do Pedido", 12, 44);

  doc.autoTable({
    startY: 47,
    head: [["Campo", "Valor"]],
    body: [
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
      [
        "Status Atual",
        `${contrato.statusSistema || "-"} / ${contrato.statusMensalidade || "-"}`,
      ],
    ],
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    styles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 120 },
    },
  });

  let y = doc.lastAutoTable.finalY + 8;

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

export function generatePropostaSistemaPdf(contrato) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, contrato, "Proposta Comercial de Sistema");

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(contrato.nomeSistema || "Projeto SaaS", 12, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Cliente: ${contrato.nomeCliente || "-"}`, 12, 52);
  doc.text(`Vendedor: ${contrato.vendedor || "-"}`, 12, 58);
  doc.text(`Plano: ${contrato.tipoPlano || "-"}`, 12, 64);

  doc.setFillColor(250, 244, 230);
  doc.rect(12, 72, 186, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT);
  doc.text("Escopo Tecnico", 16, 80);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(35, 35, 35);
  doc.text(
    contrato.descricao ||
      "Desenvolvimento de sistema web com foco operacional, financeiro e escalabilidade em modelo SaaS multi-tenant.",
    16,
    86,
    { maxWidth: 176 },
  );

  doc.autoTable({
    startY: 108,
    head: [["Item", "Detalhe"]],
    body: [
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
    ],
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
    },
    bodyStyles: {
      textColor: [20, 20, 20],
    },
    columnStyles: {
      0: { cellWidth: 62, fontStyle: "bold" },
      1: { cellWidth: 118 },
    },
  });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT);
  doc.text("Prazos", 12, doc.lastAutoTable.finalY + 12);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(
    "Kickoff imediato apos aceite. Entrega inicial prevista em ate 30 dias, com evolucao continua sob contrato mensal.",
    12,
    doc.lastAutoTable.finalY + 18,
    { maxWidth: 186 },
  );

  doc.save(
    `proposta-sistema-${(contrato.nomeCliente || "cliente").toLowerCase()}.pdf`,
  );
}
