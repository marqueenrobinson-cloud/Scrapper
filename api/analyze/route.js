// The "agent brain": sends the transcript to Claude and gets back
// the best clippable moments with timestamps, hooks, captions, hashtags.

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { segments, fullText } = await request.json();

    if (!fullText || fullText.length < 50) {
      return Response.json(
        { error: "Transcript is too short to analyze." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "AI service isn't configured (missing ANTHROPIC_API_KEY)." },
        { status: 500 }
      );
    }

    // Build a timestamped transcript so Claude can cite real start times.
    const timestamped = (segments || [])
      .map((s) => `[${formatTime(s.start)}] ${s.text}`)
      .join("\n");

    const prompt = `You are a short-form video editor. Below is a timestamped YouTube transcript. Find the 4 most clippable moments — each one a self-contained, attention-grabbing segment 20-60 seconds long that would work as a vertical Short/Reel/TikTok.

For each moment, return:
- "start": the timestamp it begins (use the [MM:SS] from the transcript)
- "title": a punchy video title (under 60 chars)
- "hook": the first line of on-screen text that stops the scroll (under 80 chars)
- "caption": a posting caption (1-2 sentences)
- "hashtags": array of 4-6 relevant hashtags (no # symbol)
- "why": one sentence on why this clips well

Respond with ONLY a JSON array of 4 objects. No markdown, no preamble, no backticks.

TRANSCRIPT:
${timestamped}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return Response.json(
        { error: `AI analysis failed (status ${res.status}).` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    let moments;
    try {
      moments = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "AI returned an unexpected format. Try again." },
        { status: 502 }
      );
    }

    return Response.json({ moments });
  } catch (err) {
    return Response.json(
      { error: "Something went wrong during analysis." },
      { status: 500 }
    );
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

