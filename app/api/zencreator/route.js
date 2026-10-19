// Makes an AI still image for a shot via ZenCreator.
// POST { prompt } starts a generation; GET ?id=... checks it and returns the image.

export const runtime = "nodejs";
export const maxDuration = 30;

const BASE = "https://api.zencreator.pro/api/public/v1";

export async function POST(request) {
  const key = process.env.ZC_API_KEY;
  if (!key) {
    return Response.json({ error: "Image service isn't configured (missing ZC_API_KEY)." }, { status: 500 });
  }

  try {
    const { prompt } = await request.json();
    const text = String(prompt || "").trim().slice(0, 200);
    if (text.length < 3) {
      return Response.json({ error: "No search term to make an image from." }, { status: 400 });
    }

    const r = await fetch(`${BASE}/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        tool: "by_prompt",
        input: {
          positive_prompt: `Vertical cinematic stock photo, no text, no watermark: ${text}`,
          ratio: "9:16",
          tier: "1K",
          model: "GENERAL_SFW",
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return Response.json({ error: data?.error?.message || "Could not start the image." }, { status: r.status });
    }
    return Response.json({ id: data.id, status: data.status });
  } catch (err) {
    return Response.json({ error: "Something went wrong starting the image." }, { status: 500 });
  }
}

export async function GET(request) {
  const key = process.env.ZC_API_KEY;
  if (!key) {
    return Response.json({ error: "Image service isn't configured (missing ZC_API_KEY)." }, { status: 500 });
  }

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required." }, { status: 400 });

    const headers = { Authorization: `Bearer ${key}` };
    const s = await fetch(`${BASE}/generations/${id}`, { headers });
    const status = await s.json();
    if (!s.ok) {
      return Response.json({ error: status?.error?.message || "Status check failed." }, { status: s.status });
    }

    if (status.status === "failed") {
      return Response.json({ status: "failed", error: status.error || "Generation failed." });
    }
    if (status.status !== "succeeded" && status.status !== "partial") {
      return Response.json({ status: status.status, progress: status.progress ?? null });
    }

    const o = await fetch(`${BASE}/generations/${id}/result`, { headers });
    const result = await o.json();
    const out = result.outputs && result.outputs[0];
    if (!out) {
      return Response.json({ status: "failed", error: result.error || "No image returned." });
    }

    let img = await fetch(out.url);
    if (!img.ok && out.download_url) img = await fetch(out.download_url, { headers });
    if (!img.ok) {
      return Response.json({ status: "failed", error: "Could not download the image." });
    }

    const buf = Buffer.from(await img.arrayBuffer());
    const type = img.headers.get("content-type") || "image/png";
    return Response.json({
      status: "succeeded",
      imageData: `data:${type};base64,${buf.toString("base64")}`,
    });
  } catch (err) {
    return Response.json({ error: "Something went wrong checking the image." }, { status: 500 });
  }
}
