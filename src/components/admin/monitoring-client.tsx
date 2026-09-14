"use client";

import { useState, useTransition } from "react";
import {
  Database,
  Cpu,
  Clock,
  Zap,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Gauge,
} from "lucide-react";
import { triggerSystemOptimizationAction } from "@/src/modules/admin/actions";

export function MonitoringClient() {
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTrigger = (action: "purge_sessions" | "run_expiry" | "retry_outbox" | "ping_db") => {
    startTransition(async () => {
      const res = await triggerSystemOptimizationAction(action);
      setFeedback({ success: res.success, message: res.message });
      setTimeout(() => setFeedback(null), 6000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            feedback.success
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className={feedback.success ? "text-emerald-300" : "text-red-300"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* System Health Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DB Connection Pool */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#12141a] space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Veritabanı Havuzu</span>
            <Database className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">4 / 20</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              %20 Doluluk • 16 Bağlantı Boşta
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full w-[20%]" />
          </div>
        </div>

        {/* Query Latency */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#12141a] space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Ortalama SQL Gecikmesi</span>
            <Gauge className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">3.8 ms</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              Kusursuz • Eşik Değeri: 200ms
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[5%]" />
          </div>
        </div>

        {/* Memory / Heap Usage */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#12141a] space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Node.js Heap Belleği</span>
            <Cpu className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">84 MB</div>
            <div className="text-[10px] text-purple-400 font-mono mt-0.5">
              Toplam Ayrılan: 142 MB (RSS: 198 MB)
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full w-[45%]" />
          </div>
        </div>

        {/* 7-Day Expiry Worker */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#12141a] space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">7 Günlük Radar Worker</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">Aktif</div>
            <div className="text-[10px] text-amber-400 font-mono mt-0.5">
              Son Döngü: 12 dk önce • 0 Hata
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full w-[100%] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Optimization Control Panel */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-[#12141a] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>Sistem Optimizasyonu & Manuel Bakım Araçları</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Veritabanı, bellek ve arka plan kuyruklarını tek tıkla optimize edin.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Purge Sessions */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-xs text-white">Önbellek & Oturum Temizliği</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Süresi dolmuş geçici JWT oturumlarını ve rate-limit önbelleğini sıfırlar.
              </p>
            </div>
            <button
              onClick={() => handleTrigger("purge_sessions")}
              disabled={isPending}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
              <span>Önbelleği Temizle</span>
            </button>
          </div>

          {/* Action 2: Run Expiry */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-xs text-white">7 Günlük Radarı Çalıştır</div>
              <p className="text-[11px] text-slate-400 mt-1">
                1 haftası dolan ilanları tespit edip atomik olarak INACTIVE durumuna alır.
              </p>
            </div>
            <button
              onClick={() => handleTrigger("run_expiry")}
              disabled={isPending}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Döngüyü Tetikle</span>
            </button>
          </div>

          {/* Action 3: Retry Outbox */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-xs text-white">Kuyruğu Yeniden Dene</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Geçici ağ hatasıyla bekleyen transactional outbox bildirimlerini zorlar.
              </p>
            </div>
            <button
              onClick={() => handleTrigger("retry_outbox")}
              disabled={isPending}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
              <span>Kuyruğu İşle</span>
            </button>
          </div>

          {/* Action 4: Ping DB */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-xs text-white">Canlı Ping & Sağlık Testi</div>
              <p className="text-[11px] text-slate-400 mt-1">
                PostgreSQL havuzuna anlık 'SELECT 1' sorgusu göndererek gecikmeyi ölçer.
              </p>
            </div>
            <button
              onClick={() => handleTrigger("ping_db")}
              disabled={isPending}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span>Ping Testi Yap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
