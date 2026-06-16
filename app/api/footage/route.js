// Takes a shot list and finds a matching stock video clip for each shot
// from Pexels. Tries the primary search term first, then the fallback.

export const runtime = "nodejs";

async function searchPexels(query, apiKey, orientation) {
  const url =
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}` +
    `&per_page=1&orientation=${orientation}`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) return null;
  const data = await res.json();
  const video = data.videos && data.videos[0];
  if (!video) return null;

  // Pick a reasonable-quality mp4 file (prefer HD, fall back to whatever exists)
  const files = video.video_files || [];
  const hd =
    files.find((f) => f.quality === "hd" && f.file_type === "video/mp4") ||
    files.find((f) => f.file_type === "video/mp4") ||
    files[0];

  return {
    query,
    videoUrl: hd ? hd.link : null,
    thumbnail: video.image || null,
    duration: video.duration || null,
    pexelsUrl: video.url || null,
  };
}

export async function POST(request) {
  try {
    const { shotlist, orientation = "portrait" } = await request.json();

    if (!Array.isArray(shotlist) || shotlist.length === 0) {
      return Response.json(
        { error: "No shot list provided." },
        { status: 400 }
      );
    }

    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Footage service isn't configured (missing PEXELS_API_KEY)." },
        { status: 500 }
      );
    }

    // For each shot, try primary term, then fallback.
    const results = [];
    for (const shot of shotlist) {
      let match = shot.search ? await searchPexels(shot.search, apiKey, orientation) : null;
      let usedFallback = false;
      if ((!match || !match.videoUrl) && shot.fallback) {
        match = await searchPexels(shot.fallback, apiKey, orientation);
        usedFallback = true;
      }

      results.push({
        index: shot.index,
        text: shot.text,
        start: shot.start,
        seconds: shot.seconds,
        searchUsed: match ? match.query : null,
        usedFallback,
        videoUrl: match ? match.videoUrl : null,
        thumbnail: match ? match.thumbnail : null,
        found: !!(match && match.videoUrl),
      });
    }

    const foundCount = results.filter((r) => r.found).length;
    return Response.json({ footage: results, foundCount, total: results.length });
  } catch (err) {
    return Response.json(
      { error: "Something went wrong fetching footage." },
      { status: 500 }
    );
  }
}

