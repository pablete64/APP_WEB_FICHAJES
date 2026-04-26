import { useMemo } from "react";

// ── Light palette (shared across dashboard views) ──
export const C = {
  bg: "#f8fafc", card: "#ffffff", cardAlt: "#f1f5f9", border: "#e2e8f0",
  text: "#0f172a", dim: "#64748b", accent: "#2563eb", accent2: "#7c3aed",
  green: "#059669", amber: "#d97706", pink: "#db2777", red: "#dc2626", teal: "#0d9488",
  catOficina: "#6366f1", catPlanta: "#f97316", catTaller: "#14b8a6",
};

// ── Multi-chart palette (10 elegant mid-tone colors) ──
export const CHART_PALETTE = [
  "#818cf8", // indigo-400
  "#fb923c", // orange-400
  "#2dd4bf", // teal-400
  "#f472b6", // pink-400
  "#60a5fa", // blue-400
  "#a78bfa", // violet-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#e879f9", // fuchsia-400
  "#4ade80", // green-400
];

// ── Treemap top-6 palette ──
export const TREEMAP_PALETTE = [
  "#818cf8", "#fb923c", "#2dd4bf", "#f472b6", "#fbbf24", "#a78bfa",
];

// ── Linear trend line helper ──
export const calcTrend = (data: any[], key: string): any[] => {
  const n = data.length;
  if (n < 2) return data.map(d => ({ ...d, _trend: +(d[key] ?? 0) }));
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  data.forEach((d, i) => {
    const y = +(d[key] ?? 0);
    sumX += i; sumY += y; sumXY += i * y; sumX2 += i * i;
  });
  const denom = n * sumX2 - sumX * sumX;
  if (!denom) return data.map(d => ({ ...d, _trend: +(sumY / n).toFixed(2) }));
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return data.map((d, i) => ({ ...d, _trend: Math.max(0, +(slope * i + intercept).toFixed(2)) }));
};

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const formatDashboardDate = (value: string | undefined | null, includeYear = true): string => {
  if (!value) return "";
  const match = value.match(ISO_DATE_RE);
  if (!match) return value;

  const [, year, month, day] = match;
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
};

// ── Tooltip ──
export const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
      <div style={{ color: C.text, fontWeight: 700, marginBottom: 6 }}>{formatDashboardDate(label, true)}</div>
      {payload.filter((p: any) => p.value > 0).map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || p.fill, margin: "2px 0", display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span>{p.name}</span>
          <b>{typeof p.value === "number" ? p.value.toLocaleString("es-ES") : p.value}</b>
        </div>
      ))}
    </div>
  );
};

// ── Badge ──
export const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, borderRadius: 10, padding: "2px 10px", letterSpacing: 0.5 }}>{children}</span>
);

// ── Section header ──
export const Section = ({ num, title, sub, badge, badgeColor }: any) => (
  <div style={{ marginBottom: 14, marginTop: 28 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ background: C.text, color: "#fff", fontWeight: 800, fontSize: 10, padding: "3px 10px", borderRadius: 6, letterSpacing: 1 }}>{num}</span>
      <span style={{ color: C.text, fontSize: 17, fontWeight: 700 }}>{title}</span>
      {badge && <Badge color={badgeColor || C.green}>{badge}</Badge>}
    </div>
    <p style={{ color: C.dim, fontSize: 12, margin: "4px 0 0 0", lineHeight: 1.5 }}>{sub}</p>
  </div>
);

// ── Card container ──
export const CustomCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", ...style }}>
    {children}
  </div>
);

// ── KPI tile ──
export const KPI = ({ label, val, unit, color, sub }: any) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 140, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
    <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ color: color || C.text, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>{val}</span>
      <span style={{ color: C.dim, fontSize: 12 }}>{unit}</span>
    </div>
    {sub && <div style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ── Heatmap ──
export const DynamicHeatmap = ({ data }: { data: any[] }) => {
  const dates = useMemo(() => {
    const dSet = new Set<string>();
    data.forEach(u => u.data?.forEach((d: any) => dSet.add(d.date)));
    return Array.from(dSet).sort();
  }, [data]);

  const employees = useMemo(() => data.map(u => u.user), [data]);

  const lookup = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach(u => { u.data?.forEach((d: any) => { m[`${u.user}_${d.date}`] = d.hours; }); });
    return m;
  }, [data]);

  const maxH = useMemo(() => {
    let m = 0;
    data.forEach(u => u.data?.forEach((d: any) => { if (d.hours > m) m = d.hours; }));
    return m || 1;
  }, [data]);

  if (!data?.length) return (
    <p style={{ textAlign: "center", padding: "40px 0", color: C.dim }}>No hay datos para esta selección.</p>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 3, fontSize: 10 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", color: C.dim, fontWeight: 600, padding: "0 8px 8px 0", fontSize: 10, minWidth: 120 }}>Empleado</th>
            {dates.map(d => (
            <th key={d} style={{ color: C.dim, fontWeight: 600, padding: "0 0 8px 0", fontSize: 9, width: 38, textAlign: "center" }}>
                {formatDashboardDate(d, false)}
              </th>
            ))}
            <th style={{ color: C.dim, fontWeight: 700, padding: "0 0 8px 8px", fontSize: 10 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
            const safeEmp = emp || "—";
            const total = dates.reduce((s, d) => s + (lookup[`${emp}_${d}`] || 0), 0);
            return (
              <tr key={emp ?? Math.random()}>
                <td style={{ color: C.text, fontWeight: 600, paddingRight: 8, whiteSpace: "nowrap", fontSize: 11 }}>
                  {safeEmp.length > 16 ? safeEmp.slice(0, 14) + "…" : safeEmp}
                </td>
                {dates.map(d => {
                  const h = lookup[`${emp}_${d}`];
                  if (!h) return (
                    <td key={d} style={{ width: 38, height: 30, borderRadius: 4, background: "#f1f5f9", textAlign: "center" }}>
                      <span style={{ color: "#cbd5e1", fontSize: 9 }}>—</span>
                    </td>
                  );
                  const ratio = h / maxH;
                  const isHigh = h > 10;
                  const bg = isHigh
                    ? `rgba(220,38,38,${0.15 + ratio * 0.55})`
                    : `rgba(99,102,241,${0.08 + ratio * 0.45})`;
                  return (
                    <td key={d} style={{ width: 38, height: 30, borderRadius: 4, background: bg, textAlign: "center", border: isHigh ? "1px solid rgba(220,38,38,0.25)" : "1px solid transparent" }}>
                      <span style={{ color: isHigh ? "#dc2626" : C.catOficina, fontWeight: 700, fontSize: 11 }}>{h.toFixed(0)}</span>
                    </td>
                  );
                })}
                <td style={{ color: C.text, fontWeight: 800, paddingLeft: 8, fontSize: 12 }}>{total.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(99,102,241,0.3)" }} />
          <span style={{ fontSize: 10, color: C.dim }}>≤ 10h</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(220,38,38,0.4)" }} />
          <span style={{ fontSize: 10, color: C.dim }}>&gt; 10h (revisar)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "#f1f5f9", border: "1px solid #e2e8f0" }} />
          <span style={{ fontSize: 10, color: C.dim }}>Sin fichaje</span>
        </div>
      </div>
    </div>
  );
};

// ── Treemap cell ──
export const TreemapCell = ({ x, y, width, height, name, size, cat, colorIndex }: any) => {
  if (width < 40 || height < 30) return null;
  const safeName = name || "";
  const color = colorIndex !== undefined
    ? TREEMAP_PALETTE[colorIndex % TREEMAP_PALETTE.length]
    : ((cat || "").includes("Oficina") ? C.catOficina
      : (cat || "").includes("Planta") ? C.catPlanta : C.catTaller);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6}
        style={{ fill: color, fillOpacity: 0.72, stroke: "#fff", strokeWidth: 2 }} />
      {width > 60 && (
        <text x={x + 9} y={y + 17} style={{ fill: "#fff", fontSize: 11, fontWeight: "bold" }}>
          {safeName.length > 18 ? safeName.slice(0, 16) + "…" : safeName}
        </text>
      )}
      {width > 50 && height > 34 && (
        <text x={x + 9} y={y + 31} style={{ fill: "rgba(255,255,255,0.85)", fontSize: 10 }}>
          {typeof size === "number" ? size.toFixed(1) : size}h
        </text>
      )}
    </g>
  );
};
