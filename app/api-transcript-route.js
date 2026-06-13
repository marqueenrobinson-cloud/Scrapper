// Fetches a YouTube transcript using Supadata (managed, stable on Vercel).
// To use the free scraper instead, see the note at the bottom.

export const runtime = "nodejs";

function extractVideoId(input) {
  // Accepts a full URL or a bare video ID
  if (!input) return null;
  const trimmed = input.trim();
  // Already an 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // Try to pull from common URL shapes
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    const videoId = extractVideoId(url);

    if (!videoId) {
      return Response.json(
        { error: "Couldn't find a valid YouTube video ID in that input." },
        { status: 400 }
      );
    }

    const apiKey = process.env.SUPADATA_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Transcript service isn't configured (missing SUPADATA_API_KEY)." },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`,
      { headers: { "x-api-key": apiKey } }
    );

    if (!res.ok) {
      return Response.json(
        { error: `Transcript fetch failed (status ${res.status}). The video may have no captions.` },
        { status: 502 }
      );
    }

    const data = await res.json();
    // data.content is an array of { text, offset, duration } segments
    const segments = (data.content || []).map((seg) => ({
      text: seg.text,
      // offset is ms in Supadata; convert to seconds for readability
      start: Math.round((seg.offset ?? 0) / 1000),
    }));

    const fullText = segments.map((s) => s.text).join(" ");

    return Response.json({ videoId, segments, fullText });
  } catch (err) {
    return Response.json(
      { error: "Something went wrong fetching the transcript." },
      { status: 500 }
    );
  }
}

// --- FREE ALTERNATIVE (no API key, but unstable on Vercel) ---
// npm install youtube-transcript-plus
// import { fetchTranscript } from "youtube-transcript-plus";
// const raw = await fetchTranscript(videoId);
// const segments = raw.map(r => ({ text: r.text, start: Math.round(r.offset/1000) }));
