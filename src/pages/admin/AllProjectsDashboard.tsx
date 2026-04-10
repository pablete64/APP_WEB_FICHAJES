import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportService } from "@/services/reportService";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  ComposedChart, Line, Area, AreaChart, ReferenceLine,
  Treemap,
} from "recharts";
import { C, CHART_PALETTE, TREEMAP_PALETTE, calcTrend, Tip, Section, CustomCard, KPI, DynamicHeatmap, TreemapCell } from "./dashboardUtils";

const StatusBadge = ({ type }: { type: string }) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    standard: { label: "Estándar", color: C.accent, bg: "#eff6ff" },
    offer: { label: "Oferta", color: "#9333ea", bg: "#f5f3ff" },
    "non-productive": { label: "No productivo", color: C.dim, bg: "#f1f5f9" },
  };
  const s = map[type] || map.standard;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, padding: "3px 10px", borderRadius: 10 }}>
      {s.label}
    </span>
  );
};

export default function AllProjectsDashboard({
  filters,
  projects,
}: {
  filters: Record<string, string>;
  projects: any[];
}) {
  const { data: summary, isLoading: loadingSummary, isError: errorSummary } = useQuery({
    queryKey: ["analyticsSummaryAll", filters],
    queryFn: () => reportService.getAnalyticsSummary(filters),
  });

  const { data: projectReport = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projectReport", filters],
    queryFn: () => reportService.getProjectReport(filters),
  });

  const { data: dailyAll = [] } = useQuery({
    queryKey: ["dailyAll", filters],
    queryFn: () => reportService.getDailyReport(filters),
  });

  const isLoading = loadingSummary || loadingProjects;

  // Group project report by project_id → sum hours
  const projectTotals = useMemo(() => {
    const m: Record<string, { id: string; name: string; hours: number }> = {};
    projectReport.forEach((r: any) => {
      if (!m[r.project_id]) m[r.project_id] = { id: r.project_id, name: r.project_name, hours: 0 };
      m[r.project_id].hours += r.total_hours;
    });
    return Object.values(m).sort((a, b) => b.hours - a.hours);
  }, [projectReport]);


  // Sorted daily summary
  const sortedDailySummary = useMemo(() =>
    [...(summary?.daily_summary || [])].sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    [summary?.daily_summary]);

  // Daily summary with trend
  const dailySummaryTrend = useMemo(() => calcTrend(sortedDailySummary, "hours"), [sortedDailySummary]);

  // Treemap flattened — top 6 by hours, each with a colorIndex
  const treemapFormatted = useMemo(() => {
    if (!summary?.treemap_data?.children) return [];
    const res: any[] = [];
    summary.treemap_data.children.forEach((cat: any) => {
      cat.children?.forEach((task: any) => { res.push({ name: task.name, size: task.value, cat: cat.name }); });
    });
    return res.sort((a, b) => b.size - a.size).slice(0, 6).map((item, i) => ({ ...item, colorIndex: i }));
  }, [summary]);

  // Logistic cost per employee
  const logisticCost = useMemo(() => {
    return (summary?.logistics_km || [])
      .map((k: any) => {
        const d = summary?.dietas_summary?.find((d: any) => d.name === k.name);
        const kmCost = Math.round(k.km_cost ?? (k.personal_km * 0.19));
        const dietaCost = Math.round(d?.cost ?? 0);
        return { name: k.name, kmCoste: kmCost, dietaCoste: dietaCost, total: kmCost + dietaCost };
      })
      .filter((c: any) => c.total > 0)
      .sort((a: any, b: any) => b.total - a.total);
  }, [summary?.logistics_km, summary?.dietas_summary]);

  // KPIs
  const totalHours = projectTotals.reduce((s, p) => s + p.hours, 0);
  const totalKm = summary?.logistics_km?.reduce((s: number, r: any) => s + r.personal_km, 0) || 0;
  const totalDietas = summary?.dietas_summary?.reduce((s: number, r: any) => s + r.yes, 0) || 0;
  const totalEntries = summary?.daily_summary?.reduce((s: number, r: any) => s + r.count, 0) || 0;
  const totalKmCost = summary?.logistics_km?.reduce((s: number, r: any) => s + (r.km_cost ?? r.personal_km * 0.19), 0) || 0;
  const totalDietasCost = summary?.dietas_summary?.reduce((s: number, r: any) => s + (r.cost ?? 0), 0) || 0;
  const totalLogCost = Math.round(totalKmCost + totalDietasCost);
  const employeeCount = summary?.user_totals?.length || 0;
  const maxProjHours = Math.max(...projectTotals.map(p => p.hours), 1);
  const meanEmpHours = totalHours / Math.max(1, employeeCount);

  // Dynamic rates label for subtitle
  const uniqueKmRates = Array.from(new Set(projects.map(p => p.km_rate).filter(r => r !== undefined)));
  const uniqueDietRates = Array.from(new Set(projects.map(p => p.daily_allowance_rate).filter(r => r !== undefined)));

  const ratesLabel = (uniqueKmRates.length === 1)
    ? `(${uniqueKmRates[0]}€/km | Tickets adjuntos)`
    : "Varios ratios KM | Tickets adjuntos";

  if (isLoading) return (
    <div style={{ padding: "60px 28px", textAlign: "center", color: C.dim }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>Cargando datos de todos los proyectos…</div>
    </div>
  );

  if (errorSummary) return (
    <div style={{ padding: "60px 28px", textAlign: "center", color: C.red }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>Error al conectar con el servidor.</div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>Comprueba que el backend está activo en {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</div>
    </div>
  );

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1240, margin: "0 auto" }}>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KPI 
          label="Horas Totales" 
          val={`${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`} 
          unit="" 
          color={C.accent} 
          sub="Todos los proyectos" 
        />
        <KPI label="Fichajes" val={totalEntries.toLocaleString()} unit="" color={C.accent2} sub="Registros totales" />
        <KPI label="Proyectos" val={projectTotals.length} unit="" color={C.catTaller} sub={`de ${projects.length} en el sistema`} />
        <KPI label="KM Particular" val={totalKm.toLocaleString("es-ES", { maximumFractionDigits: 0 })} unit="km" color={C.amber} sub={`${Math.round(totalKmCost).toLocaleString("es-ES")}€ reembolso`} />
        <KPI label="Coste Logístico" val={totalLogCost.toLocaleString("es-ES")} unit="€" color={C.red} sub={`${totalDietas} dietas`} />
      </div>

      {/* 01 – Project ranking */}
      <Section num="01" title="Ranking de Proyectos por Horas" sub="Volumen total de horas imputadas por proyecto en el período seleccionado." badge="PRINCIPAL" badgeColor={C.accent} />
      <CustomCard>
        {projectTotals.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(200, projectTotals.length * 50)}>
            <BarChart data={projectTotals} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" stroke={C.dim} fontSize={10} unit="h" />
              <YAxis type="category" dataKey="name" stroke={C.dim} fontSize={12} width={150} fontWeight={600} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="hours" name="Horas" radius={[0, 6, 6, 0]}>
                {projectTotals.map((_: any, i: number) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} fillOpacity={0.65} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ textAlign: "center", padding: "40px 0", color: C.dim }}>Sin datos en el período seleccionado.</p>
        )}
      </CustomCard>

      {/* 02 – Activity evolution */}
      <Section num="02" title="Evolución de Actividad Global" sub="Horas diarias y fichajes acumulados en todos los proyectos." badge="TENDENCIA" badgeColor={C.catTaller} />
      <CustomCard>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={dailySummaryTrend}>
            <defs>
              <linearGradient id="gHoursAll" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.accent} stopOpacity={0.28} />
                <stop offset="95%" stopColor={C.accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="date" stroke={C.dim} fontSize={10}
              tickFormatter={v => (v || "").split("-").slice(1).join("/")} minTickGap={20} />
            <YAxis yAxisId="h" stroke={C.dim} fontSize={10} unit="h" />
            <YAxis yAxisId="fj" orientation="right" stroke={C.accent2} fontSize={10} />
            <Tooltip content={<Tip />} />
            <Area yAxisId="h" type="monotone" dataKey="hours" name="Horas"
              stroke={C.accent} strokeWidth={2} fill="url(#gHoursAll)" />
            <Line yAxisId="h" type="linear" dataKey="_trend" name="Tendencia"
              stroke={C.catPlanta} strokeWidth={2} strokeDasharray="6 3" dot={false} />
            <Line yAxisId="fj" type="monotone" dataKey="count" name="Fichajes"
              stroke={C.accent2} strokeWidth={2} dot={false} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CustomCard>

      {/* 03 – Employee load */}
      <Section num="03" title="Carga por Empleado" sub="Horas totales acumuladas por empleado en todos los proyectos." badge="RECURSOS" badgeColor={C.accent2} />
      <CustomCard>
        <ResponsiveContainer width="100%" height={Math.max(200, (summary?.user_totals?.length || 0) * 46)}>
          <BarChart data={summary?.user_totals || []} layout="vertical" barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
            <XAxis type="number" stroke={C.dim} fontSize={10} unit="h" />
            <YAxis type="category" dataKey="name" stroke={C.dim} fontSize={11} width={140} />
            <Tooltip content={<Tip />} />
            <ReferenceLine x={meanEmpHours} stroke={C.catPlanta} strokeDasharray="5 3"
              label={{ value: `Media ${meanEmpHours.toFixed(1)}h`, fill: C.catPlanta, fontSize: 10, position: "top" }} />
            <Bar dataKey="hours" name="Horas" radius={[0, 6, 6, 0]}>
              {(summary?.user_totals || []).map((_: any, i: number) => (
                <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} fillOpacity={0.65} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CustomCard>

      {/* 04 + 05 — Category + Treemap side by side */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-5">
        <div>
          <Section num="04" title="Distribución Global por Categoría" sub="Reparto del esfuerzo total." />
          <CustomCard>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <PieChart width={220} height={180}>
                <Pie data={summary?.category_distribution || []} cx={105} cy={85}
                  innerRadius={45} outerRadius={80} paddingAngle={4}
                  dataKey="value" nameKey="name" stroke="none">
                  {(summary?.category_distribution || []).map((_c: any, i: number) => (
                    <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} fillOpacity={0.80} />
                  ))}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                {(summary?.category_distribution || []).map((c: any, i: number) => {
                  const color = CHART_PALETTE[i % CHART_PALETTE.length];
                  const pct = totalHours > 0 ? Math.round(c.value / totalHours * 100) : 0;
                  return (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{c.name}</span>
                      <b style={{ color, fontSize: 14 }}>{c.value.toFixed(1)}h</b>
                      <span style={{ color: C.dim, fontSize: 11 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CustomCard>
        </div>

        <div>
          <Section num="05" title="Treemap Global — Top 6 Tareas" sub="Las 6 tareas con más horas. Tamaño proporcional al peso." />
          <CustomCard>
            {treemapFormatted.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={270}>
                  <Treemap data={treemapFormatted} dataKey="size" nameKey="name"
                    content={<TreemapCell />} animationDuration={300} />
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  {treemapFormatted.map((item, i) => (
                    <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: TREEMAP_PALETTE[i % TREEMAP_PALETTE.length], opacity: 0.85 }} />
                      <span style={{ fontSize: 10, color: C.dim }}>{item.name || "—"}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ textAlign: "center", padding: "40px 0", color: C.dim }}>Sin datos.</p>
            )}
          </CustomCard>
        </div>
      </div>

      {/* 06 – Logistic cost */}
      <Section num="06" title="Coste Logístico por Empleado" sub={`Reembolso KM y Dietas ajustables por proyecto. ${ratesLabel}`} badge="COSTE" badgeColor={C.red} />
      <CustomCard>
        {logisticCost.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={Math.max(200, logisticCost.length * 54)}>
              <ComposedChart data={logisticCost} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="name" stroke={C.dim} fontSize={11} />
                <YAxis stroke={C.dim} fontSize={10} unit="€" />
                <Tooltip content={<Tip />} />
                <Bar dataKey="kmCoste" stackId="a" name="Reembolso KM" fill={C.amber} fillOpacity={0.55} />
                <Bar dataKey="dietaCoste" stackId="a" name="Coste Dietas" fill={C.catTaller} fillOpacity={0.55} radius={[5, 5, 0, 0]} />
                <Line type="monotone" dataKey="total" name="Total €" stroke={C.red} strokeWidth={2.5}
                  dot={{ r: 4, fill: C.red, strokeWidth: 2, stroke: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                ["Reembolso KM", `${Math.round(totalKmCost).toLocaleString("es-ES")}€`, C.amber, "#fffbeb", "#fde68a"],
                ["Coste Dietas", `${Math.round(totalDietasCost).toLocaleString("es-ES")}€`, C.catTaller, "#f0fdfa", "#99f6e4"],
                ["Total Logístico", `${totalLogCost.toLocaleString("es-ES")}€`, C.red, "#fef2f2", "#fecaca"],
              ].map(([label, val, color, bg, border]) => (
                <div key={label as string} style={{ flex: 1, textAlign: "center", padding: "10px 14px", background: bg as string, borderRadius: 10, border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 10, color: color as string, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: color as string }}>{val}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ textAlign: "center", padding: "30px 0", color: C.dim }}>Sin desplazamientos registrados en esta selección.</p>
        )}
      </CustomCard>

      {/* 07 – Heatmap global */}
      <Section num="07" title="Heatmap Global Empleado × Día" sub="Actividad diaria de todos los empleados combinando todos los proyectos." />
      <CustomCard>
        <DynamicHeatmap data={summary?.heatmap || []} />
      </CustomCard>

      {/* 08 – Project table */}
      <Section num="08" title="Tabla Resumen de Proyectos" sub="Métricas consolidadas por proyecto." />
      <CustomCard>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                {["Proyecto", "Tipo", "Horas", "% del total"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: C.dim, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectTotals.map((p, i) => {
                const meta = projects.find((proj: any) => proj.id === p.id);
                const pct = totalHours > 0 ? Math.round(p.hours / totalHours * 100) : 0;
                const color = CHART_PALETTE[i % CHART_PALETTE.length];
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : C.bg }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 5, height: 32, borderRadius: 3, background: color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, color: C.text }}>
                            {meta ? `[${meta.code}] ${p.name}` : p.name}
                          </div>
                          {meta?.location && <div style={{ fontSize: 10, color: C.dim }}>{meta.location}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {meta ? <StatusBadge type={meta.type} /> : <span style={{ color: C.dim }}>—</span>}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 70, height: 6, background: C.border, borderRadius: 3 }}>
                          <div style={{ width: `${(p.hours / maxProjHours) * 100}%`, height: "100%", background: color, borderRadius: 3 }} />
                        </div>
                        <b>{p.hours.toLocaleString("es-ES", { maximumFractionDigits: 1 })}h</b>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color }}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.text}`, background: C.cardAlt }}>
                <td style={{ padding: "12px", fontWeight: 800, fontSize: 13 }} colSpan={2}>TOTAL</td>
                <td style={{ padding: "12px", fontWeight: 800 }}>{totalHours.toLocaleString("es-ES", { maximumFractionDigits: 1 })}h</td>
                <td style={{ padding: "12px", fontWeight: 700 }}>100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CustomCard>

    </div>
  );
}
