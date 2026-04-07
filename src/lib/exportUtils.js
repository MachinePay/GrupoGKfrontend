import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatCurrency } from "./utils.js";

/**
 * Exporta dados de analytics para PDF
 */
export function exportToPDF(dados, filtros) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 10;

  // Título
  doc.setFontSize(16);
  doc.text(
    "Relatório de Analytics & Performance - Grupo GK",
    pageWidth / 2,
    yPosition,
    {
      align: "center",
    },
  );
  yPosition += 10;

  // Período
  doc.setFontSize(10);
  doc.setTextColor(100);
  const periodo =
    filtros.dataInicio && filtros.dataFim
      ? `${filtros.dataInicio} a ${filtros.dataFim}`
      : "Período não definido";
  doc.text(`Período: ${periodo}`, pageWidth / 2, yPosition, {
    align: "center",
  });
  yPosition += 8;

  // Métricas principais
  if (dados.metricas) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Indicadores Principais", 10, yPosition);
    yPosition += 8;

    const { burnRate, ticketMedio, margemContribuicao } = dados.metricas;
    const metricsTable = [
      ["Burn Rate Diário", formatCurrency(burnRate?.burnRateDiario || 0)],
      ["Burn Rate Mensal", formatCurrency(burnRate?.burnRateMensal || 0)],
      ["Ticket Médio", formatCurrency(ticketMedio?.ticketMedio || 0)],
      [
        "Margem de Contribuição",
        `${margemContribuicao?.percentualMargem || 0}%`,
      ],
    ];

    doc.autoTable({
      startY: yPosition,
      head: [["Métrica", "Valor"]],
      body: metricsTable,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    });

    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // Tabela de Contas
  if (dados.tabelas?.contas && dados.tabelas.contas.length > 0) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 10;
    }

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Performance de Contas Bancárias", 10, yPosition);
    yPosition += 8;

    const contasTable = dados.tabelas.contas.map((c) => [
      c.banco,
      c.conta,
      formatCurrency(c.saldoInicial),
      formatCurrency(c.entradas),
      formatCurrency(c.saidas),
      formatCurrency(c.saldoFinal),
      `${c.participacao}%`,
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [
        [
          "Banco",
          "Conta",
          "Saldo Inicial",
          "Entradas",
          "Saídas",
          "Saldo Final",
          "% Grupo",
        ],
      ],
      body: contasTable,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    });

    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // Ranking de Projetos
  if (
    dados.graficos?.rankingProjetos &&
    dados.graficos.rankingProjetos.length > 0
  ) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 10;
    }

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Ranking de Projetos (MaisQuiosque)", 10, yPosition);
    yPosition += 8;

    const projetosTable = dados.graficos.rankingProjetos.map((p) => [
      p.projeto,
      formatCurrency(p.recebido),
      formatCurrency(p.gasto),
      formatCurrency(p.lucroLiquido),
      `${p.margem}%`,
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [["Projeto", "Recebido", "Gasto", "Lucro", "Margem %"]],
      body: projetosTable,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    });
  }

  doc.save(`analytics-${new Date().toISOString().split("T")[0]}.pdf`);
}

/**
 * Exporta dados de analytics para Excel
 */
export function exportToExcel(dados) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Métricas
  if (dados.metricas) {
    const { burnRate, ticketMedio, margemContribuicao, pontoAtencao } =
      dados.metricas;
    const metricsData = [
      ["Indicador", "Valor"],
      ["Burn Rate Diário", burnRate?.burnRateDiario || 0],
      ["Burn Rate Mensal", burnRate?.burnRateMensal || 0],
      ["Ticket Médio", ticketMedio?.ticketMedio || 0],
      ["Margem de Contribuição (%)", margemContribuicao?.percentualMargem || 0],
      ["Margem de Contribuição (R$)", margemContribuicao?.margem || 0],
      ["Total de Receitas", ticketMedio?.total || 0],
      ["Quantidade de Transações", ticketMedio?.quantidade || 0],
      ["Ponto de Atenção", pontoAtencao?.categoria || "N/A"],
      ["Crescimento (%)", pontoAtencao?.crescimentoPercentual || 0],
    ];
    const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
    XLSX.utils.book_append_sheet(workbook, metricsSheet, "Métricas");
  }

  // Sheet 2: Performance de Contas
  if (dados.tabelas?.contas && dados.tabelas.contas.length > 0) {
    const contasData = [
      [
        "Banco",
        "Conta",
        "Saldo Inicial",
        "Entradas",
        "Saídas",
        "Saldo Final",
        "% Participação",
      ],
      ...dados.tabelas.contas.map((c) => [
        c.banco,
        c.conta,
        c.saldoInicial,
        c.entradas,
        c.saidas,
        c.saldoFinal,
        c.participacao,
      ]),
    ];
    const contasSheet = XLSX.utils.aoa_to_sheet(contasData);
    XLSX.utils.book_append_sheet(workbook, contasSheet, "Contas");
  }

  // Sheet 3: Ranking de Projetos
  if (
    dados.graficos?.rankingProjetos &&
    dados.graficos.rankingProjetos.length > 0
  ) {
    const projetosData = [
      ["Projeto", "Recebido", "Gasto", "Lucro Líquido", "Margem %"],
      ...dados.graficos.rankingProjetos.map((p) => [
        p.projeto,
        p.recebido,
        p.gasto,
        p.lucroLiquido,
        p.margem,
      ]),
    ];
    const projetosSheet = XLSX.utils.aoa_to_sheet(projetosData);
    XLSX.utils.book_append_sheet(workbook, projetosSheet, "Projetos");
  }

  // Sheet 4: Composição de Despesas
  if (
    dados.graficos?.composicaoDespesas &&
    dados.graficos.composicaoDespesas.length > 0
  ) {
    const despesasData = [
      ["Categoria", "Valor", "% do Total"],
      ...dados.graficos.composicaoDespesas.map((d) => [
        d.categoria,
        d.valor,
        d.percentual,
      ]),
    ];
    const despesasSheet = XLSX.utils.aoa_to_sheet(despesasData);
    XLSX.utils.book_append_sheet(workbook, despesasSheet, "Despesas");
  }

  // Sheet 5: Distribuição de Receitas
  if (
    dados.graficos?.distribuicaoReceitas &&
    dados.graficos.distribuicaoReceitas.length > 0
  ) {
    const receitasData = [
      ["Empresa", "Valor", "% do Total", "Quantidade"],
      ...dados.graficos.distribuicaoReceitas.map((r) => [
        r.empresa,
        r.valor,
        r.percentual,
        r.quantidade,
      ]),
    ];
    const receitasSheet = XLSX.utils.aoa_to_sheet(receitasData);
    XLSX.utils.book_append_sheet(workbook, receitasSheet, "Receitas");
  }

  // Sheet 6: Evolução
  if (dados.graficos?.evolucao && dados.graficos.evolucao.length > 0) {
    const evolucaoData = [
      ["Período", "Entradas", "Saídas", "Líquido"],
      ...dados.graficos.evolucao.map((e) => [
        e.periodo,
        e.entradas,
        e.saidas,
        e.liquido,
      ]),
    ];
    const evolucaoSheet = XLSX.utils.aoa_to_sheet(evolucaoData);
    XLSX.utils.book_append_sheet(workbook, evolucaoSheet, "Evolução");
  }

  XLSX.writeFile(
    workbook,
    `analytics-${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}
