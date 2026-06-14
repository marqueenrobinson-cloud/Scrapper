"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [moments, setMoments] = useState([]);
  const [videoId, setVideoId] = useState("");
  const [error, setError] = useState("");

  async function handleRun() {
    setError("");
    setMoments([]);
    setLoading(true);

    try {
      // Step 1: fetch transcript
      setStatus("Fetching transcript…");
      const tRes = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const tData = await tRes.json();
      if (!tRes.ok) throw new Error(tData.error || "Transcript failed.");
      setVideoId(tData.videoId);

      // Step 2: analyze with Claude
      setStatus("Finding the best moments…");
      const aRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: tData.segments,
          fullText: tData.fullText,
        }),
      });
      const aData = await aRes.json();
      if (!aRes.ok) throw new Error(aData.error || "Analysis failed.");

      setMoments(aData.moments || []);
      setStatus("");
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  function copyCaption(m) {
    const tags = (m.hashtags || []).map((h) => `#${h}`).join(" ");
    navigator.clipboard.writeText(`${m.caption}\n\n${tags}`);
  }

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <h1 style={styles.h1}>Clip Agent</h1>
        <p style={styles.sub}>
          Paste a YouTube link. Get the moments worth clipping.
        </p>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            inputMode="url"
          />
          <button
            style={{ ...styles.button, opacity: loading || !url ? 0.5 : 1 }}
            onClick={handleRun}
            disabled={loading || !url}
          >
            {loading ? "Working…" : "Find Clips"}
          </button>
        </div>

        {status && <p style={styles.status}>{status}</p>}
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.cards}>
          {moments.map((m, i) => (
            <div key={i} style={styles.card}>
              <div style={styles.timestamp}>{m.start}</div>
              <h3 style={styles.cardTitle}>{m.title}</h3>
              <div style={styles.hook}>“{m.hook}”</div>
              <p style={styles.caption}>{m.caption}</p>
              <div style={styles.tags}>
                {(m.hashtags || []).map((h, j) => (
                  <span key={j} style={styles.tag}>
                    #{h}
                  </span>
                ))}
              </div>
              <p style={styles.why}>{m.why}</p>
              <div style={styles.cardActions}>
                <button style={styles.smallBtn} onClick={() => copyCaption(m)}>
                  Copy caption
                </button>
                {videoId && (
                  <a
                    style={styles.smallBtnLink}
                    href={`https://youtube.com/watch?v=${videoId}&t=${tsToSeconds(
                      m.start
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                      <a
  style={styles.smallBtnLink}
  href={`https://avatargen-two.vercel.app/?script=${encodeURIComponent(
    buildScript(m)
  )}`}
  target="_blank"
  rel="noreferrer"
>
  Make Avatar Video
</a>
                    Jump to moment
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function tsToSeconds(ts) {
  if (!ts) return 0;
  const parts = String(ts).split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}
function buildScript(m) {
  // Turn a clip into a short spoken script for the avatar
  return `${m.hook} ${m.caption}`;
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
  h1: { fontSize: 32, fontWeight: 800, margin: "12px 0 4px" },
  sub: { color: "#a1a1aa", margin: "0 0 24px", fontSize: 15 },
  inputRow: { display: "flex", flexDirection: "column", gap: 10 },
  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    borderRadius: 12,
    border: "1px solid #27272a",
    background: "#18181b",
    color: "#fff",
    boxSizing: "border-box",
  },
  button: {
    padding: "14px 16px",
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 12,
    border: "none",
    background: "#8b5cf6",
    color: "#fff",
    cursor: "pointer",
  },
  status: { color: "#a78bfa", marginTop: 16, fontSize: 14 },
  error: { color: "#f87171", marginTop: 16, fontSize: 14 },
  cards: { display: "flex", flexDirection: "column", gap: 16, marginTop: 24 },
  card: {
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 16,
    padding: 18,
  },
  timestamp: {
    display: "inline-block",
    background: "#27272a",
    color: "#a78bfa",
    padding: "3px 10px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 8px" },
  hook: { color: "#fbbf24", fontStyle: "italic", marginBottom: 10, fontSize: 15 },
  caption: { color: "#d4d4d8", fontSize: 14, lineHeight: 1.5, margin: "0 0 10px" },
  tags: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  tag: { color: "#a1a1aa", fontSize: 13 },
  why: { color: "#71717a", fontSize: 13, fontStyle: "italic", margin: "0 0 12px" },
  cardActions: { display: "flex", gap: 8 },
  smallBtn: {
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    border: "1px solid #3f3f46",
    background: "transparent",
    color: "#e4e4e7",
    cursor: "pointer",
  },
  smallBtnLink: {
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    border: "1px solid #3f3f46",
    background: "transparent",
    color: "#e4e4e7",
    textDecoration: "none",
  },
};

