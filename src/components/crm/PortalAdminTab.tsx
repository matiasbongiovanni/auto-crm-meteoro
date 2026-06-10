"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Plus, Trash2, ChevronUp, ChevronDown, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useCrm } from "@/components/crm/provider";
import type { PortalProject, PortalTask, PortalTaskCategory, PortalTaskStatus, PortalUpdateType, PortalUpdate } from "@/types/portal";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const CATEGORY_LABELS: Record<PortalTaskCategory, string> = {
  diseno: "Diseño", desarrollo: "Desarrollo", contenido: "Contenido",
  testing: "Testing", entrega: "Entrega", otro: "Otro",
};

const UPDATE_TYPE_LABELS: Record<PortalUpdateType, string> = {
  hito: "Hito", avance: "Avance", entrega: "Entrega", nota: "Nota",
};

const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-white/25 transition-colors";
const sel = `${inp} cursor-pointer`;
// Selects de tareas: fondo sólido para que las <option> no queden blancas en el dropdown del sistema
const taskSel = "text-xs bg-[#1c1c1c] border border-white/10 rounded px-1.5 py-1 text-white/60 outline-none cursor-pointer";

type Props = {
  clienteId: string;
  clienteNombre: string;
  clienteEmpresa?: string;
  clienteEmail?: string;
};

type TaskRow = PortalTask & { _new?: boolean };
type UpdateForm = { mensaje: string; tipo: PortalUpdateType; fecha: string };

export function PortalAdminTab({ clienteId, clienteNombre, clienteEmpresa, clienteEmail }: Props) {
  const { session } = useCrm();
  const [project, setProject] = useState<(PortalProject & { portal_user?: { email: string; nombre: string; invited_at?: string | null } | null }) | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Form de creación
  const [newProject, setNewProject] = useState({
    nombre_proyecto: clienteEmpresa ? `Desarrollo — ${clienteEmpresa}` : `Proyecto ${clienteNombre}`,
    slug: slugify(clienteEmpresa || clienteNombre),
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_estimada: "",
    descripcion: "",
    porcentaje_manual: "" as string | number,
  });
  const [newTasks, setNewTasks] = useState<TaskRow[]>([]);

  // Tareas
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [savingTasks, setSavingTasks] = useState(false);

  // Updates
  const [updates, setUpdates] = useState<PortalUpdate[]>([]);
  const [updateForm, setUpdateForm] = useState<UpdateForm>({ mensaje: "", tipo: "avance", fecha: new Date().toISOString().slice(0, 10) });
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Invite
  const [inviteForm, setInviteForm] = useState({ nombre: "", email: clienteEmail || "" });
  const [inviting, setInviting] = useState(false);

  // Copy link
  const [copied, setCopied] = useState(false);

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || (typeof window !== "undefined" ? window.location.origin : "");

  const fetchProject = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/admin?cliente_id=${clienteId}`, {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.project) {
        setProject(data.project);
        const sortedTasks = (data.project.tasks || []).sort((a: PortalTask, b: PortalTask) => a.orden - b.orden);
        setTasks(sortedTasks);
        const sortedUpdates = (data.project.updates || []).sort((a: PortalUpdate, b: PortalUpdate) => b.fecha.localeCompare(a.fecha));
        setUpdates(sortedUpdates);
      } else {
        setProject(null);
      }
    } catch { toast.error("Error al cargar el portal."); } finally { setLoading(false); }
  }, [clienteId, session?.access_token]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  async function createProject() {
    if (!session?.access_token || !newProject.slug) return;
    const newId = crypto.randomUUID();
    try {
      const res = await fetch("/api/portal/admin", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: "save-project",
          project: {
            ...newProject,
            fecha_inicio: newProject.fecha_inicio || null,
            fecha_estimada: newProject.fecha_estimada || null,
            porcentaje_manual: newProject.porcentaje_manual === "" ? null : Number(newProject.porcentaje_manual),
            cliente_id: clienteId,
            id: newId,
            activo: true,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error || "Error al crear portal."); return; }
      // Save initial tasks if any
      if (newTasks.length > 0) {
        await fetch("/api/portal/admin", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: "save-tasks", project_id: newId, tasks: newTasks.map((t, i) => ({ ...t, project_id: newId, orden: i })) }),
        });
      }
      toast.success("Portal creado.");
      fetchProject();
    } catch { toast.error("Error al crear portal."); }
  }

  async function saveProjectSettings() {
    if (!session?.access_token || !project) return;
    try {
      const res = await fetch("/api/portal/admin", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "save-project", project: { id: project.id, cliente_id: clienteId, slug: project.slug, nombre_proyecto: project.nombre_proyecto, descripcion: project.descripcion, fecha_inicio: project.fecha_inicio || null, fecha_estimada: project.fecha_estimada || null, activo: project.activo, porcentaje_manual: project.porcentaje_manual } }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error); return; }
      toast.success("Guardado.");
    } catch { toast.error("Error al guardar."); }
  }

  async function saveTasks() {
    if (!session?.access_token || !project) return;
    setSavingTasks(true);
    try {
      const res = await fetch("/api/portal/admin", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "save-tasks", project_id: project.id, tasks: tasks.map((t, i) => ({ ...t, orden: i })) }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error); return; }
      toast.success("Tareas guardadas.");
      fetchProject();
    } catch { toast.error("Error al guardar tareas."); } finally { setSavingTasks(false); }
  }

  async function publishUpdate() {
    if (!session?.access_token || !project || !updateForm.mensaje.trim()) return;
    setSavingUpdate(true);
    try {
      const res = await fetch("/api/portal/admin", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "save-update", update: { id: crypto.randomUUID(), project_id: project.id, ...updateForm } }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error); return; }
      toast.success("Update publicado.");
      setUpdateForm({ mensaje: "", tipo: "avance", fecha: new Date().toISOString().slice(0, 10) });
      fetchProject();
    } catch { toast.error("Error al publicar."); } finally { setSavingUpdate(false); }
  }

  async function deleteUpdate(id: string) {
    if (!session?.access_token) return;
    await fetch("/api/portal/admin", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: "delete-update", id }),
    });
    setUpdates((prev) => prev.filter((u) => u.id !== id));
    toast.success("Update eliminado.");
  }

  async function sendInvite() {
    if (!session?.access_token || !project || !inviteForm.email || !inviteForm.nombre) return;
    setInviting(true);
    try {
      const res = await fetch("/api/portal/admin", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "invite-user", project_id: project.id, nombre: inviteForm.nombre, email: inviteForm.email, slug: project.slug }),
      });
      const data = await res.json();
      if (!data.ok) { toast.error(data.error || "Error al enviar invitación."); return; }
      toast.success(data.resent ? "Invitación reenviada." : "Invitación enviada por email.");
      fetchProject();
    } catch { toast.error("Error al enviar invitación."); } finally { setInviting(false); }
  }

  function copyLink() {
    if (!project) return;
    navigator.clipboard.writeText(`${portalUrl}/portal/${project.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function moveTask(index: number, dir: -1 | 1) {
    const next = [...tasks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setTasks(next);
  }

  if (loading) {
    return <div className="py-6 text-center text-white/30 text-sm">Cargando portal...</div>;
  }

  // ── Sin proyecto: formulario de creación ──────────────────────────────────
  if (project === null) {
    return (
      <div className="space-y-5 py-2">
        <p className="text-xs text-white/40">Este cliente no tiene portal activo. Completá la información del proyecto y crealo.</p>

        {/* Info del proyecto */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Información del proyecto</p>
          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Nombre del proyecto</label>
            <input className={inp} value={newProject.nombre_proyecto} onChange={(e) => setNewProject((p) => ({ ...p, nombre_proyecto: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">URL del portal</label>
            <div className="flex items-stretch border border-white/10 rounded-lg overflow-hidden focus-within:border-white/25 transition-colors">
              <div className="flex items-center gap-1.5 px-2.5 bg-white/[0.03] border-r border-white/10 shrink-0">
                <span className="text-[11px] font-bold tracking-widest text-white/50">meteoro.</span>
                <span className="text-[10px] text-white/20 font-mono">/portal/</span>
              </div>
              <input
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white/80 placeholder:text-white/20 outline-none font-mono"
                value={newProject.slug}
                onChange={(e) => setNewProject((p) => ({ ...p, slug: slugify(e.target.value) }))}
                placeholder="nombre-cliente"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Descripción / alcance del proyecto</label>
            <textarea className={`${inp} resize-none`} rows={3} placeholder="Ej: Desarrollo de sitio web institucional con 5 secciones, integración con CRM y formulario de contacto." value={newProject.descripcion} onChange={(e) => setNewProject((p) => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Fecha de inicio</label>
              <input type="date" className={inp} value={newProject.fecha_inicio} onChange={(e) => setNewProject((p) => ({ ...p, fecha_inicio: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Entrega estimada</label>
              <input type="date" className={inp} value={newProject.fecha_estimada} onChange={(e) => setNewProject((p) => ({ ...p, fecha_estimada: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">% de avance inicial (vacío = calculado por tareas)</label>
            <input type="number" min={0} max={100} className={inp} value={newProject.porcentaje_manual} onChange={(e) => setNewProject((p) => ({ ...p, porcentaje_manual: e.target.value }))} placeholder="0–100, dejar vacío para auto" />
          </div>
        </div>

        {/* Tareas iniciales */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Tareas del proyecto</p>
            <button
              onClick={() => setNewTasks((prev) => [...prev, { id: crypto.randomUUID(), project_id: "", titulo: "", category: "desarrollo", status: "pendiente", orden: prev.length, _new: true }])}
              className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
            >
              <Plus className="h-3 w-3" /> Agregar
            </button>
          </div>
          {newTasks.length === 0 && (
            <p className="text-xs text-white/20 py-1">Sin tareas. Podés agregar antes o después de crear el portal.</p>
          )}
          <div className="space-y-2">
            {newTasks.map((task, i) => (
              <div key={task.id} className="bg-white/3 border border-white/8 rounded-lg p-2.5 flex items-center gap-2">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => { const n = [...newTasks]; if (i > 0) { [n[i], n[i-1]] = [n[i-1], n[i]]; setNewTasks(n); } }} disabled={i === 0} className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors"><ChevronUp className="h-3 w-3" /></button>
                  <button onClick={() => { const n = [...newTasks]; if (i < n.length-1) { [n[i], n[i+1]] = [n[i+1], n[i]]; setNewTasks(n); } }} disabled={i === newTasks.length - 1} className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors"><ChevronDown className="h-3 w-3" /></button>
                </div>
                <input className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none min-w-0 border-b border-white/10 pb-0.5" value={task.titulo} onChange={(e) => setNewTasks((prev) => prev.map((t, j) => j === i ? { ...t, titulo: e.target.value } : t))} placeholder="Título de la tarea" />
                <select value={task.category} onChange={(e) => setNewTasks((prev) => prev.map((t, j) => j === i ? { ...t, category: e.target.value as PortalTaskCategory } : t))} className={taskSel}>
                  {(Object.entries(CATEGORY_LABELS) as [PortalTaskCategory, string][]).map(([val, lbl]) => (<option key={val} value={val}>{lbl}</option>))}
                </select>
                <select value={task.status} onChange={(e) => setNewTasks((prev) => prev.map((t, j) => j === i ? { ...t, status: e.target.value as PortalTaskStatus } : t))} className={taskSel}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En progreso</option>
                  <option value="completada">Completada</option>
                </select>
                <button onClick={() => setNewTasks((prev) => prev.filter((_, j) => j !== i))} className="text-white/20 hover:text-red-400 transition-colors shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={createProject} disabled={!newProject.slug || !newProject.nombre_proyecto} className="w-full bg-white text-black font-semibold rounded-lg py-2.5 text-sm hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Crear portal
        </button>
      </div>
    );
  }

  // ── Portal existente ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 py-2">

      {/* Link del portal */}
      <div className="bg-[#0d0d0d] border border-white/10 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-white/[0.06]">
          <span className="text-[11px] font-bold tracking-widest text-white/60">meteoro.</span>
          <span className="text-[10px] text-white/20 uppercase tracking-wider">portal del cliente</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-2">
          <code className="text-[11px] text-white/40 flex-1 truncate font-mono">
            {portalUrl.replace(/^https?:\/\//, "")}/portal/<span className="text-white/70">{project?.slug}</span>
          </code>
          <button onClick={copyLink} className="p-1.5 text-white/30 hover:text-white transition-colors rounded" title="Copiar link">
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <a href={`/portal/${project?.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-white/30 hover:text-white transition-colors rounded">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Configuración del proyecto */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Configuración</p>
        <div>
          <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Nombre del proyecto</label>
          <input className={inp} value={project?.nombre_proyecto || ""} onChange={(e) => setProject((p) => p ? { ...p, nombre_proyecto: e.target.value } : p)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Entrega estimada</label>
            <input type="date" className={inp} value={project?.fecha_estimada || ""} onChange={(e) => setProject((p) => p ? { ...p, fecha_estimada: e.target.value } : p)} />
          </div>
          <div>
            <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">% manual (vacío = auto)</label>
            <input type="number" min={0} max={100} className={inp} value={project?.porcentaje_manual ?? ""} onChange={(e) => setProject((p) => p ? { ...p, porcentaje_manual: e.target.value === "" ? null : Number(e.target.value) } : p)} placeholder="Auto" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Descripción</label>
          <textarea className={`${inp} resize-none`} rows={2} value={project?.descripcion || ""} onChange={(e) => setProject((p) => p ? { ...p, descripcion: e.target.value } : p)} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="portal-activo" checked={project?.activo ?? true} onChange={(e) => setProject((p) => p ? { ...p, activo: e.target.checked } : p)} className="rounded" />
          <label htmlFor="portal-activo" className="text-sm text-white/60">Portal activo</label>
        </div>
        <button onClick={saveProjectSettings} className="w-full bg-white/10 text-white rounded-lg py-2 text-sm hover:bg-white/15 transition-colors">
          Guardar configuración
        </button>
      </div>

      {/* Acceso del cliente */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Acceso del cliente</p>
        {project?.portal_user ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
            <p className="text-sm text-white/70">{project.portal_user.nombre}</p>
            <p className="text-xs text-white/40">{project.portal_user.email}</p>
            {project.portal_user.invited_at && (
              <p className="text-[11px] text-white/25">Invitado el {new Date(project.portal_user.invited_at).toLocaleDateString("es-AR")}</p>
            )}
            <button onClick={sendInvite} disabled={inviting} className="mt-2 text-xs text-white/50 hover:text-white underline transition-colors">
              {inviting ? "Reenviando..." : "Reenviar invitación"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {!clienteEmail && (
              <p className="text-[11px] text-amber-400/70 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                Este cliente no tiene email guardado. Ingresá el email de contacto para enviar la invitación.
              </p>
            )}
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Nombre del cliente</label>
              <input className={inp} value={inviteForm.nombre} onChange={(e) => setInviteForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: María García" />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Email</label>
              <input type="email" className={inp} value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} placeholder="cliente@empresa.com" />
            </div>
            <button onClick={sendInvite} disabled={inviting || !inviteForm.email || !inviteForm.nombre} className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold rounded-lg py-2 text-sm hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="h-3.5 w-3.5" />
              {inviting ? "Enviando..." : "Enviar invitación por email"}
            </button>
          </div>
        )}
      </div>

      {/* Tareas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Tareas</p>
          <button
            onClick={() => setTasks((prev) => [...prev, { id: crypto.randomUUID(), project_id: project?.id || "", titulo: "", category: "desarrollo", status: "pendiente", orden: prev.length, _new: true }])}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
          >
            <Plus className="h-3 w-3" /> Agregar
          </button>
        </div>

        {tasks.length === 0 && (
          <p className="text-xs text-white/20 py-2">Sin tareas. Hacé clic en "Agregar" para crear la primera.</p>
        )}

        <div className="space-y-2">
          {tasks.map((task, i) => (
            <div key={task.id} className="bg-white/3 border border-white/8 rounded-lg p-2.5 flex items-center gap-2">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveTask(i, -1)} disabled={i === 0} className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors">
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button onClick={() => moveTask(i, 1)} disabled={i === tasks.length - 1} className="text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors">
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <input
                className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none min-w-0 border-b border-white/10 pb-0.5"
                value={task.titulo}
                onChange={(e) => setTasks((prev) => prev.map((t, j) => j === i ? { ...t, titulo: e.target.value } : t))}
                placeholder="Título de la tarea"
              />
              <select
                value={task.category}
                onChange={(e) => setTasks((prev) => prev.map((t, j) => j === i ? { ...t, category: e.target.value as PortalTaskCategory } : t))}
                className={taskSel}
              >
                {(Object.entries(CATEGORY_LABELS) as [PortalTaskCategory, string][]).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
              <select
                value={task.status}
                onChange={(e) => setTasks((prev) => prev.map((t, j) => j === i ? { ...t, status: e.target.value as PortalTaskStatus } : t))}
                className={taskSel}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En progreso</option>
                <option value="completada">Completada</option>
              </select>
              <button onClick={() => setTasks((prev) => prev.filter((_, j) => j !== i))} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {tasks.length > 0 && (
          <button onClick={saveTasks} disabled={savingTasks} className="w-full bg-white/10 text-white rounded-lg py-2 text-sm hover:bg-white/15 transition-colors disabled:opacity-50">
            {savingTasks ? "Guardando..." : "Guardar tareas"}
          </button>
        )}
      </div>

      {/* Updates / Timeline */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Timeline / Updates</p>

        <div className="space-y-2">
          <textarea
            className={`${inp} resize-none`}
            rows={2}
            value={updateForm.mensaje}
            onChange={(e) => setUpdateForm((f) => ({ ...f, mensaje: e.target.value }))}
            placeholder="Escribí un update para el cliente..."
          />
          <div className="flex gap-2">
            <select
              value={updateForm.tipo}
              onChange={(e) => setUpdateForm((f) => ({ ...f, tipo: e.target.value as PortalUpdateType }))}
              className={`${sel} flex-1`}
            >
              {(Object.entries(UPDATE_TYPE_LABELS) as [PortalUpdateType, string][]).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
            <input
              type="date"
              value={updateForm.fecha}
              onChange={(e) => setUpdateForm((f) => ({ ...f, fecha: e.target.value }))}
              className={`${inp} flex-1`}
            />
          </div>
          <button
            onClick={publishUpdate}
            disabled={savingUpdate || !updateForm.mensaje.trim()}
            className="w-full bg-white/10 text-white rounded-lg py-2 text-sm hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            {savingUpdate ? "Publicando..." : "Publicar update"}
          </button>
        </div>

        {updates.length > 0 && (
          <div className="space-y-2 mt-3">
            {updates.map((u) => (
              <div key={u.id} className="bg-white/3 border border-white/8 rounded-lg p-2.5 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase text-white/40">{UPDATE_TYPE_LABELS[u.tipo]}</span>
                    <span className="text-[10px] text-white/25">{u.fecha}</span>
                  </div>
                  <p className="text-xs text-white/60 line-clamp-2">{u.mensaje}</p>
                </div>
                <button onClick={() => deleteUpdate(u.id)} className="text-white/20 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
