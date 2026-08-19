"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Credenciales incorrectas.");
        return;
      }
      router.push(`/portal/${data.slug}`);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#08080a] flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Iluminación ambiental */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[720px] rounded-full opacity-[0.14] blur-[120px]"
        style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full opacity-[0.06] blur-[100px] translate-x-1/3 translate-y-1/3"
        style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Image
            src="/brand/meteoro-logo-nuevo.png"
            alt="meteoro."
            width={281}
            height={89}
            className="h-11 w-auto object-contain drop-shadow-[0_2px_24px_rgba(255,255,255,0.18)]"
            priority
          />
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_30px_80px_-24px_rgba(0,0,0,0.85)]">
          <h1 className="text-white text-xl font-semibold mb-1 tracking-tight">Portal de clientes</h1>
          <p className="text-white/40 text-sm mb-7">Ingresá con tu email y contraseña.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/30 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.06)] transition-all"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/30 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.06)] transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold rounded-lg py-2.5 text-sm shadow-[0_8px_24px_-8px_rgba(255,255,255,0.35)] hover:bg-white/90 hover:shadow-[0_12px_32px_-8px_rgba(255,255,255,0.45)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          ¿Problemas para acceder? Contactá a tu equipo de meteoro.
        </p>
      </div>
    </div>
  );
}
