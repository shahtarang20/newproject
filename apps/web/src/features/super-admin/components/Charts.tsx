import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyCount } from '@/types/admin';
import { formatMoney, formatNumber } from '@/utils/format';
import { CHART, chartTooltipStyle, shortDate } from './AdminBits';

/** Shops + users signups per day (two series). Accessible via a text summary. */
export function SignupsChart({ shops, users, height = 260 }: { shops: DailyCount[]; users: DailyCount[]; height?: number }) {
  const data = shops.map((s, i) => ({ date: s.date, shops: s.count, users: users[i]?.count ?? 0 }));
  const totalShops = data.reduce((a, d) => a + d.shops, 0);
  const totalUsers = data.reduce((a, d) => a + d.users, 0);
  return (
    <div role="img" aria-label={`Daily signups chart. ${formatNumber(totalShops)} new shops and ${formatNumber(totalUsers)} new users in this period.`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gShops" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.info} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART.info} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(l) => shortDate(String(l))} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="shops" name="New shops" stroke={CHART.primary} strokeWidth={2} fill="url(#gShops)" />
          <Area type="monotone" dataKey="users" name="New users" stroke={CHART.info} strokeWidth={2} fill="url(#gUsers)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GmvBarChart({ rows, height = 280 }: { rows: Array<{ name: string; gmvMinor: number }>; height?: number }) {
  const data = rows.map((r) => ({ name: r.name.length > 16 ? `${r.name.slice(0, 15)}…` : r.name, gmv: r.gmvMinor / 100 }));
  return (
    <div role="img" aria-label="Top shops by GMV bar chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
          <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatMoney(v * 100)} cursor={{ fill: 'hsl(var(--muted))' }} />
          <Bar dataKey="gmv" name="GMV" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBarChart({ rows, valueLabel, format, height = 280, color = CHART.primary }: { rows: Array<{ name: string; value: number }>; valueLabel: string; format: (n: number) => string; height?: number; color?: string }) {
  const data = rows.map((r) => ({ ...r, name: r.name.length > 16 ? `${r.name.slice(0, 15)}…` : r.name }));
  return (
    <div role="img" aria-label={`${valueLabel} bar chart`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={format} />
          <YAxis type="category" dataKey="name" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} width={96} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => format(v)} cursor={{ fill: 'hsl(var(--muted))' }} />
          <Bar dataKey="value" name={valueLabel} fill={color} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
