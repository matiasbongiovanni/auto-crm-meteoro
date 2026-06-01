"use client";

import { useState } from "react";
import { Shield, Plus, Trash2, Copy, Key, Users, Eye, EyeOff, Settings } from "lucide-react";
import { useCrm } from "@/components/crm/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/crm";
import { AdminMetrics } from "@/components/admin/AdminMetrics";
import { SettingsForm } from "@/components/admin/SettingsForm";

const ROLE_CONFIG: Record<Role, { label: string; class: string }> = {
  ceo: { label: "CEO", class: "border-primary/30 text-primary" },
  admin: { label: "Admin", class: "border-amber-400/30 text-amber-400" },
  freelancer: { label: "Freelancer", class: "border-border/40 text-muted-foreground" },
};

function NewUserForm({ onSave, onClose }: { onSave: (email: string, password: string, fullName: string, role: string) => Promise<void>; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<Role>("freelancer");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await onSave(
        String(fd.get("email") || ""),
        String(fd.get("password") || ""),
        String(fd.get("full_name") || ""),
        role,
      );
      toast.success("Usuario creado");
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error al crear usuario"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1"><Label className="label-muted">Nombre completo</Label>
        <Input name="full_name" required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Email</Label>
        <Input name="email" type="email" required className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1"><Label className="label-muted">Contraseña</Label>
        <div className="relative">
          <Input name="password" type={showPass ? "text" : "password"} required minLength={8} className="bg-muted/40 border-border/60 pr-10" />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1"><Label className="label-muted">Rol</Label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="bg-muted/40 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="freelancer">Freelancer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="ceo">CEO</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Creando..." : "Crear usuario"}</Button>
      </div>
    </form>
  );
}

function NewApiKeyForm({ onSave, onClose }: { onSave: (name: string, scopes: ("read" | "write" | "admin")[]) => Promise<{ key: string }>; onClose: (key?: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [scopes, setScopes] = useState<Set<"read" | "write" | "admin">>(new Set(["read"]));

  function toggleScope(s: "read" | "write" | "admin") {
    setScopes((prev) => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const result = await onSave(String(fd.get("name") || ""), [...scopes]);
      onClose(result.key);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1"><Label className="label-muted">Nombre de la key</Label>
        <Input name="name" required placeholder="Ej. WhatsApp Bot" className="bg-muted/40 border-border/60" /></div>
      <div className="space-y-1">
        <Label className="label-muted">Scopes</Label>
        <div className="flex gap-2">
          {(["read", "write", "admin"] as const).map((s) => (
            <button key={s} type="button" onClick={() => toggleScope(s)}
              className={cn("px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                scopes.has(s) ? "bg-primary/8 text-primary border-primary/20" : "border-border/40 text-muted-foreground hover:text-foreground")}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => onClose()}>Cancelar</Button>
        <Button type="submit" disabled={saving} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Generando..." : "Generar key"}</Button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  const { state, createUser, saveProfile, deleteProfile, createApiKey, revokeApiKey } = useCrm();
  const [userOpen, setUserOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const isCeo = state.profile?.role === "ceo";
  if (!isCeo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Solo el CEO puede acceder a Admin.</p>
        </div>
      </div>
    );
  }

  async function handleCreateKey(name: string, scopes: ("read" | "write" | "admin")[]) {
    const result = await createApiKey(name, scopes);
    return result;
  }

  async function handleKeyCreated(key?: string) {
    setKeyOpen(false);
    if (key) setNewKey(key);
  }

  return (
    <div className="space-y-5">
      <AdminMetrics />
      <Tabs defaultValue="usuarios">
        <TabsList className="bg-muted/30 border border-border/40">
          <TabsTrigger value="usuarios" className="text-[12px]"><Users className="h-3.5 w-3.5 mr-1.5" />Usuarios</TabsTrigger>
          <TabsTrigger value="api-keys" className="text-[12px]"><Key className="h-3.5 w-3.5 mr-1.5" />API Keys</TabsTrigger>
          <TabsTrigger value="configuracion" className="text-[12px]"><Settings className="h-3.5 w-3.5 mr-1.5" />Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setUserOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nuevo usuario
            </Button>
          </div>
          <div className="space-y-2">
            {state.profiles.map((p) => {
              const rc = ROLE_CONFIG[p.role as Role] || ROLE_CONFIG.freelancer;
              const isSelf = p.id === state.profile?.id;
              return (
                <div key={p.id} className="metric-card rounded-lg p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground/90">{p.full_name || "—"}</p>
                      {isSelf && <span className="text-[10px] text-muted-foreground/50">(vos)</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{p.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold border", rc.class)}>{rc.label}</Badge>
                    <Select value={p.role} onValueChange={async (role) => {
                      try { await saveProfile({ ...p, role: role as Role }); toast.success("Rol actualizado"); } catch { toast.error("Error"); }
                    }}>
                      <SelectTrigger className="h-7 w-28 text-[11px] bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="freelancer">Freelancer</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="ceo">CEO</SelectItem></SelectContent>
                    </Select>
                    {!isSelf && (
                      <button onClick={async () => { try { await deleteProfile(p.id); toast.success("Usuario eliminado"); } catch { toast.error("Error"); } }}
                        className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Dialog open={userOpen} onOpenChange={setUserOpen}>
            <DialogContent className="bg-card border-border/60 max-w-md">
              <DialogHeader><DialogTitle className="text-heading">Nuevo usuario</DialogTitle></DialogHeader>
              <NewUserForm onSave={createUser} onClose={() => setUserOpen(false)} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="api-keys" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setKeyOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Generar API key
            </Button>
          </div>

          {/* New key display */}
          {newKey && (
            <div className="metric-card rounded-xl p-4 border border-[var(--success)]/20">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--success)] mb-1">API Key generada — copiala ahora, no se muestra de nuevo</p>
                  <code className="text-xs text-foreground/80 break-all">{newKey}</code>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copiada"); }}
                  className="p-1.5 text-muted-foreground hover:text-foreground shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <button onClick={() => setNewKey(null)} className="mt-2 text-[10px] text-muted-foreground/50 hover:text-muted-foreground">Descartar</button>
            </div>
          )}

          <div className="space-y-2">
            {state.apiKeys.map((k) => (
              <div key={k.id} className={cn("metric-card rounded-lg p-4 flex items-center justify-between gap-3", k.revoked_at && "opacity-50")}>
                <div>
                  <p className="font-medium text-foreground/90 text-sm">{k.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{k.key_prefix}•••</p>
                  <div className="flex gap-1 mt-1">
                    {k.scopes.map((s) => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">{s}</span>)}
                  </div>
                </div>
                {!k.revoked_at && (
                  <button onClick={async () => { try { await revokeApiKey(k.id); toast.success("Key revocada"); } catch { toast.error("Error"); } }}
                    className="text-[11px] text-destructive/70 hover:text-destructive">Revocar</button>
                )}
                {k.revoked_at && <span className="text-[11px] text-muted-foreground/40">Revocada</span>}
              </div>
            ))}
            {state.apiKeys.length === 0 && <div className="metric-card rounded-xl p-10 text-center"><p className="text-sm text-muted-foreground">Sin API keys.</p></div>}
          </div>

          <Dialog open={keyOpen} onOpenChange={setKeyOpen}>
            <DialogContent className="bg-card border-border/60 max-w-sm">
              <DialogHeader><DialogTitle className="text-heading">Nueva API key</DialogTitle></DialogHeader>
              <NewApiKeyForm onSave={handleCreateKey} onClose={handleKeyCreated} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="configuracion" className="mt-4">
          <SettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
