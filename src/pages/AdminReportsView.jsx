import React, { useEffect, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { listReports, resolveReport } from "../lib/api";
import { theme, Button } from "../components/ui";

export function AdminReportsView() {
  const [open, setOpen] = useState([]);
  const [resolved, setResolved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await listReports();
      setOpen(res.open || []);
      setResolved(res.resolved || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    setBusyId(id);
    try {
      await resolveReport(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px 100px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Reports</div>
      {error && <div style={{ color: theme.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ opacity: 0.6, fontSize: 13 }}>Loading…</div>}

      <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Open ({open.length})
      </div>

      {!loading && open.length === 0 && <div style={{ opacity: 0.6, fontSize: 13, marginBottom: 24 }}>No open reports.</div>}

      {open.map((r) => (
        <div key={r.$id} style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={16} color="#ff9a00" />
            <div style={{ fontSize: 13, fontWeight: 700 }}>{r.reason}</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginLeft: "auto" }}>{r.targetType}</div>
          </div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>{r.targetLabel || r.targetId}</div>
          {r.notes && <div style={{ fontSize: 12.5, opacity: 0.75, marginBottom: 8, lineHeight: 1.5 }}>{r.notes}</div>}
          <div style={{ fontSize: 11.5, opacity: 0.55, marginBottom: 10 }}>
            By {r.reporterEmail || r.reporterUserId}
          </div>
          <Button onClick={() => resolve(r.$id)} disabled={busyId === r.$id}>
            <Check size={14} /> {busyId === r.$id ? "…" : "Mark resolved"}
          </Button>
        </div>
      ))}

      <div style={{ fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 30, marginBottom: 10 }}>
        Resolved ({resolved.length})
      </div>

      {resolved.slice(0, 20).map((r) => (
        <div key={r.$id} style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: 12, marginBottom: 8, opacity: 0.6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{r.reason} · {r.targetLabel || r.targetId}</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>{r.reporterEmail}</div>
        </div>
      ))}
    </div>
  );
}
