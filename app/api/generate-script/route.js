// Generates an original short-form video script from a genre/vibe + optional topic.
// Output is fully original (written by Claude), so it's safe to publish.

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { vibe, topic, seconds } = await request.json();

    if (!vibe) {
      return Response.json({ error: "Pick a vibe first." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "AI service isn't configured (missing ANTHROPIC_API_KEY)." },
        { status: 500 }
      );
    }

    const targetSeconds = Number(seconds) || 30;
    const targetWords = Math.round(targetSeconds * 2.5); // ~2.5 words/sec narration

    const topicLine = topic && topic.trim()
      ? `The specific topic is: "${topic.trim()}".`
      : `Pick a fresh, engaging subject that fits the vibe.`;

    const prompt = `You are a top short-form video scriptwriter (TikTok, Reels, YouTube Shorts).

Write ONE original narration script in this style/vibe: "${vibe}".
${topicLine}

Rules:
- Aim for about ${targetWords} words (~${targetSeconds} seconds spoken).
- First line MUST be a scroll-stopping hook.
- Write it as spoken narration only — no scene directions, no character names, no camera notes, no stage directions. Just the words a voiceover would say.
- Short punchy sentences. Build momentum. End with a line that lands or invites a follow.
- Make it completely original. Do not copy any existing work.

Respond with ONLY the script text. No title, no preamble, no quotation marks, no markdown.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return Response.json(
        { error: `Script generation failed (status ${res.status}).` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const scriptText = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return Response.json({ script: scriptText });
  } catch (err) {
    return Response.json(
      { error: "Something went wrong generating the script." },
      { status: 500 }
    );
  }
}

