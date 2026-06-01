"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

const ALLOWED_EMAILS = ["matiasweschta@gmail.com"];

function CallbackContent() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.replace("/login?error=auth");
      return;
    }

    let done = false;

    async function handleSession(session: Session | null) {
      if (done) return;
      done = true;

      if (!session?.user?.email) {
        router.replace("/login?error=auth");
        return;
      }

      if (!ALLOWED_EMAILS.includes(session.user.email.toLowerCase())) {
        await supabase!.auth.signOut();
        router.replace("/login?error=unauthorized");
        return;
      }

      router.replace("/dashboard");
    }

    // detectSessionInUrl: true (default) handles the code exchange automatically.
    // We listen for the result instead of calling exchangeCodeForSession manually.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") handleSession(session);
      if (event === "INITIAL_SESSION" && session) handleSession(session);
    });

    // Fallback: si no hay evento en 10s, algo falló
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        router.replace("/login?error=auth");
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Autenticando...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
