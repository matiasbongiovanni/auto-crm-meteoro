"use client";

import { useMemo } from "react";
import { Users, Key } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { cn } from "@/lib/utils";

export function AdminMetrics() {
  const { state } = useCrm();

  const userStats = useMemo(() => {
    const byRole = { ceo: 0, admin: 0, freelancer: 0 };
    let active = 0;
    let inactive = 0;
    for (const p of state.profiles) {
      if (p.role in byRole) byRole[p.role as keyof typeof byRole]++;
      if (p.status === "active") active++; else inactive++;
    }
    return { byRole, active, inactive, total: state.profiles.length };
  }, [state.profiles]);

  const keyStats = useMemo(() => {
    const active = state.apiKeys.filter((k) => !k.revoked_at).length;
    const revoked = state.apiKeys.filter((k) => !!k.revoked_at).length;
    const byScope: Record<string, number> = { read: 0, write: 0, admin: 0 };
    let recentlyUsed = 0;
    const d7ago = new Date(); d7ago.setDate(d7ago.getDate() - 7);
    const cutoff = d7ago.toISOString();
    for (const k of state.apiKeys) {
      if (k.revoked_at) continue;
      for (const s of k.scopes) byScope[s] = (byScope[s] || 0) + 1;
      if (k.last_used_at && k.last_used_at >= cutoff) recentlyUsed++;
    }
    return { active, revoked, byScope, recentlyUsed };
  }, [state.apiKeys]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
      {/* Users */}
      <div className="metric-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Usuarios
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{userStats.total}</span>
          <span className="text-[11px] text-muted-foreground">total</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(userStats.byRole).map(([role, count]) => (
            <div key={role} className="text-center">
              <p className="text-base font-bold text-foreground/80">{count}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 text-[11px]">
          <span className={cn("font-medium", userStats.active > 0 ? "text-[var(--success)]" : "text-muted-foreground")}>
            {userStats.active} activos
          </span>
          {userStats.inactive > 0 && (
            <span className="text-muted-foreground">{userStats.inactive} inactivos</span>
          )}
        </div>
      </div>

      {/* API Keys */}
      <div className="metric-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            API Keys
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{keyStats.active}</span>
          <span className="text-[11px] text-muted-foreground">activas</span>
          {keyStats.revoked > 0 && (
            <span className="text-[11px] text-muted-foreground/50">· {keyStats.revoked} revocadas</span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(keyStats.byScope).filter(([, n]) => n > 0).map(([scope, count]) => (
            <span key={scope} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">
              {scope}: {count}
            </span>
          ))}
          {keyStats.active === 0 && (
            <span className="text-[11px] text-muted-foreground">Sin keys activas</span>
          )}
        </div>
        {keyStats.recentlyUsed > 0 && (
          <p className="text-[11px] text-[var(--success)]">
            {keyStats.recentlyUsed} usada{keyStats.recentlyUsed > 1 ? "s" : ""} en los últimos 7 días
          </p>
        )}
      </div>
    </div>
  );
}
