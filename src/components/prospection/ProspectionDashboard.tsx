"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ProspectionStats {
  period: string;
  timestamp: string;
  distribution: {
    cold: number;
    warm: number;
    hot: number;
    dead: number;
    total: number;
  };
  prospection: {
    messagesSent: number;
    responsesReceived: number;
    responseRate: string;
    newWarmLeads: number;
    conversionRate: string;
  };
  metrics: {
    avgScore: number;
    coldLeadsCount: number;
    hotLeadsCount: number;
    pipelineHealth: string | number;
  };
  insights: string[];
}

export function ProspectionDashboard() {
  const [stats, setStats] = useState<ProspectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchStats();
  }, [days]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/prospection/stats?days=${days}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching prospection stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-4 text-center text-gray-500">
        Cargando métricas...
      </div>
    );
  }

  const distributionData = [
    { name: "Frío", value: stats.distribution.cold, fill: "#3b82f6" },
    { name: "Tibio", value: stats.distribution.warm, fill: "#f59e0b" },
    { name: "Caliente", value: stats.distribution.hot, fill: "#ef4444" },
    { name: "Muerto", value: stats.distribution.dead, fill: "#6b7280" },
  ];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Dashboard de Prospección
          </h2>
          <p className="text-sm text-slate-600">{stats.period}</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                days === d
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 border border-slate-300"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Tasa de Respuesta"
          value={stats.prospection.responseRate}
          icon="📧"
        />
        <MetricCard
          label="Conversión (cold→warm)"
          value={stats.prospection.conversionRate}
          icon="📈"
        />
        <MetricCard
          label="Score Promedio"
          value={`${stats.metrics.avgScore.toFixed(1)}/100`}
          icon="⭐"
        />
        <MetricCard
          label="Salud del Pipeline"
          value={`${stats.metrics.pipelineHealth}%`}
          icon="🏥"
        />
      </div>

      {/* Distribución de Leads */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Distribución de Leads
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={distributionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Prospección Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Actividad de Prospección
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            label="Mensajes Enviados"
            value={stats.prospection.messagesSent}
          />
          <StatBox
            label="Respuestas"
            value={stats.prospection.responsesReceived}
          />
          <StatBox
            label="Nuevos Warm Leads"
            value={stats.prospection.newWarmLeads}
          />
          <StatBox label="Total Leads" value={stats.distribution.total} />
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Insights</h3>
        <ul className="space-y-2">
          {stats.insights.map((insight, i) => (
            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
              <span className="flex-shrink-0 mt-1">→</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actualización */}
      <div className="text-xs text-slate-500 text-right">
        Actualizado: {new Date(stats.timestamp).toLocaleString()}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-slate-50 rounded border border-slate-200">
      <p className="text-xs text-slate-600 uppercase">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
