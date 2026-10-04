import React, { useEffect, useState } from "react";
import { Users, Activity, TrendingUp, AlertTriangle, Search, Music, Eye } from "lucide-react";
import { functions } from "../lib/appwrite";
import { theme } from "../components/ui";

async function getAnalytics() {
  const res = await functions.createExecution(
    "api",
    JSON.stringify({ action: "get-analytics" }),
    false
  );
  const raw = res?.responseBody ?? res?.response ?? "{}";
  return JSON.parse(raw);
}

function formatMs(ms) {
  if (!ms || ms < 1000) return `${Math.round((ms || 0) / 1000)}s`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m < 1) return `${s}s`;
  return `${m}m ${s % 60}s`;
}

export function AdminAnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshed, setRefreshed] = useState(new Date());

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAnalytics();
      if (!res.ok) throw new Error(res.error || "Failed");
      setData(res);
      setRefreshed(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) return <div style={{ padding: 60, textAlign: "center", opacity: 0.6 }}>Loading analytics…</div>;
  if (error && !data) return <div style={{ padding: 60, textAlign: "center", color: theme.danger }}>{error}</div>;
  if (!data) return null;

  const maxHourly = Math.max(...data.hourly, 1);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Analytics</div>
          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>
            Refreshed {refreshed.toLocaleTimeString()}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            background: theme.accent, color: "#fff",
            border: "none", borderRadius: 8,
            padding: "9px 16px", cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 26 }}>
        <StatCard icon={Activity} label="Events (all time)" value={data.totals.allTime} />
        <StatCard icon={TrendingUp} label="Last 24h" value={data.totals.last24h} accent="#4be88a" />
        <StatCard icon={Users} label="Active now (5m)" value={data.totals.activeSessions} accent="#7c5cff" />
        <StatCard icon={Eye} label="Avg session" value={formatMs(data.totals.avgSessionDurationMs)} accent="#ffb800" />
      </div>

      {/* Hourly chart */}
      <Section title="Events · last 24 hours">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100, padding: "8px 0" }}>
          {data.hourly.map((count, i) => (
            <div
              key={i}
              title={`${23 - i}h ago · ${count} events`}
              style={{
                flex: 1,
                height: `${Math.max(4, (count / maxHourly) * 100)}%`,
                background: count > 0 ? theme.accent : theme.border,
                borderRadius: 2,
                opacity: count > 0 ? 1 : 0.4,
                minWidth: 3,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.5, marginTop: 4 }}>
          <span>24h ago</span>
          <span>12h ago</span>
          <span>now</span>
        </div>
      </Section>

      {/* Top pages + songs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 26 }}>
        <Section title="Top pages" compact>
          {data.topPages.length === 0 && <Empty />}
          {data.topPages.map((p, i) => (
            <RankRow key={p.path} rank={i + 1} label={p.path} value={p.count} />
          ))}
        </Section>

        <Section title="Top songs" compact>
          {data.topSongs.length === 0 && <Empty />}
          {data.topSongs.map((s, i) => (
            <RankRow
              key={s.songId}
              rank={i + 1}
              icon={Music}
              label={s.title}
              sub={s.artistName}
              value={s.count}
            />
          ))}
        </Section>
      </div>

      {/* Event types */}
      <Section title="Event breakdown">
        {data.byType.length === 0 && <Empty />}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {data.byType.map((t) => (
            <div key={t.type} style={{
              background: theme.bgRaised,
              border: `1px solid ${theme.border}`,
              borderRadius: 20, padding: "6px 14px",
              fontSize: 12.5,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontWeight: 600 }}>{t.type}</span>
              <span style={{ opacity: 0.6 }}>{t.count}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Recent errors */}
      {data.recentErrors.length > 0 && (
        <Section title="Recent errors">
          {data.recentErrors.slice(0, 10).map((e, i) => (
            <div key={i} style={{
              padding: "10px 12px", marginBottom: 6,
              background: "rgba(255,107,107,0.08)",
              border: "1px solid rgba(255,107,107,0.3)",
              borderRadius: 8,
              fontSize: 12.5, lineHeight: 1.5,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <AlertTriangle size={13} color="#ff6b6b" />
                <span style={{ fontWeight: 600 }}>{e.page || "/"}</span>
                <span style={{ opacity: 0.5, fontSize: 11 }}>{new Date(e.$createdAt).toLocaleString()}</span>
              </div>
              <div style={{ opacity: 0.85, wordBreak: "break-word" }}>{e.metadata}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Recent searches */}
      {data.recentSearches.length > 0 && (
        <Section title="Recent searches">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.recentSearches.map((s, i) => (
              <div key={i} style={{
                background: theme.bgRaised,
                border: `1px solid ${theme.border}`,
                borderRadius: 16, padding: "5px 12px",
                fontSize: 12.5,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Search size={11} opacity={0.5} />
                {s.metadata}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children, compact }) {
  return (
    <div style={{ marginBottom: compact ? 0 : 26 }}>
      <div style={{
        fontSize: 11, opacity: 0.55,
        textTransform: "uppercase", letterSpacing: "0.07em",
        fontWeight: 700, marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={{
      background: theme.bgRaised,
      border: `1px solid ${theme.border}`,
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        <Icon size={12} color={accent || theme.text} /> {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: accent || theme.text }}>
        {value}
      </div>
    </div>
  );
}

function RankRow({ rank, icon: Icon, label, sub, value }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 10px", borderRadius: 6,
      background: rank <= 3 ? "rgba(124,92,255,0.06)" : "transparent",
    }}>
      <div style={{
        width: 22, fontSize: 12, fontWeight: 700, textAlign: "right",
        opacity: rank <= 3 ? 1 : 0.4, flexShrink: 0,
        color: rank === 1 ? "#ffb800" : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : theme.text,
      }}>
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
          {Icon && <Icon size={12} opacity={0.5} />}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        </div>
        {sub && <div style={{ fontSize: 11.5, opacity: 0.55, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7, flexShrink: 0 }}>{value}</div>
    </div>
  );
}

function Empty() {
  return <div style={{ opacity: 0.5, fontSize: 13, fontStyle: "italic" }}>No data yet.</div>;
}
