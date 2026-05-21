import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, BarChart3, Clock, Globe2, MonitorSmartphone, Radio, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";

function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat().format(Number(value ?? 0));
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type NamedMetric = {
  name: string | null;
  total: number;
};

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof Activity; label: string; value: string; hint: string }) {
  return (
    <article className="border-2 border-stone-800 bg-[#14110f] p-5 shadow-[8px_8px_0_#000]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-['IBM_Plex_Sans'] text-[0.65rem] uppercase tracking-[0.28em] text-amber-200/60">{label}</p>
          <p className="mt-2 font-['Space_Grotesk'] text-3xl font-black tracking-[-0.05em] text-stone-50">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center border border-cyan-300/30 bg-cyan-950/30 text-cyan-100 shadow-[4px_4px_0_#000]">
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-stone-500">{hint}</p>
    </article>
  );
}

function RankingPanel({ title, items, emptyLabel }: { title: string; items: NamedMetric[]; emptyLabel: string }) {
  const max = Math.max(1, ...items.map(item => Number(item.total ?? 0)));
  return (
    <section className="border-2 border-stone-800 bg-[#14110f] p-5 shadow-[8px_8px_0_#000]">
      <h2 className="font-['Space_Grotesk'] text-lg font-black uppercase tracking-[-0.04em] text-stone-100">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map(item => {
            const label = item.name || "Unknown";
            const total = Number(item.total ?? 0);
            return (
              <div key={`${title}-${label}`}>
                <div className="mb-1 flex items-center justify-between gap-3 font-['IBM_Plex_Sans'] text-[0.68rem] uppercase tracking-[0.18em] text-stone-400">
                  <span className="truncate">{label}</span>
                  <span className="text-amber-200">{formatNumber(total)}</span>
                </div>
                <div className="h-2 border border-stone-800 bg-black/50">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-amber-300" style={{ width: `${Math.max(6, Math.round((total / max) * 100))}%` }} />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-stone-500">{emptyLabel}</p>
        )}
      </div>
    </section>
  );
}

export default function AnalyticsDashboard() {
  const [days, setDays] = useState(14);
  const overviewQuery = trpc.analytics.overview.useQuery({ days }, { refetchInterval: 60_000, retry: 1 });
  const sessionsQuery = trpc.analytics.sessions.useQuery({ limit: 30 }, { refetchInterval: 60_000, retry: 1 });

  const overview = overviewQuery.data;
  const dailyMax = useMemo(
    () => Math.max(1, ...(overview?.dailyEvents ?? []).map(item => Number(item.total ?? 0))),
    [overview?.dailyEvents],
  );

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-[#0b0a09] p-5 text-stone-100 md:p-8">
        <header className="flex flex-col gap-5 border-2 border-stone-800 bg-[#191512] p-5 shadow-[10px_10px_0_#000] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-['IBM_Plex_Sans'] text-[0.68rem] uppercase tracking-[0.34em] text-cyan-200/70">Color Lines Command Console</p>
            <h1 className="mt-2 font-['Space_Grotesk'] text-4xl font-black uppercase tracking-[-0.07em] text-stone-50 md:text-5xl">Analytics Dashboard</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-400">
              Privacy-friendly product analytics for feature demand, sessions, browser/platform mix, approximate locations and live activity. The dashboard stores anonymous session IDs and optional authenticated user IDs, but avoids collecting names, emails or raw IP addresses.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30, 90].map(option => (
              <Button
                key={option}
                type="button"
                variant={days === option ? "default" : "outline"}
                onClick={() => setDays(option)}
                className="font-['IBM_Plex_Sans'] text-[0.65rem] uppercase tracking-[0.22em]"
              >
                {option}d
              </Button>
            ))}
          </div>
        </header>

        {overviewQuery.error ? (
          <section className="mt-6 border-2 border-red-950 bg-red-950/20 p-5 text-red-100 shadow-[8px_8px_0_#000]">
            <h2 className="font-['Space_Grotesk'] text-xl font-black uppercase">Access unavailable</h2>
            <p className="mt-2 text-sm text-red-100/80">Analytics dashboard requires an admin account. Error: {overviewQuery.error.message}</p>
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Activity} label="Events" value={formatNumber(overview?.totals.events)} hint={`Tracked events over the last ${days} days.`} />
          <MetricCard icon={Users} label="Sessions" value={formatNumber(overview?.totals.sessions)} hint="Unique anonymous player sessions seen in the selected period." />
          <MetricCard icon={Radio} label="Online Now" value={formatNumber(overview?.totals.onlinePlayers)} hint="Sessions with a heartbeat or event in the last 3 minutes." />
          <MetricCard icon={ShieldCheck} label="Privacy Mode" value="ON" hint="No raw IP, no email, no personal profile data in event rows." />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="border-2 border-stone-800 bg-[#14110f] p-5 shadow-[8px_8px_0_#000]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-['Space_Grotesk'] text-lg font-black uppercase tracking-[-0.04em] text-stone-100">Daily Event Volume</h2>
              <BarChart3 className="text-amber-200" size={20} />
            </div>
            <div className="mt-6 flex h-52 items-end gap-2 border-b border-l border-stone-800 px-2 pb-2">
              {(overview?.dailyEvents ?? []).length ? (
                overview!.dailyEvents.map(item => {
                  const total = Number(item.total ?? 0);
                  return (
                    <div key={String(item.day)} className="group flex min-w-5 flex-1 flex-col items-center justify-end gap-2">
                      <div className="w-full border border-cyan-200/40 bg-cyan-400/80 shadow-[2px_2px_0_#000]" style={{ height: `${Math.max(6, Math.round((total / dailyMax) * 100))}%` }} title={`${String(item.day)}: ${total}`} />
                      <span className="hidden rotate-[-45deg] whitespace-nowrap text-[0.55rem] text-stone-600 md:block">{String(item.day).slice(5)}</span>
                    </div>
                  );
                })
              ) : (
                <p className="self-center text-sm text-stone-500">No event data yet. Play a session to seed analytics.</p>
              )}
            </div>
          </section>

          <RankingPanel title="Top Events" items={overview?.topEvents ?? []} emptyLabel="No tracked events yet." />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <RankingPanel title="Browsers" items={overview?.topBrowsers ?? []} emptyLabel="No browser data yet." />
          <RankingPanel title="Platforms" items={overview?.topPlatforms ?? []} emptyLabel="No platform data yet." />
          <RankingPanel title="Locations" items={overview?.topLocations ?? []} emptyLabel="No location data yet." />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <section className="border-2 border-stone-800 bg-[#14110f] p-5 shadow-[8px_8px_0_#000]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-['Space_Grotesk'] text-lg font-black uppercase tracking-[-0.04em] text-stone-100">Recent Events</h2>
              <Clock className="text-cyan-200" size={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="font-['IBM_Plex_Sans'] uppercase tracking-[0.18em] text-stone-500">
                  <tr><th className="py-2">Time</th><th>Event</th><th>Category</th><th>Browser</th><th>Location</th></tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {(overview?.recentEvents ?? []).map((event, index) => (
                    <tr key={`${event.sessionId}-${event.eventName}-${index}`} className="text-stone-300">
                      <td className="py-2 text-stone-500">{formatDate(event.createdAt)}</td>
                      <td className="font-semibold text-amber-100">{event.eventName}</td>
                      <td>{event.category}</td>
                      <td>{event.browser || "Unknown"}</td>
                      <td>{event.location || "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(overview?.recentEvents ?? []).length ? <p className="py-6 text-sm text-stone-500">No recent events yet.</p> : null}
            </div>
          </section>

          <section className="border-2 border-stone-800 bg-[#14110f] p-5 shadow-[8px_8px_0_#000]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-['Space_Grotesk'] text-lg font-black uppercase tracking-[-0.04em] text-stone-100">Recent Sessions</h2>
              <MonitorSmartphone className="text-amber-200" size={20} />
            </div>
            <div className="space-y-3">
              {(sessionsQuery.data ?? []).map(session => (
                <article key={session.sessionId} className="border border-stone-800 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-['IBM_Plex_Sans'] text-[0.62rem] uppercase tracking-[0.18em] text-stone-500">{session.sessionId.slice(0, 8)}…</p>
                    <p className="text-xs text-cyan-100">{formatNumber(session.eventCount)} events</p>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-stone-400 md:grid-cols-2">
                    <span><Globe2 className="mr-1 inline" size={12} />{session.location || "Unknown"}</span>
                    <span>{session.browser || "Unknown"} · {session.platform || "Unknown"}</span>
                    <span>Last: {session.lastEventName || "—"}</span>
                    <span>{formatDate(session.lastSeenAt)}</span>
                  </div>
                </article>
              ))}
              {!(sessionsQuery.data ?? []).length ? <p className="text-sm text-stone-500">No recent sessions yet.</p> : null}
            </div>
          </section>
        </section>
      </main>
    </DashboardLayout>
  );
}
