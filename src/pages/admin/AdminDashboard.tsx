import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectService } from "@/services/projectService";
import { reportService } from "@/services/reportService";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  ComposedChart, Line, ReferenceLine, Treemap,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { C, Tip, Section, CustomCard, KPI, DynamicHeatmap, TreemapCell } from "./dashboardUtils";
import AllProjectsDashboard from "./AllProjectsDashboard";

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

export default function AdminDashboard() {
  const currentYear = new Date().getFullYear().toString();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"primary" | "secondary">("primary");

  const { data: projects = [] } = useQuery({
    queryKey: ["adminProjects"],
    queryFn: projectService.getAllProjects,
  });

  const { data: dailyEntries = [] } = useQuery({
    queryKey: ["reportDaily", selectedProjectId],
    queryFn: () => reportService.getDailyReport(
      selectedProjectId !== "all" ? { project_id: selectedProjectId } : {}
    ),
  });

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    dailyEntries.forEach((e: any) => { if (e.date) years.add(e.date.substring(0, 4)); });
    const sorted = Array.from(years).sort((a, b) => b.localeCompare(a));
    return sorted.length > 0 ? sorted : [currentYear];
  }, [dailyEntries, currentYear]);

  const availableMonths = useMemo(() => {
    if (selectedYear === "all") return [];
    const months = new Set<string>();
    dailyEntries.forEach((e: any) => { if (e.date?.startsWith(selectedYear)) months.add(e.date.substring(5, 7)); });
    return ALL_MONTHS.filter(m => months.has(m.value));
  }, [dailyEntries, selectedYear]);

  useEffect(() => {
    if (selectedYear !== "all" && !availableYears.includes(selectedYear)) {
      setSelectedYear("all"); setSelectedMonth("all");
    } else if (selectedMonth !== "all" && !availableMonths.find(m => m.value === selectedMonth)) {
      setSelectedMonth("all");
    }
  }, [selectedProjectId, availableYears, availableMonths, selectedYear, selectedMonth]);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (selectedProjectId !== "all") f.project_id = selectedProjectId;
    // Custom date range takes priority
    if (startDate || endDate) {
      if (startDate) f.start_date = startDate;
      if (endDate) f.end_date = endDate;
    } else if (selectedYear !== "all") {
      if (selectedMonth !== "all") {
        f.start_date = `${selectedYear}-${selectedMonth}-01`;
        f.end_date = `${selectedYear}-${selectedMonth}-${new Date(+selectedYear, +selectedMonth, 0).getDate()}`;
      } else {
        f.start_date = `${selectedYear}-01-01`;
        f.end_date = `${selectedYear}-12-31`;
      }
    }
    return f;
  }, [selectedProjectId, selectedYear, selectedMonth, startDate, endDate]);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["analyticsSummary", filters],
    queryFn: () => reportService.getAnalyticsSummary(filters),
    enabled: selectedProjectId !== "all",
  });

  // ── Derived data ──
  const sortedDailyCategories = useMemo(() =>
    [...(summary?.daily_categories || [])].sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    [summary?.daily_categories]);

  const sortedDailySummary = useMemo(() =>
    [...(summary?.daily_summary || [])].sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    [summary?.daily_summary]);

  const categoryKeys = useMemo(() => {
    const keys = new Set<string>();
    sortedDailyCategories.forEach((d: any) => Object.keys(d).forEach(k => { if (k !== "date") keys.add(k); }));
    return Array.from(keys);
  }, [sortedDailyCategories]);

  const taskCategoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    summary?.treemap_data?.children?.forEach((cat: any) => {
      cat.children?.forEach((task: any) => { m[task.name] = cat.name; });
    });
    return m;
  }, [summary?.treemap_data]);

  const employeesPerDay = useMemo(() => {
    const m: Record<string, number> = {};
    (summary?.heatmap || []).forEach((u: any) => {
      (u.data || []).forEach((d: any) => { m[d.date] = (m[d.date] || 0) + 1; });
    });
    return m;
  }, [summary?.heatmap]);

  const dailyTimelineData = useMemo(() =>
    sortedDailySummary.map((d: any) => ({ ...d, employees: employeesPerDay[d.date] || 0 })),
    [sortedDailySummary, employeesPerDay]);

  const taskHoursAscending = useMemo(() =>
    [...(summary?.task_totals || [])].reverse(),
    [summary?.task_totals]);

  const treemapFormatted = useMemo(() => {
    if (!summary?.treemap_data?.children) return [];
    const res: any[] = [];
    summary.treemap_data.children.forEach((cat: any) => {
      cat.children?.forEach((task: any) => { res.push({ name: task.name, size: task.value, cat: cat.name }); });
    });
    return res;
  }, [summary]);

  const totalHours = summary?.user_totals?.reduce((s: number, r: any) => s + r.hours, 0) || 0;
  const totalEntries = summary?.daily_summary?.reduce((s: number, r: any) => s + r.count, 0) || 0;
  const totalKm = summary?.logistics_km?.reduce((s: number, r: any) => s + r.personal_km, 0) || 0;
  const totalDietas = summary?.dietas_summary?.reduce((s: number, r: any) => s + r.yes, 0) || 0;
  const totalTravelHours = (summary?.travel_hours || []).reduce((s: number, r: any) => s + r.travel_hours, 0);
  const employeeCount = summary?.user_totals?.length || 0;
  const meanHours = totalHours / Math.max(1, employeeCount);
  const meanDailyHours = totalHours / Math.max(1, sortedDailySummary.length);
  const maxEmpHours = Math.max(...(summary?.user_totals?.map((u: any) => u.hours) || [1]), 1);

  const currentProject = projects.find((p: any) => p.id === selectedProjectId);
  const kmRate = currentProject?.km_rate ?? 0.19;
  const totalKmCost = totalKm * kmRate;
  const totalDietasCost = summary?.dietas_summary?.reduce((s: number, r: any) => s + (r.cost || 0), 0) || 0;
  const totalLogCost = totalKmCost + totalDietasCost;

  const projectLabel = currentProject ? `[${currentProject.code}] ${currentProject.name}` : "";
  const periodLabel = startDate || endDate
    ? `${startDate || "∞"} → ${endDate || "∞"}`
    : selectedYear === "all" ? "Histórico total"
      : selectedMonth !== "all"
        ? `${ALL_MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
        : selectedYear;

  // Filters without project_id (for all-projects view)
  const globalFilters = useMemo(() => {
    const f: Record<string, string> = { ...filters };
    delete f.project_id;
    return f;
  }, [filters]);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "system-ui, sans-serif" }}>

      {/* ── Sticky header ── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "16px 28px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ color: C.dim, fontSize: 13 }}>
            {selectedProjectId === "all"
              ? <span>Vista global · <b style={{ color: C.text }}>{projects.length} proyectos</b> · {periodLabel}</span>
              : <span>Proyecto <b style={{ color: C.accent }}>{projectLabel}</b> · {periodLabel}
                {totalEntries > 0 && <> · {totalEntries} fichajes · {employeeCount} empleados</>}
              </span>
            }
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 w-full lg:w-auto">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full lg:w-[200px] h-9 bg-card">
                  <SelectValue placeholder="Proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>[{p.code}] {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full lg:w-[120px] h-9 bg-card">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Histórico</SelectItem>
                  {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={selectedYear === "all" || !!startDate || !!endDate}>
                <SelectTrigger className="w-full lg:w-[140px] h-9 bg-card">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el año</SelectItem>
                  {availableMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
              <div className="flex items-center gap-1.5 w-full lg:w-auto min-w-0">
                <span className="text-[10px] font-semibold text-slate-500 uppercase w-12 lg:w-auto">Desde</span>
                <input type="date" value={startDate}
                  onChange={e => { setStartDate(e.target.value); if (e.target.value) { setSelectedYear("all"); setSelectedMonth("all"); } }}
                  className="h-9 px-2 rounded-md border border-slate-200 text-xs bg-card text-slate-900 w-full lg:w-auto flex-1 lg:flex-initial"
                />
              </div>
              <div className="flex items-center gap-1.5 w-full lg:w-auto min-w-0">
                <span className="text-[10px] font-semibold text-slate-500 uppercase w-12 lg:w-auto">Hasta</span>
                <input type="date" value={endDate}
                  onChange={e => { setEndDate(e.target.value); if (e.target.value) { setSelectedYear("all"); setSelectedMonth("all"); } }}
                  className="h-9 px-2 rounded-md border border-slate-200 text-xs bg-card text-slate-900 w-full lg:w-auto flex-1 lg:flex-initial"
                />
              </div>
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="text-red-500 text-xs font-bold border-0 bg-transparent cursor-pointer px-1 self-end lg:self-auto"
                >✕</button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs only for per-project view */}
        {selectedProjectId !== "all" && (
          <div style={{ display: "flex", gap: 0, marginTop: 12 }}>
            {(["primary", "secondary"] as const).map((t, i) => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: activeTab === t ? C.accent : C.dim,
                padding: "8px 20px", fontSize: 13, fontWeight: 600,
                borderBottom: activeTab === t ? `2px solid ${C.accent}` : "2px solid transparent",
              }}>
                {i === 0 ? "◉ Principales" : "◎ Secundarias"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════ ALL PROJECTS VIEW ══════════════ */}
      {selectedProjectId === "all" && (
        <AllProjectsDashboard filters={globalFilters} projects={projects} />
      )}

      {/* ══════════════ PER-PROJECT VIEW ══════════════ */}
      {selectedProjectId !== "all" && (
        <div style={{ padding: "20px 28px", maxWidth: 1200, margin: "0 auto" }}>

          {loadingSummary && (
            <div style={{ padding: "60px 0", textAlign: "center", color: C.dim }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Cargando datos del proyecto…</div>
            </div>
          )}

          {!loadingSummary && activeTab === "primary" && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                <KPI 
                  label="Total Horas" 
                  val={`${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`} 
                  unit="" 
                  color={C.accent} 
                  sub={`${employeeCount} empleados activos`} 
                />
                <KPI label="Fichajes" val={totalEntries.toLocaleString()} unit="" color={C.accent2} sub={`Ø ${(totalEntries / Math.max(1, sortedDailySummary.length)).toFixed(1)} / día`} />
                <KPI label="Empleados" val={employeeCount} unit="" color={C.green} sub="Con actividad" />
                <KPI label="KM Particular" val={totalKm.toLocaleString("es-ES", { maximumFractionDigits: 0 })} unit="km" color={C.amber} sub={`${totalKmCost.toLocaleString("es-ES", { maximumFractionDigits: 1 })}€ (${kmRate}€/km)`} />
                <KPI label="Coste Logístico" val={Math.round(totalLogCost).toLocaleString("es-ES")} unit="€" color={C.red} sub={`${totalDietas} dietas`} />
                <KPI 
                  label="H. en Viajes" 
                  val={`${Math.floor(totalTravelHours)}h ${Math.round((totalTravelHours % 1) * 60)}m`} 
                  unit="" 
                  color={C.teal} 
                  sub="Desplazamientos acum." 
                />
              </div>

              {/* 01 – Heatmap */}
              <Section num="01" title="Heatmap Empleado × Día" sub="Control diario de fichajes. Rojo = día con más de 10h sumadas." badge="CONTROL Nº1" badgeColor={C.pink} />
              <CustomCard><DynamicHeatmap data={summary?.heatmap || []} /></CustomCard>

              {/* 02 – Stacked area by category */}
              <Section num="02" title="Carga Diaria por Categoría" sub="Distribución Oficina / Planta / Taller por día. Detecta cambios de fase." badge="TENDENCIA" badgeColor={C.accent} />
              <CustomCard>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={sortedDailyCategories} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.catOficina} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={C.catOficina} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.catPlanta} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={C.catPlanta} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.catTaller} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={C.catTaller} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="date" stroke={C.dim} fontSize={10}
                      tickFormatter={v => (v || "").split("-").pop() || ""} minTickGap={18} />
                    <YAxis stroke={C.dim} fontSize={10} unit="h" />
                    <Tooltip content={<Tip />} />
                    {categoryKeys.map(k => {
                      const kl = k.toLowerCase(); const isO = kl.includes("oficina"); const isP = kl.includes("planta");
                      const color = isO ? C.catOficina : isP ? C.catPlanta : C.catTaller;
                      return (
                        <Area key={k} type="monotone" dataKey={k} stackId="1"
                          stroke={color} strokeWidth={2}
                          fill={isO ? "url(#gO)" : isP ? "url(#gP)" : "url(#gT)"}
                          name={k} />
                      );
                    })}
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CustomCard>

              {/* 03 – Employee hours */}
              <Section num="03" title="Horas Totales por Empleado"
                sub={`La línea marca la media del equipo (${meanHours.toFixed(1)}h).`}
                badge="CARGA" badgeColor={C.accent2} />
              <CustomCard>
                <ResponsiveContainer width="100%" height={Math.max(200, employeeCount * 44)}>
                  <BarChart data={summary?.user_totals || []} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                    <XAxis type="number" stroke={C.dim} fontSize={10} unit="h" />
                    <YAxis type="category" dataKey="name" stroke={C.dim} fontSize={11} width={130} />
                    <Tooltip content={<Tip />} />
                    <ReferenceLine x={meanHours} stroke={C.amber} strokeDasharray="5 3"
                      label={{ value: `Media ${meanHours.toFixed(1)}h`, fill: C.amber, fontSize: 10, position: "top" }} />
                    <Bar dataKey="hours" name="Horas" radius={[0, 6, 6, 0]}>
                      {summary?.user_totals?.map((e: any, i: number) => (
                        <Cell key={i} fill={e.hours > meanHours * 1.2 ? C.pink : C.accent} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CustomCard>

              {/* 04 – Task hours */}
              <Section num="04" title="Horas por Tarea"
                sub="Coloreado por categoría: azul = Oficina/Diseño, naranja = Planta Cliente, verde = Taller."
                badge="DESGLOSE" badgeColor={C.green} />
              <CustomCard>
                <ResponsiveContainer width="100%" height={Math.max(240, taskHoursAscending.length * 30)}>
                  <BarChart data={taskHoursAscending} layout="vertical" barCategoryGap="12%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                    <XAxis type="number" stroke={C.dim} fontSize={10} unit="h" />
                    <YAxis type="category" dataKey="name" stroke={C.dim} fontSize={10} width={210} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="hours" name="Horas" radius={[0, 6, 6, 0]}>
                      {taskHoursAscending.map((t: any, i: number) => {
                        const cat = (taskCategoryMap[t.name] || "").toLowerCase();
                        const color = cat.includes("oficina") ? C.catOficina
                          : cat.includes("planta") ? C.catPlanta : C.catTaller;
                        return <Cell key={i} fill={color} fillOpacity={0.78} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                  {[["Oficina/Diseño", C.catOficina], ["Taller", C.catTaller], ["Planta Cliente", C.catPlanta]].map(([n, c]) => (
                    <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: c, opacity: 0.78 }} />
                      <span style={{ fontSize: 11, color: C.dim }}>{n}</span>
                    </div>
                  ))}
                </div>
              </CustomCard>

              {/* 05 – Daily timeline */}
              <Section num="05" title="Línea Temporal: Horas + Fichajes + Empleados"
                sub="Barras = horas totales, línea = nº fichajes, línea discontinua = empleados activos."
                badge="ACTIVIDAD" badgeColor={C.teal} />
              <CustomCard>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={dailyTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="date" stroke={C.dim} fontSize={10}
                      tickFormatter={v => (v || "").split("-").pop() || ""} minTickGap={18} />
                    <YAxis yAxisId="h" stroke={C.dim} fontSize={10} unit="h" />
                    <YAxis yAxisId="fj" orientation="right" stroke={C.accent2} fontSize={10} />
                    <Tooltip content={<Tip />} />
                    <ReferenceLine yAxisId="h" y={meanDailyHours} stroke={C.amber} strokeDasharray="4 4"
                      label={{ value: `Media ${meanDailyHours.toFixed(1)}h`, fill: C.amber, fontSize: 9 }} />
                    <Bar yAxisId="h" dataKey="hours" name="Horas" fill={C.accent} fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="fj" type="monotone" dataKey="count" name="Fichajes"
                      stroke={C.accent2} strokeWidth={2.5}
                      dot={{ r: 3, fill: C.accent2, strokeWidth: 2, stroke: "#fff" }} />
                    <Line yAxisId="fj" type="monotone" dataKey="employees" name="Empleados"
                      stroke={C.green} strokeWidth={2} strokeDasharray="5 3"
                      dot={{ r: 3, fill: C.green, strokeWidth: 2, stroke: "#fff" }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CustomCard>
            </>
          )}

          {!loadingSummary && activeTab === "secondary" && (
            <>
              {/* 06 – Category donut */}
              <Section num="06" title="Distribución Oficina / Planta / Taller"
                sub="Vista macro del esfuerzo por categoría de trabajo." />
              <CustomCard>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 48, flexWrap: "wrap", padding: "10px 0" }}>
                  <PieChart width={240} height={240}>
                    <Pie
                      data={summary?.category_distribution || []}
                      cx={115} cy={115}
                      innerRadius={55} outerRadius={100}
                      paddingAngle={3}
                      dataKey="value" nameKey="name"
                      stroke="none"
                    >
                      {(summary?.category_distribution || []).map((c: any, i: number) => {
                        const nl = (c.name || "").toLowerCase();
                        const color = nl.includes("oficina") ? C.catOficina
                          : nl.includes("planta") ? C.catPlanta : C.catTaller;
                        return <Cell key={i} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {(summary?.category_distribution || []).map((c: any) => {
                      const nl = (c.name || "").toLowerCase();
                      const color = nl.includes("oficina") ? C.catOficina
                        : nl.includes("planta") ? C.catPlanta : C.catTaller;
                      const pct = totalHours > 0 ? Math.round(c.value / totalHours * 100) : 0;
                      return (
                        <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, background: color, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: C.dim }}>
                              <b style={{ color, fontSize: 16 }}>{c.value.toFixed(1)}h</b>
                              {" · "}{pct}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CustomCard>


              {/* 07 – Logistic detailed cost */}
              <Section num="07" title="Desglose de Coste Logístico" sub={`Basado en ratios del proyecto: ${kmRate}€/km y tickets de dieta adjuntos.`} badge="COSTE" badgeColor={C.red} />
              <CustomCard>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                  {[
                    ["Reembolso KM", `${totalKmCost.toLocaleString("es-ES", { maximumFractionDigits: 1 })}€`, C.amber, "#fffbeb", "#fde68a"],
                    ["Coste Dietas", `${totalDietasCost.toLocaleString("es-ES", { maximumFractionDigits: 1 })}€`, C.catTaller, "#f0fdfa", "#99f6e4"],
                    ["Total Logístico", `${totalLogCost.toLocaleString("es-ES", { maximumFractionDigits: 1 })}€`, C.red, "#fef2f2", "#fecaca"],
                  ].map(([label, val, color, bg, border]) => (
                    <div key={label as string} style={{ flex: 1, minWidth: 200, textAlign: "center", padding: "14px", background: bg as string, borderRadius: 10, border: `1px solid ${border}` }}>
                      <div style={{ fontSize: 10, color: color as string, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: color as string }}>{val}</div>
                    </div>
                  ))}
                </div>
              </CustomCard>

              {/* 08 – Dietas */}
              <Section num="08" title="Dietas por Empleado"
                sub="Fichajes en Planta Cliente: días con dieta SÍ vs NO." />
              <CustomCard>
                {(summary?.dietas_summary || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={summary?.dietas_summary || []} barCategoryGap="22%">
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis dataKey="name" stroke={C.dim} fontSize={11} />
                      <YAxis stroke={C.dim} fontSize={10} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="yes" name="Con dieta" fill={C.green} fillOpacity={0.75} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="no" name="Sin dieta" fill="#94a3b8" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ textAlign: "center", padding: "30px 0", color: C.dim }}>Sin datos de dietas en esta selección.</p>
                )}
              </CustomCard>


              {/* 10 – Travel time by employee */}
              <Section num="10" title="Tiempo en Desplazamientos por Empleado"
                sub="Horas acumuladas en viajes según tipo de trayecto (ida / vuelta / ambos) y tiempos configurados en el proyecto." badge="VIAJES" badgeColor={C.teal} />
              <CustomCard>
                {(summary?.travel_hours || []).length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={Math.max(160, (summary?.travel_hours?.length || 1) * 52)}>
                      <BarChart
                        data={summary?.travel_hours || []}
                        layout="vertical" barCategoryGap="25%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                        <XAxis type="number" stroke={C.dim} fontSize={10} unit=" h" />
                        <YAxis type="category" dataKey="name" stroke={C.dim} fontSize={12} width={140} />
                        <Tooltip content={<Tip />} />
                        <Bar dataKey="travel_hours" name="Horas en viaje" fill={C.teal} fillOpacity={0.8} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 10, padding: "10px 14px", background: "#f0fdfa", borderRadius: 8, border: "1px solid #99f6e4", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, color: C.teal }}>Total horas en desplazamientos:</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: C.teal }}>{totalTravelHours.toFixed(1)} h</span>
                    </div>
                  </>
                ) : (
                  <p style={{ textAlign: "center", padding: "30px 0", color: C.dim }}>Sin datos de desplazamiento con tiempo de viaje configurado en el proyecto.</p>
                )}
              </CustomCard>

              {/* 11 – Summary table */}
              <Section num="11" title="Tabla Resumen: Empleado × Métricas"
                sub="Vista consolidada para el informe mensual." />
              <CustomCard>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                        {["Empleado", "Horas", "Asistencias", "KM Part.", "Dietas SÍ", "h/asist. Ø"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary?.user_totals?.map((ut: any, idx: number) => {
                        const log = summary.logistics_km?.find((l: any) => l.name === ut.name);
                        const dtta = summary.dietas_summary?.find((d: any) => d.name === ut.name);
                        const asist = summary.heatmap?.find((h: any) => h.user === ut.name)?.data?.length || 1;
                        const avg = ut.hours / asist;
                        return (
                          <tr key={ut.name} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 0 ? "#fff" : C.bg }}>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: C.text }}>{ut.name}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 70, height: 6, background: C.border, borderRadius: 3 }}>
                                  <div style={{ width: `${(ut.hours / maxEmpHours) * 100}%`, height: "100%", background: C.accent, borderRadius: 3 }} />
                                </div>
                                <b>{ut.hours.toFixed(1)}h</b>
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px", color: C.dim }}>{asist}</td>
                            <td style={{ padding: "10px 12px", color: log?.personal_km > 0 ? C.amber : C.dim, fontWeight: log?.personal_km > 0 ? 700 : 400 }}>
                              {log?.personal_km > 0 ? `${log.personal_km.toFixed(1)} km` : "—"}
                            </td>
                            <td style={{ padding: "10px 12px", color: dtta?.yes > 0 ? C.green : C.dim, fontWeight: dtta?.yes > 0 ? 700 : 400 }}>
                              {dtta?.yes > 0 ? dtta.yes : "—"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{
                                background: avg > 14 ? "#fef2f2" : "#ecfdf5",
                                color: avg > 14 ? C.red : C.green,
                                padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                              }}>{avg.toFixed(1)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CustomCard>
            </>
          )}
        </div>
      )}
    </div>
  );
}
