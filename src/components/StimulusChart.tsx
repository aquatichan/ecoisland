// Renders the data stimuli that AP Environmental Science questions use
// (tables, bar, line, scatter and pie charts) from structured JSON, so every
// chart matches the app's colors in both themes. Malformed data renders
// nothing rather than breaking a quiz.
import type { ReactNode } from "react";

const AXIS = "var(--fg-3)";
const GRID = "var(--line)";
const SERIES = ["var(--brand)", "var(--ocean)", "var(--sun)", "#8a63d2", "var(--coral)", "#6bab3c"];

const W = 560;
const H = 300;
const PAD = { top: 26, right: 24, bottom: 46, left: 58 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

type Point = { x: number; y: number; label?: string };
type Stimulus = Record<string, unknown> & { type?: unknown; title?: unknown; sourceNote?: unknown };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

function scale(v: number, d0: number, d1: number, r0: number, r1: number) {
  return d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

function niceMax(max: number) {
  if (max <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  const n = max / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function fmt(v: number) {
  return Math.abs(v) >= 1000 ? v.toLocaleString() : String(Math.round(v * 10) / 10);
}

function Frame({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <figure className="my-5 overflow-hidden rounded-lg border border-line bg-surface-2/60">
      {title && <figcaption className="px-4 pt-3.5 text-[13.5px] font-semibold text-fg">{title}</figcaption>}
      <div className="px-2 pb-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[600px]" role="img" aria-label={title || "Data chart"}>
          {children}
        </svg>
      </div>
      {note && <p className="px-4 pb-3 text-[12px] text-fg-3 italic">{note}</p>}
    </figure>
  );
}

function YGrid({ min, max }: { min: number; max: number }) {
  return (
    <>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.top + PH - t * PH;
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={GRID} />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill={AXIS}>
              {fmt(min + t * (max - min))}
            </text>
          </g>
        );
      })}
    </>
  );
}

function AxisLabels({ x, y }: { x: string; y: string }) {
  return (
    <>
      <text x={16} y={PAD.top + PH / 2} textAnchor="middle" fontSize="11" fill={AXIS} transform={`rotate(-90 16 ${PAD.top + PH / 2})`}>
        {y}
      </text>
      <text x={PAD.left + PW / 2} y={H - 6} textAnchor="middle" fontSize="11" fill={AXIS}>
        {x}
      </text>
    </>
  );
}

function Bar({ s }: { s: Stimulus }) {
  const data = (s.data as Array<{ label?: unknown; value?: unknown }>).map((d) => ({ label: text(d.label), value: num(d.value) ?? 0 }));
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const bw = PW / data.length;
  return (
    <Frame title={text(s.title)} note={text(s.sourceNote)}>
      <YGrid min={0} max={max} />
      {data.map((d, i) => {
        const h = scale(d.value, 0, max, 0, PH);
        const x = PAD.left + i * bw + bw * 0.18;
        return (
          <g key={i}>
            <rect x={x} y={PAD.top + PH - h} width={bw * 0.64} height={h} rx={4} fill={SERIES[i % SERIES.length]} />
            <text x={x + bw * 0.32} y={PAD.top + PH + 17} textAnchor="middle" fontSize="11" fill={AXIS}>
              {d.label}
            </text>
          </g>
        );
      })}
      <AxisLabels x={text(s.xLabel)} y={text(s.yLabel)} />
    </Frame>
  );
}

function Line({ s }: { s: Stimulus }) {
  const series = (s.series as Array<{ name?: unknown; points?: unknown }>).map((x) => ({
    name: text(x.name),
    points: (Array.isArray(x.points) ? x.points : []).map((p: Point) => ({ x: num(p?.x) ?? 0, y: num(p?.y) ?? 0 })),
  }));
  const xs = series.flatMap((x) => x.points.map((p) => p.x));
  const ys = series.flatMap((x) => x.points.map((p) => p.y));
  if (xs.length === 0) return null;
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(0, ...ys);
  const y1 = niceMax(Math.max(0, ...ys));
  const px = (x: number, y: number) => [scale(x, x0, x1, PAD.left, PAD.left + PW), scale(y, y0, y1, PAD.top + PH, PAD.top)];
  return (
    <Frame title={text(s.title)} note={text(s.sourceNote)}>
      <YGrid min={y0} max={y1} />
      {[x0, (x0 + x1) / 2, x1].map((v, i) => (
        <text key={i} x={px(v, y0)[0]} y={PAD.top + PH + 17} textAnchor="middle" fontSize="11" fill={AXIS}>
          {fmt(v)}
        </text>
      ))}
      {series.map((ser, si) => {
        const color = SERIES[si % SERIES.length];
        const d = ser.points.map((p, i) => `${i ? "L" : "M"}${px(p.x, p.y).join(",")}`).join(" ");
        return (
          <g key={si}>
            <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
            {ser.points.map((p, i) => {
              const [cx, cy] = px(p.x, p.y);
              return <circle key={i} cx={cx} cy={cy} r={3.2} fill={color} />;
            })}
          </g>
        );
      })}
      {series.length > 1 &&
        series.map((ser, i) => (
          <g key={i} transform={`translate(${PAD.left + i * 140} 8)`}>
            <rect width={10} height={10} rx={2} fill={SERIES[i % SERIES.length]} />
            <text x={15} y={9} fontSize="11" fill={AXIS}>
              {ser.name}
            </text>
          </g>
        ))}
      <AxisLabels x={text(s.xLabel)} y={text(s.yLabel)} />
    </Frame>
  );
}

function Scatter({ s }: { s: Stimulus }) {
  const points = (s.points as Point[]).map((p) => ({ x: num(p?.x) ?? 0, y: num(p?.y) ?? 0 }));
  const xm = niceMax(Math.max(0, ...points.map((p) => p.x)));
  const ym = niceMax(Math.max(0, ...points.map((p) => p.y)));
  const px = (x: number, y: number) => [scale(x, 0, xm, PAD.left, PAD.left + PW), scale(y, 0, ym, PAD.top + PH, PAD.top)];
  const t = s.trendline as { x1?: unknown; y1?: unknown; x2?: unknown; y2?: unknown } | undefined;
  return (
    <Frame title={text(s.title)} note={text(s.sourceNote)}>
      <YGrid min={0} max={ym} />
      {[0, xm / 2, xm].map((v, i) => (
        <text key={i} x={px(v, 0)[0]} y={PAD.top + PH + 17} textAnchor="middle" fontSize="11" fill={AXIS}>
          {fmt(v)}
        </text>
      ))}
      {t && num(t.x1) !== null && num(t.x2) !== null && (
        <line
          x1={px(num(t.x1)!, num(t.y1) ?? 0)[0]}
          y1={px(num(t.x1)!, num(t.y1) ?? 0)[1]}
          x2={px(num(t.x2)!, num(t.y2) ?? 0)[0]}
          y2={px(num(t.x2)!, num(t.y2) ?? 0)[1]}
          stroke="var(--sun)"
          strokeWidth={1.6}
          strokeDasharray="5 4"
        />
      )}
      {points.map((p, i) => {
        const [cx, cy] = px(p.x, p.y);
        return <circle key={i} cx={cx} cy={cy} r={4.2} fill="var(--ocean)" fillOpacity={0.75} />;
      })}
      <AxisLabels x={text(s.xLabel)} y={text(s.yLabel)} />
    </Frame>
  );
}

function Pie({ s }: { s: Stimulus }) {
  const slices = (s.slices as Array<{ label?: unknown; value?: unknown }>).map((x) => ({ label: text(x.label), value: Math.max(0, num(x.value) ?? 0) }));
  const total = slices.reduce((a, b) => a + b.value, 0) || 1;
  const cx = 200;
  const cy = H / 2;
  const r = 104;
  let angle = -Math.PI / 2;
  return (
    <Frame title={text(s.title)} note={text(s.sourceNote)}>
      {slices.map((sl, i) => {
        const a0 = angle;
        angle += (sl.value / total) * Math.PI * 2;
        const a1 = angle;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const d = `M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`;
        return <path key={i} d={d} fill={SERIES[i % SERIES.length]} stroke="var(--surface)" strokeWidth={2} />;
      })}
      {slices.map((sl, i) => (
        <g key={i} transform={`translate(350 ${70 + i * 22})`}>
          <rect width={11} height={11} rx={2} fill={SERIES[i % SERIES.length]} />
          <text x={17} y={10} fontSize="12" fill="var(--fg-2)">
            {sl.label} ({Math.round((sl.value / total) * 100)}%)
          </text>
        </g>
      ))}
    </Frame>
  );
}

function Table({ s }: { s: Stimulus }) {
  const headers = (s.headers as unknown[]).map(text);
  const rows = (s.rows as unknown[][]).map((r) => (Array.isArray(r) ? r.map(text) : []));
  return (
    <figure className="my-5 overflow-hidden rounded-lg border border-line">
      {text(s.title) && <figcaption className="border-b border-line bg-surface-2 px-4 py-2.5 text-[13.5px] font-semibold text-fg">{text(s.title)}</figcaption>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="bg-surface-2/60">
              {headers.map((h, i) => (
                <th key={i} className="border-b border-line px-4 py-2 text-left font-semibold text-fg-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-line last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 text-fg-2 t-num">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {text(s.sourceNote) && <p className="border-t border-line px-4 py-2 text-[12px] text-fg-3 italic">{text(s.sourceNote)}</p>}
    </figure>
  );
}

export default function StimulusChart({ stimulus }: { stimulus?: unknown }) {
  if (!stimulus || typeof stimulus !== "object") return null;
  const s = stimulus as Stimulus;
  const arr = (k: string) => Array.isArray(s[k]) && (s[k] as unknown[]).length > 0;
  switch (s.type) {
    case "bar":
      return arr("data") ? <Bar s={s} /> : null;
    case "line":
      return arr("series") ? <Line s={s} /> : null;
    case "scatter":
      return arr("points") ? <Scatter s={s} /> : null;
    case "pie":
      return arr("slices") ? <Pie s={s} /> : null;
    case "table":
      return arr("headers") && arr("rows") ? <Table s={s} /> : null;
    default:
      return null;
  }
}
