// Sends the footage shots to the Railway ffmpeg worker, which assembles
// them into one captioned vertical MP4 and streams it back.

export const runtime = "nodejs";
export const maxDuration = 60; // give the worker as long as Vercel allows

export async function POST(request) {
  try {
    const { shots } = await request.json();

    if (!Array.isArray(shots) || shots.length === 0) {
      return Response.json({ error: "No shots to build." }, { status: 400 });
    }

    const workerUrl = process.env.WORKER_URL;
    if (!workerUrl) {
      return Response.json(
        { error: "Video worker isn't configured (missing WORKER_URL)." },
        { status: 500 }
      );
    }

    // Only send shots that actually have a video clip.
    const payload = {
      shots: shots
        .filter((s) => s.videoUrl)
        .map((s) => ({
          text: s.text || "",
          videoUrl: s.videoUrl,
          seconds: Number(s.seconds) || 3,
        })),
    };

    if (payload.shots.length === 0) {
      return Response.json(
        { error: "None of the shots had usable footage." },
        { status: 422 }
      );
    }

    const base = workerUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = `Worker failed (status ${res.status}).`;
      try {
        const j = await res.json();
        if (j.error) msg = j.error;
      } catch {}
      return Response.json({ error: msg }, { status: 502 });
    }

    // The worker streams back an MP4. Pass it straight through to the browser.
    const videoBuffer = await res.arrayBuffer();
    return new Response(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="faceless.mp4"',
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Something went wrong building the video." },
      { status: 500 }
    );
  }
}

