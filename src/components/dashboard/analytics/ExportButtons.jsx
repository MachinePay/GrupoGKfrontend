import { FileSpreadsheet, FileText } from "lucide-react";

export default function ExportButtons({
  onExportPDF,
  onExportExcel,
  isLoading = false,
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onExportPDF}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white text-sm rounded font-medium transition-colors"
      >
        <FileText size={16} />
        PDF
      </button>
      <button
        onClick={onExportExcel}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white text-sm rounded font-medium transition-colors"
      >
        <FileSpreadsheet size={16} />
        Excel
      </button>
    </div>
  );
}
