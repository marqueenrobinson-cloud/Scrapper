"use client";

import { useState } from "react";

export default function ShotlistPage() {
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [shotlist, setShotlist] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [footage, setFootage] = useState([]);
  const [findingFootage, setFindingFootage] = useState(false);

  async function handleRun() {
    setError("");
    setShotlist([]);
    setFootage([]);
    setLoading(true);
    try {
      const res = await fetch("/api/shotlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      setShotlist(data.shotlist || []);
      setTotal(data.totalSeconds || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFindFootage() {
    setError("");
    setFindingFootage(true);
    try {
      const res = await fetch("/api/footage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotlist, orientation: "portrait" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      setFootage(data.footage || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setFindingFootage(false);
    }
  }

  // Merge footage into shots by index for display
  const footageByIndex = {};
  footage.forEach((f) => { footageByIndex[f.index] = f; });

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <h1 style={styles.h1}>Shot List Builder</h1>
        <p style={styles.sub}>
          Paste a script. See the B-roll plan: what shows on screen, and when.
        </p>

        <textarea
          style={styles.textarea}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Paste your narration script here..."
          rows={6}
        />
        <button
          style={{ ...styles.button, opacity: loading || !script ? 0.5 : 1 }}
          onClick={handleRun}
          disabled={loading || !script}
        >
          {loading ? "Building…" : "Build Shot List"}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        {shotlist.length > 0 && (
          <div style={styles.totalBar}>
            {shotlist.length} shots · ~{total}s total
          </div>
        )}

        {shotlist.length > 0 && (
          <button
            style={{ ...styles.footageBtn, opacity: findingFootage ? 0.5 : 1 }}
            onClick={handleFindFootage}
            disabled={findingFootage}
          >
            {findingFootage ? "Finding footage…" : "🎞️ Find Footage"}
          </button>
        )}

        {footage.length > 0 && (
          <div style={styles.totalBar}>
            Found footage for {footage.filter((f) => f.found).length} of{" "}
            {footage.length} shots
          </div>
        )}

        <div style={styles.list}>
          {shotlist.map((b) => {
            const f = footageByIndex[b.index];
            return (
              <div key={b.index} style={styles.beat}>
                <div style={styles.beatTime}>
                  {fmt(b.start)}–{fmt(b.start + b.seconds)}
                </div>
                <div style={styles.beatText}>{b.text}</div>
                <div style={styles.beatSearch}>
                  🎬 {b.search}
                  {b.fallback ? (
                    <span style={styles.fallback}> / {b.fallback}</span>
                  ) : null}
                </div>
                {f && (
                  <div style={styles.footageRow}>
                    {f.found ? (
                      <>
                        <img src={f.thumbnail} alt="" style={styles.thumb} />
                        <div style={styles.footageMeta}>
                          <div style={styles.foundTag}>
                            ✓ {f.usedFallback ? "fallback" : "matched"}: {f.searchUsed}
                          </div>
                          {f.videoUrl && (
                            <a
                              href={f.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.previewLink}
                            >
                              Preview clip ↗
                            </a>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={styles.notFound}>No clip found — try editing the term</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const styles = {
  main: {
    minHeight: "100vh",
    background: "#0b0b0f",
    color: "#f4f4f5",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "24px 16px 80px",
  },
  container: { maxWidth: 640, margin: "0 auto" },
  h1: { fontSize: 30, fontWeight: 800, margin: "12px 0 4px" },
  sub: { color: "#a1a1aa", margin: "0 0 24px", fontSize: 15 },
  textarea: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 15,
    borderRadius: 12,
    border: "1px solid #27272a",
    background: "#18181b",
    color: "#fff",
    boxSizing: "border-box",
    resize: "vertical",
    lineHeight: 1.6,
  },
  button: {
    width: "100%",
    marginTop: 12,
    padding: "14px 16px",
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 12,
    border: "none",
    background: "#8b5cf6",
    color: "#fff",
    cursor: "pointer",
  },
  error: { color: "#f87171", marginTop: 16, fontSize: 14 },
  totalBar: {
    marginTop: 24,
    marginBottom: 8,
    color: "#a78bfa",
    fontSize: 13,
    fontWeight: 600,
  },
  list: { display: "flex", flexDirection: "column", gap: 10, marginTop: 8 },
  beat: {
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 12,
    padding: 14,
  },
  beatTime: {
    display: "inline-block",
    background: "#27272a",
    color: "#a78bfa",
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 8,
  },
  beatText: { fontSize: 14, color: "#e4e4e7", marginBottom: 8, lineHeight: 1.5 },
  beatSearch: { fontSize: 13, color: "#6bffb8", fontWeight: 600 },
  fallback: { color: "#52525b", fontWeight: 400 },
  footageBtn: {
    width: "100%",
    marginTop: 8,
    marginBottom: 8,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(90deg, #34d399, #a3e635)",
    color: "#0b0b0f",
    cursor: "pointer",
  },
  footageRow: {
    display: "flex",
    gap: 12,
    marginTop: 12,
    alignItems: "center",
  },
  thumb: {
    width: 72,
    height: 96,
    objectFit: "cover",
    borderRadius: 8,
    flexShrink: 0,
    border: "1px solid #27272a",
  },
  footageMeta: { display: "flex", flexDirection: "column", gap: 6 },
  foundTag: { fontSize: 12, color: "#6bffb8", fontWeight: 600 },
  previewLink: { fontSize: 12, color: "#a78bfa", textDecoration: "none" },
  notFound: { fontSize: 12, color: "#f87171", marginTop: 12 },
};
