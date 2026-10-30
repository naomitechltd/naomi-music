import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { teaserApi, useMe } from "../lib/teasers";
import { TeaserCard } from "../components/TeaserRow";
import TeaserViewer from "../components/TeaserViewer";
import "../components/teasers.css";

export function UpcomingView() {
  const navigate = useNavigate();
  const me = useMe();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let off = false;
    teaserApi({ action: "list-teasers" }).then((o) => {
      if (off) return;
      if (Array.isArray(o.teasers)) setList(o.teasers);
      setLoading(false);
    });
    return () => { off = true; };
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 120px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", display: "grid", placeItems: "center" }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 32 }}>Upcoming</h1>
      </div>
      <p style={{ opacity: 0.6, fontSize: 13, marginTop: 0 }}>30-second teasers from artists. Each one disappears after 7 days.</p>
      {!loading && list.length === 0 && <div style={{ textAlign: "center", opacity: 0.6, padding: 40 }}>No teasers right now. Check back soon.</div>}
      <div className="tz-grid">
        {list.map((t, i) => <TeaserCard key={t.id} t={t} index={i} onOpen={setOpen} />)}
      </div>
      {open && <TeaserViewer teaser={open} me={me} onClose={() => setOpen(null)} onDeleted={(id) => setList((l) => l.filter((x) => x.id !== id))} />}
    </div>
  );
}
