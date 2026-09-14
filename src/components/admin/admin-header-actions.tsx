"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogOut, UserMinus, ShieldCheck } from "lucide-react";

interface AdminHeaderActionsProps {
  currentRole: string;
}

export function AdminHeaderActions({ currentRole }: AdminHeaderActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleSwitchToNormalUser = () => {
    startTransition(async () => {
      await fetch("/api/admin/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "USER" }),
      });
      window.location.reload();
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      try {
        if (
          typeof window !== "undefined" &&
          (window as unknown as { Clerk?: { signOut?: () => Promise<void> } }).Clerk?.signOut
        ) {
          try {
            await (
              window as unknown as { Clerk: { signOut: () => Promise<void> } }
            ).Clerk.signOut();
          } catch {
            // Ignore Clerk client signOut error
          }
        }
      } catch {
        // Ignore
      }
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/tr";
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>{currentRole}</span>
      </div>

      <button
        onClick={handleSwitchToNormalUser}
        disabled={isPending}
        title="Oturumu USER rolüne çekerek 403 engelleme ekranını test edin"
        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-medium transition-colors flex items-center gap-1"
      >
        <UserMinus className="h-3 w-3" />
        <span className="hidden sm:inline">Yetkisizliği Test Et (USER)</span>
      </button>

      <Link
        href="/tr/panel/ilanlarim"
        className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-800/40 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
      >
        İlanlarım / Panel
      </Link>

      <button
        onClick={handleLogout}
        disabled={isPending}
        title="Admin Oturumunu Kapat"
        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
