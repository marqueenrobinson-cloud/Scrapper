# Clip Agent

Paste a YouTube link, get the 4 most clippable moments with titles, hooks, captions, and hashtags.

## Setup
1. Add two environment variables in Vercel:
   - `SUPADATA_API_KEY` (from supadata.ai)
   - `ANTHROPIC_API_KEY` (from console.anthropic.com)
2. Deploy. That's it.

## Roadmap
- Phase 2: pipe a chosen moment's script into AvatarGen (D-ID + ElevenLabs)
- Phase 3: real video clipping via an external ffmpeg worker (Railway/Render)

