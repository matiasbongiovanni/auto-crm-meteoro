"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Suspense } from "react";

const ALLOWED_EMAILS = ["matiasweschta@gmail.com"];

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      router.replace("/login?error=auth");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.replace("/login?error=auth");
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }: { error: { message: string } | null }) => {
      if (error) {
        router.replace("/login?error=auth");
        return;
      }

      supabase.auth.getUser().then(({ data: { user } }: { data: { user: { email?: string } | null } }) => {
        if (!user?.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
          supabase.auth.signOut().then(() => {
            router.replace("/login?error=unauthorized");
          });
          return;
        }
        router.replace("/dashboard");
      });
    });
  }, [router, searchParams]);

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
