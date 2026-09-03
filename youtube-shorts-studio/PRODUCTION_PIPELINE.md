# PRODUCTION PIPELINE

A repeatable factory for turning an idea into a finished, QC-passed Short.

## Phase 1 — IDEA
Generate 5 original concepts. Score each 1–10 on: hook, visual potential, emotional appeal, simplicity, replayability, originality, feasibility. Pick the strongest. Do not ask the owner unless genuinely ambiguous.

## Phase 2 — STORY
Write: title, one-sentence premise, 15–60s script, scene list, character list, environment list, camera plan, sound/music requirements.

## Phase 3 — STORYBOARD
Break into scenes. For each: Scene #, Duration, Characters, Environment, Action, Emotion, Camera, Lighting, Composition, Transition, OpenArt prompt. Keep scenes visually connected.

## Phase 4 — CHARACTER REFERENCES
Generate confirm refs using the locked character prompts. Never silently redesign between scenes.

## Phase 5 — ENVIRONMENT REFERENCES
Generate reusable environment refs (Playroom, Meadow, Grove, etc.) for continuity.

## Phase 6 — IMAGE GENERATION (OpenArt)
- Generate keyframes/visual refs first.
- Inspect after each generation.
- Regenerate on: inconsistency, bad anatomy, wrong comp, weird expression, bad colors, unwanted objects, poor lighting, artifacts.

## Phase 7 — VIDEO GENERATION (OpenArt)
- Turn strongest keyframes into short clips.
- Per clip specify: subject, movement, facial expression, body movement, camera movement, environment movement, lighting, duration, cinematic style, motion intensity.
- Prefer simple controlled motion. Max 1–2 actions per clip.
- Example good motion: "looks surprised, slowly turns, eyes widen, takes two small steps. Camera gently pushes in. Background stable. No deformation."

## Structure Template
- **0–2s HOOK** | **2–8s SETUP** | **8–25s ESCALATION** | **25–45s PAYOFF** | **45–60s ENDING/LOOP**
- First frame must immediately show something interesting. Prefer visual-looped endings.

## QC Checklist (before completion)
- [ ] character consistency
- [ ] visual quality
- [ ] no broken anatomy
- [ ] no unwanted text
- [ ] no watermarks/logos
- [ ] no copyrighted characters
- [ ] smooth motion
- [ ] understandable story
- [ ] strong hook
- [ ] satisfying ending
- [ ] good pacing
- [ ] thumbnail quality
- [ ] title quality
- [ ] originality
- [ ] YouTube policy risk (low)

## Assembly
- Each finished Short gets: final video file(s), thumbnail concept, 5 title variations, description, tags, episode.json metadata → saved to `episodes/` and mirrored to `content/`.
