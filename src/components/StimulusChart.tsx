// @ts-nocheck
// Renders APES question/FRQ stimuli from structured data (never raw SVG in
// the JSON files) so every chart looks consistent and the content JSON stays
// easy to generate/validate. Supports the chart shapes AP Environmental
// Science actually uses: bar, line, scatter, pie.
import React from "react";

const AXIS_COLOR = "var(--text-faint, #94a3b8)";
const GRID_COLOR = "rgba(148,163,184,0.18)";
const SERIES_COLORS = ["#00c896", "#06b6d4", "#f59e0b", "#8b5cf6", "#ef4444", "#84cc16"];

const W = 520;
const H = 300;
const PAD = { top: 24, right: 24, bottom: 44, left: 56 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function scaleLinear(value, domainMin, domainMax, rangeMin, rangeMax) {
  if (domainMax === domainMin) return rangeMin;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function niceMax(max) {
  if (max <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / magnitude;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * magnitude;
}

function ChartFrame({ title, sourceNote, children }) {
  return (
    <figure className="my-4 rounded-xl overflow-hidden" style={{ border: "1.5px solid var(--border-card)", background: "var(--bg-subtle)" }}>
      {title && (
        <figcaption className="px-4 pt-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</figcaption>
      )}
      <div className="px-2 pb-2 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 380, maxWidth: 560 }} role="img" aria-label={title || "Data chart"}>
          {children}
        </svg>
      </div>
      {sourceNote && (
        <p className="px-4 pb-3 text-xs italic" style={{ color: "var(--text-faint)" }}>{sourceNote}</p>
      )}
    </figure>
  );
}

function BarChart({ data, xLabel, yLabel, title, sourceNote }) {
  // data: [{ label: string, value: number, series?: string }]
  const max = niceMax(Math.max(...data.map(d => d.value), 0));
  const barW = PLOT_W / data.length;
  return (
    <ChartFrame title={title} sourceNote={sourceNote}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.top + PLOT_H - t * PLOT_H;
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill={AXIS_COLOR}>{Math.round(max * t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = scaleLinear(d.value, 0, max, 0, PLOT_H);
        const x = PAD.left + i * barW + barW * 0.15;
        const y = PAD.top + PLOT_H - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW * 0.7} height={h} fill={SERIES_COLORS[i % SERIES_COLORS.length]} rx={3} />
            <text x={x + barW * 0.35} y={PAD.top + PLOT_H + 16} textAnchor="middle" fontSize="10" fill={AXIS_COLOR}>{d.label}</text>
          </g>
        );
      })}
      <text x={PAD.left - 40} y={PAD.top + PLOT_H / 2} textAnchor="middle" fontSize="10" fill={AXIS_COLOR} transform={`rotate(-90 ${PAD.left - 40} ${PAD.top + PLOT_H / 2})`}>{yLabel}</text>
      <text x={PAD.left + PLOT_W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill={AXIS_COLOR}>{xLabel}</text>
    </ChartFrame>
  );
}

function LineChart({ series, xLabel, yLabel, title, sourceNote }) {
  // series: [{ name: string, points: [{x:number,y:number}] }]
  const allX = series.flatMap(s => s.points.map(p => p.x));
  const allY = series.flatMap(s => s.points.map(p => p.y));
  const xMin = Math.min(...allX), xMax = Math.max(...allX);
  const yMax = niceMax(Math.max(...allY, 0));
  const yMin = Math.min(0, Math.min(...allY));

  const toPx = (x, y) => [
    scaleLinear(x, xMin, xMax, PAD.left, PAD.left + PLOT_W),
    scaleLinear(y, yMin, yMax, PAD.top + PLOT_H, PAD.top),
  ];

  return (
    <ChartFrame title={title} sourceNote={sourceNote}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.top + PLOT_H - t * PLOT_H;
        const val = yMin + t * (yMax - yMin);
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill={AXIS_COLOR}>{Math.round(val)}</text>
          </g>
        );
      })}
      {[xMin, (xMin + xMax) / 2, xMax].map((xv, i) => {
        const [x] = toPx(xv, yMin);
        return <text key={i} x={x} y={PAD.top + PLOT_H + 16} textAnchor="middle" fontSize="10" fill={AXIS_COLOR}>{Math.round(xv * 10) / 10}</text>;
      })}
      {series.map((s, si) => {
        const path = s.points.map((p, i) => {
          const [x, y] = toPx(p.x, p.y);
          return `${i === 0 ? "M" : "L"}${x},${y}`;
        }).join(" ");
        const color = SERIES_COLORS[si % SERIES_COLORS.length];
        return (
          <g key={si}>
            <path d={path} fill="none" stroke={color} strokeWidth={2.5} />
            {s.points.map((p, i) => {
              const [x, y] = toPx(p.x, p.y);
              return <circle key={i} cx={x} cy={y} r={3} fill={color} />;
            })}
          </g>
        );
      })}
      {series.length > 1 && (
        <g>
          {series.map((s, i) => (
            <g key={i} transform={`translate(${PAD.left + i * 130}, ${PAD.top - 10})`}>
              <rect width={10} height={10} fill={SERIES_COLORS[i % SERIES_COLORS.length]} rx={2} />
              <text x={14} y={9} fontSize="10" fill={AXIS_COLOR}>{s.name}</text>
            </g>
          ))}
        </g>
      )}
      <text x={PAD.left - 40} y={PAD.top + PLOT_H / 2} textAnchor="middle" fontSize="10" fill={AXIS_COLOR} transform={`rotate(-90 ${PAD.left - 40} ${PAD.top + PLOT_H / 2})`}>{yLabel}</text>
      <text x={PAD.left + PLOT_W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill={AXIS_COLOR}>{xLabel}</text>
    </ChartFrame>
  );
}

function ScatterChart({ points, xLabel, yLabel, title, sourceNote, trendline }) {
  // points: [{x:number, y:number, label?:string}]
  const xMax = niceMax(Math.max(...points.map(p => p.x), 0));
  const yMax = niceMax(Math.max(...points.map(p => p.y), 0));
  const toPx = (x, y) => [
    scaleLinear(x, 0, xMax, PAD.left, PAD.left + PLOT_W),
    scaleLinear(y, 0, yMax, PAD.top + PLOT_H, PAD.top),
  ];
  return (
    <ChartFrame title={title} sourceNote={sourceNote}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.top + PLOT_H - t * PLOT_H;
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill={AXIS_COLOR}>{Math.round(yMax * t)}</text>
          </g>
        );
      })}
      {trendline && (() => {
        const [x1, y1] = toPx(trendline.x1, trendline.y1);
        const [x2, y2] = toPx(trendline.x2, trendline.y2);
        return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" />;
      })()}
      {points.map((p, i) => {
        const [x, y] = toPx(p.x, p.y);
        return <circle key={i} cx={x} cy={y} r={4} fill="#06b6d4" fillOpacity={0.8} stroke="#0891b2" strokeWidth={1} />;
      })}
      <text x={PAD.left - 40} y={PAD.top + PLOT_H / 2} textAnchor="middle" fontSize="10" fill={AXIS_COLOR} transform={`rotate(-90 ${PAD.left - 40} ${PAD.top + PLOT_H / 2})`}>{yLabel}</text>
      <text x={PAD.left + PLOT_W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill={AXIS_COLOR}>{xLabel}</text>
    </ChartFrame>
  );
}

function PieChart({ slices, title, sourceNote }) {
  // slices: [{ label: string, value: number }]
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const cx = W / 2, cy = H / 2 - 10, r = 90;
  let angle = -Math.PI / 2;
  const arcs = slices.map((s, i) => {
    const frac = s.value / total;
    const start = angle;
    angle += frac * Math.PI * 2;
    const end = angle;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
    return { path, color: SERIES_COLORS[i % SERIES_COLORS.length], label: s.label, pct: Math.round(frac * 100) };
  });
  return (
    <ChartFrame title={title} sourceNote={sourceNote}>
      {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} stroke="var(--bg-subtle)" strokeWidth={2} />)}
      {arcs.map((a, i) => (
        <g key={i} transform={`translate(${W - 150}, ${20 + i * 18})`}>
          <rect width={10} height={10} fill={a.color} rx={2} />
          <text x={14} y={9} fontSize="10" fill={AXIS_COLOR}>{a.label} ({a.pct}%)</text>
        </g>
      ))}
    </ChartFrame>
  );
}

function DataTable({ headers, rows, title, sourceNote }) {
  return (
    <figure className="my-4 rounded-xl overflow-hidden" style={{ border: "1.5px solid var(--border-card)" }}>
      {title && (
        <figcaption className="px-4 pt-3 pb-1 text-sm font-bold" style={{ color: "var(--text-primary)", background: "var(--bg-subtle)" }}>{title}</figcaption>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--bg-subtle)" }}>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)", borderBottom: "2px solid var(--border-card)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: "1px solid var(--border-card)" }}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2" style={{ color: "var(--text-body)" }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sourceNote && (
        <p className="px-4 py-2 text-xs italic" style={{ color: "var(--text-faint)", background: "var(--bg-subtle)" }}>{sourceNote}</p>
      )}
    </figure>
  );
}

/**
 * Renders a stimulus object of shape:
 * { type: "bar"|"line"|"scatter"|"pie"|"table", title?, sourceNote?, ...typeSpecificFields }
 * Unknown/malformed stimuli render nothing (fails soft — never breaks a quiz).
 */
export default function StimulusChart({ stimulus }) {
  if (!stimulus || typeof stimulus !== "object") return null;
  try {
    switch (stimulus.type) {
      case "bar":
        return <BarChart {...stimulus} />;
      case "line":
        return <LineChart {...stimulus} />;
      case "scatter":
        return <ScatterChart {...stimulus} />;
      case "pie":
        return <PieChart {...stimulus} />;
      case "table":
        return <DataTable {...stimulus} />;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
