# Liu Yao × Da Liu Ren · 六爻 × 六壬

**[English](README.en.md) | [中文](README.md)**

An AI-assisted divination tool combining **Liu Yao (六爻, najia I Ching)** and **Da Liu Ren (大六壬)**: **one intention-moment, two boards cross-validated**, for divining **concrete matters** (wealth, outcomes, illness, lost items, relationships…).

- **Da Liu Ren = the objective field of the moment**: the situation itself (same minute → same course for anyone).
- **Liu Yao = your intention sample**: your relationship to the matter (the hexagram you cast is personal).
- **Cross-validation = objective field ∩ personal projection**: same source, same instant — where they agree is trustworthy, where they diverge stays in doubt.

![Liu Yao × Da Liu Ren dual-board web UI](docs/web-dual-board.png)

## Core Design Principle

> **Casting is computed; only interpretation uses AI.**

- **Chart casting is deterministic**: Liu Yao → original/changed hexagram, palace & world/response lines, najia stems-branches, six relatives, six spirits, hidden gods, divination-time pillars. Da Liu Ren → month-general, heaven/earth plates, four courses, three transmissions (nine gates), twelve generals. There is exactly one correct answer — never handed to an LLM.
- **AI only interprets**: given two fully-annotated boards, it picks the useful god by each system's own rules and cross-validates dimension by dimension.

## Features

- 🎲 **Three casting modes**: electronic coin-toss (line by line, start/stop), one-click cast, manual input
- 🧮 **Liu Yao chart**: original/changed hexagram, palace, world/response, najia (stems-branches + element), six relatives, six spirits, hidden gods, divination-time (month/day/void)
- 🪙 **Da Liu Ren course**: month-general (sun's palace by mid-term solar term), heaven/earth plates, four courses, three transmissions (nine gates), twelve generals
- 🔮 **Four-dimension cross-validation**: outcome / timing / people & direction / risk — each marked **honestly as agreement or divergence** (no fake precision percentages)
- 🆓 **Free, no key by default**: AI defaults to Pollinations; switchable to GLM / local Ollama / Claude
- 🖥️ Both a web UI (dual board + cross-validation) and a CLI

## Accuracy · Cross-Validation

Casting never relies on an LLM. The Da Liu Ren engine was cross-checked against the open-source **[kinliuren](https://github.com/kentang2017/kinliuren)** (384-case automated diff) and validated against **classical-text worked examples**:

- **Month-general / four courses / Tian Yi noble**: 384/384 match
- **Three-transmission selection** (重审/元首/比用/遥克/**涉害 she-hai**/昴星/反吟): anchored to **classical canon** (e.g. she-hai "甲辰 day, 戌 over 寅 → 子, since 子 涉 5 vs 戌 4" has a regression test); only the 伏吟 self-punishment edge is school-dependent and noted
- 24 tests passing

## Quick Start

### Web UI (recommended)

```bash
npm install
npm run build                 # build the casting engine first (web depends on it)
npm run dev -w @liuyao/web     # open http://localhost:3030
```

Enter your question → toss coins / manual input → Liu Yao board + Da Liu Ren board → streamed four-dimension cross-validation.

### CLI (dual-board cross-validation, same as web)

```bash
npm install && npm run build
node bin/liuyao.mjs "Will this interview work out?"     # cast + same-moment course + cross-validation
node bin/liuyao.mjs "测病" --provider ollama          # local ollama (good quality)
node bin/liuyao.mjs "lost wallet?" --lines 6,7,8,9,7,8  # manual Liu Yao lines (bottom→top)
node bin/liuyao.mjs "测事" --no-ai                     # cast both boards only, no cross-validation
```

### Tests

```bash
npm test
```

## AI Provider (interpretation layer)

Casting is free and needs no key. Only AI interpretation/cross-validation goes through a provider, chosen via `AI_PROVIDER` in `.env`:

| provider | cost | key needed | notes |
|----------|------|-----------|-------|
| `pollinations` (default) | free | no | works out of the box, hosted small model; **often empty on long readings — only for "first run", switch to ollama/glm for real use** |
| `ollama` | free | no | local, offline; install [Ollama](https://ollama.com/) + `ollama pull qwen2.5:32b` |
| `glm` | free | yes | strong Chinese, recommended: [open.bigmodel.cn](https://open.bigmodel.cn/) |
| `gemini` / `groq` | free | yes | see `.env.example` |
| `anthropic` | paid | yes | highest quality |
| `custom` | depends | maybe | any OpenAI-compatible endpoint |

## Project Structure

```
src/
  trigrams/hexagrams/wuxing/cast/date/najia/render.ts   Liu Yao engine (palace lines + najia)
  liuren/
    core.ts        month-general / heaven-earth plates / four courses
    sanchuan.ts    three transmissions (nine gates: zeike/biyong/shehai/yaoke/maoxing/…/fuyin/fanyin)
    tianjiang.ts   twelve generals (Tian Yi noble + day/night + forward/reverse)
    index/render.ts
  moment.ts        castMoment(): dual board from one moment
  ai/
    interpret.ts   Liu Yao reading
    cross.ts       Liu Yao × Da Liu Ren four-dimension cross-validation
    provider.ts    multi-provider (pollinations/ollama/glm/gemini/groq/anthropic/custom)
bin/liuyao.mjs     CLI
apps/web/          Next.js 14 (ink/cinnabar): /api/cast dual board, /api/cross streamed cross-validation
```

## Cross-Validation Rules (the AI follows)

1. **Each system picks its own useful god first, then compare conclusions** — no forced term mapping.
2. **No single confidence percentage** — the two boards share the same day/month pillars, so they are not fully independent; "agreement" is weaker evidence than it feels.
3. **Report agreement/divergence per dimension**: outcome, timing, people & direction (Da Liu Ren's strength), risk/nature (its twelve generals' strength).
4. **End with action** — not just auspicious/inauspicious, but "what you should do".

## Disclaimer

This tool is for **cultural learning and self-reflection only**. All readings are **probabilistic references, not determinism**, and constitute no professional advice. Make your own decisions.

## License

MIT
