import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportService } from "@/services/reportService";
import { projectService } from "@/services/projectService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ALL_MONTHS = [
  { value: "01", label: "01 - Enero" },
  { value: "02", label: "02 - Febrero" },
  { value: "03", label: "03 - Marzo" },
  { value: "04", label: "04 - Abril" },
  { value: "05", label: "05 - Mayo" },
  { value: "06", label: "06 - Junio" },
  { value: "07", label: "07 - Julio" },
  { value: "08", label: "08 - Agosto" },
  { value: "09", label: "09 - Septiembre" },
  { value: "10", label: "10 - Octubre" },
  { value: "11", label: "11 - Noviembre" },
  { value: "12", label: "12 - Diciembre" },
];

const sanitizeFilenamePart = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

export default function ExportPage() {
  const currentYear = new Date().getFullYear().toString();

  const [isExporting, setIsExporting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: projects = [] } = useQuery({ queryKey: ["adminProjects"], queryFn: projectService.getAllProjects });

  // Fetch daily entries to know what dates actually have data
  const { data: dailyEntries = [] } = useQuery({
    queryKey: ["reportDaily", selectedProjectId],
    queryFn: () => reportService.getDailyReport(selectedProjectId !== "all" ? { project_id: selectedProjectId } : {})
  });

  // Calculate dynamic available years and months
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    dailyEntries.forEach(entry => {
      if (entry.date) years.add(entry.date.substring(0, 4));
    });
    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
    // If no data, just offer the current year as a fallback so it's not totally empty
    return sortedYears.length > 0 ? sortedYears : [currentYear];
  }, [dailyEntries, currentYear]);

  const availableMonths = useMemo(() => {
    if (selectedYear === "all") return [];

    const months = new Set<string>();
    dailyEntries.forEach(entry => {
      if (entry.date && entry.date.startsWith(selectedYear)) {
        months.add(entry.date.substring(5, 7));
      }
    });

    return ALL_MONTHS.filter(m => months.has(m.value));
  }, [dailyEntries, selectedYear]);

  // Reset year/month if the current selection is no longer valid for the newly selected project
  useEffect(() => {
    if (selectedYear !== "all" && !availableYears.includes(selectedYear)) {
      setSelectedYear("all");
      setSelectedMonth("all");
    } else if (selectedMonth !== "all" && !availableMonths.find(m => m.value === selectedMonth)) {
      setSelectedMonth("all");
    }
  }, [selectedProjectId, availableYears, availableMonths, selectedYear, selectedMonth]);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (selectedProjectId && selectedProjectId !== "all") {
      f.project_id = selectedProjectId;
    }
    // Custom date range takes priority
    if (startDate || endDate) {
      if (startDate) f.start_date = startDate;
      if (endDate) f.end_date = endDate;
    } else if (selectedYear && selectedYear !== "all") {
      if (selectedMonth && selectedMonth !== "all") {
        f.start_date = `${selectedYear}-${selectedMonth}-01`;
        const lastDay = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
        f.end_date = `${selectedYear}-${selectedMonth}-${lastDay}`;
      } else {
        f.start_date = `${selectedYear}-01-01`;
        f.end_date = `${selectedYear}-12-31`;
      }
    }
    return f;
  }, [selectedProjectId, selectedYear, selectedMonth, startDate, endDate]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const selectedProject = projects.find((p) => p.id === selectedProjectId);
      const projectPart = selectedProject
        ? sanitizeFilenamePart(`${selectedProject.code}_${selectedProject.name}`)
        : "export";

      let periodPart = "historico";
      if (startDate && endDate) {
        periodPart = startDate === endDate ? startDate : `${startDate}_a_${endDate}`;
      } else if (startDate) {
        periodPart = startDate;
      } else if (endDate) {
        periodPart = endDate;
      } else if (selectedYear !== "all" && selectedMonth !== "all") {
        periodPart = `${selectedYear}-${selectedMonth}`;
      } else if (selectedYear !== "all") {
        periodPart = selectedYear;
      }

      await reportService.exportXLSX(filters, `${projectPart}_${periodPart}.xlsx`);
      toast.success("¡Exportación descargada con éxito!");
    } catch (error) {
      toast.error("Error al exportar los datos");
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">Exportar Datos</h1>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Exportar a Excel (.xlsx)</CardTitle>
          <CardDescription>Descarga los registros de horas como archivo nativo de Excel con formato visual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Filtrar por Proyecto (Opcional)</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los proyectos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Filtrar por Año</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Filtrar por Mes</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={selectedYear === "all"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {availableMonths.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">O filtrar por rango de fechas exacto</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Desde</Label>
                  <Input type="date" value={startDate}
                    onChange={e => { setStartDate(e.target.value); if (e.target.value) { setSelectedYear("all"); setSelectedMonth("all"); } }}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Hasta</Label>
                  <Input type="date" value={endDate}
                    onChange={e => { setEndDate(e.target.value); if (e.target.value) { setSelectedYear("all"); setSelectedMonth("all"); } }}
                  />
                </div>
              </div>
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="text-xs text-destructive mt-2 hover:underline cursor-pointer"
                >Limpiar rango de fechas</button>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1.5">Las horas en el Excel se agregarán automáticamente agrupadas por Tarea.</p>
          </div>

          <Button onClick={handleExport} disabled={isExporting} className="w-full gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? "Exportando..." : "Descargar Excel Filtrado"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
