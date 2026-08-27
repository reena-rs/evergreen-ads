"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const gridProps = { strokeDasharray: "3 3", stroke: "#262626" };
const axisProps = { stroke: "#737373", fontSize: 12 };
const tooltipStyle = { background: "#171717", border: "1px solid #404040", borderRadius: 8 };

export function WeightTrendChart({ data }: { data: { date: string; weight: number }[] }) {
  if (data.length === 0) return <EmptyState label="weigh-ins" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} width={40} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e5e5e5" }} />
        <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RecoveryTrendChart({
  data,
}: {
  data: { date: string; restingHr: number | null; hrv: number | null; sleepQuality: number | null }[];
}) {
  if (data.length === 0) return <EmptyState label="recovery entries" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e5e5e5" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="restingHr" name="Resting HR" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="hrv" name="HRV" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="sleepQuality" name="Sleep (1-5)" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ConsistencyChart({
  data,
}: {
  data: { week: string; scheduled: number; completed: number }[];
}) {
  if (data.length === 0) return <EmptyState label="scheduled workouts" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="week" {...axisProps} />
        <YAxis {...axisProps} width={30} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e5e5e5" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="scheduled" name="Scheduled" fill="#404040" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AdherenceChart({ data }: { data: { week: string; adherencePct: number }[] }) {
  if (data.length === 0) return <EmptyState label="logged macro days" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="week" {...axisProps} />
        <YAxis {...axisProps} width={40} domain={[0, 100]} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: "#e5e5e5" }}
          formatter={(value) => [`${value}%`, "Within target"]}
        />
        <Bar dataKey="adherencePct" name="% days within target" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-neutral-600">No {label} in this range yet.</p>;
}
