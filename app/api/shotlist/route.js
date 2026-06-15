// Turns a script into a timed "shot list" for a faceless B-roll video.
// For each beat of narration, Claude returns the spoken line, an estimated
// duration, and 1-2 stock-footage search terms to show on screen.

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { script } = await request.json();

    if (!script || script.trim().length < 10) {
      return Response.json(
        { error: "Script is too short to build a shot list." },
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

    const prompt = `You are a video editor planning B-roll for a faceless short-form video.

Below is a narration script. Break it into beats — each beat is one short spoken phrase (roughly one sentence or clause). For EACH beat, give me:
- "text": the exact words spoken in this beat
- "seconds": estimated spoken duration (count ~2.5 words per second, round to nearest whole second, minimum 2)
- "search": a short, CONCRETE stock-footage search term for what to show on screen (2-4 words). Prefer literal, filmable things (e.g. "tank rolling desert", "city skyline night", "hands typing laptop"). Avoid abstract words like "freedom" or "success" — translate them into something visual (e.g. "freedom" -> "eagle flying sky").
- "fallback": a second, more generic search term in case the first finds nothing (e.g. "military vehicle", "modern city", "person working")

Respond with ONLY a JSON array of beat objects. No markdown, no preamble, no backticks.

SCRIPT:
${script}`;

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
        { error: `AI shot-list failed (status ${res.status}).` },
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

    let beats;
    try {
      beats = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "AI returned an unexpected format. Try again." },
        { status: 502 }
      );
    }

    // Add a running start-time to each beat so the worker knows when to show it.
    let clock = 0;
    const shotlist = beats.map((b, i) => {
      const seconds = Math.max(2, Number(b.seconds) || 3);
      const beat = {
        index: i,
        text: b.text || "",
        start: clock,
        seconds,
        search: b.search || "",
        fallback: b.fallback || "",
      };
      clock += seconds;
      return beat;
    });

    return Response.json({ shotlist, totalSeconds: clock });
  } catch (err) {
    return Response.json(
      { error: "Something went wrong building the shot list." },
      { status: 500 }
    );
  }
}

