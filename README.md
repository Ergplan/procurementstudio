# Joulewise Procurement Studio (Next.js)

Capex bid evaluation for a snacks and bhujia plant. It covers six packages: rooftop solar, continuous fryer, bhujia extruder, pouch packaging, thermic fluid heater and biomass boiler.

What it does:

- Shows the factory as an isometric site plan.
- Compares vendors' bills of quantities side by side.
- Has a 3D wireframe walkthrough of each piece of equipment, where every BoQ line is a clickable part.
- Gives the CXO a pricing brief.
- Normalizes prices for scope gaps, capacity and lifecycle cost.
- Suggests a common specification and the best mix of BoQ lines.
- Gives an award verdict informed by live web research on vendors.
- Includes **RealTalk**, a voice co-pilot on the **OpenAI Realtime API**.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local      # then paste your OPENAI_API_KEY into .env.local
npm run dev                     # http://localhost:3000
```

On a Mac you can instead double-click `start.command`. It installs packages on first run, creates `.env.local` and opens the browser.

For production, run `npm run build && npm start`.

## RealTalk voice

Open **RealTalk** (bottom right), tap the orb and allow the microphone. Then just talk. You can interrupt it at any time.

- "Take me inside the boiler furnace."
- "Show me the economiser. Which vendor's offer is best?"
- "Which boiler suits our 10.5 kg/cm² working pressure?"
- "Start the walkthrough." / "Next part."
- "Go back to the site and compare the packaging bids."
- "What performance bank guarantee should we ask for in the PO?"

RealTalk moves the screen for you using Realtime function calls: `open_asset`, `show_part`, `walkthrough`, `set_view` and `go_to_site`. It reads the Studio's data with `get_asset` and `get_portfolio`. When you type while voice is live, the text goes into the same session. When voice is off, typed questions use OpenAI text with web search.

### How the voice session works

1. The browser POSTs to `/api/realtime/session`.
2. The server calls `POST /v1/realtime/client_secrets` with your key and returns a short-lived `ek_…` key.
3. The browser opens a WebRTC connection with the microphone and the `oai-events` data channel, then POSTs its SDP offer to `/v1/realtime/calls`.

Your `OPENAI_API_KEY` never leaves the server.

## Project layout

```
app/api/realtime/session/route.ts   Mints Realtime client secrets
app/api/llm/route.ts                Streams OpenAI Responses (+ web_search) for briefs, verdicts, prices
app/api/health/route.ts             Tells the UI what's configured
components/RealTalk.tsx             Voice-first co-pilot (WebRTC, tools, transcript, mic meter)
components/Walkthrough.tsx          3D walkthrough, guided tour, part inspector
lib/walkEngine.ts                   Three.js wireframe models (every part = a BoQ row id)
components/AssetView.tsx            Vendor cards, BoQ table, market prices, intel
components/AiPanel.tsx              Brief · Normalize · Homogenize · Verdict
lib/data.ts                         Packages, BoQ rows, vendors, intel, part notes, tech sheets
lib/calc.ts                         Normalization maths and AI data packs
```

## Settings (`.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | none | Required |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-2.1` | Voice model |
| `OPENAI_VOICE` | `marin` | Voice |
| `OPENAI_TRANSCRIBE_MODEL` | `gpt-4o-mini-transcribe` | Shows your speech as text (set it empty to turn this off) |
| `OPENAI_TEXT_MODEL` | `gpt-6-astra` | Briefs, verdicts, typed answers |
| `WEB_SEARCH` | `on` | Live web search for prices and vendor checks |

## Data

- **Vendor bids are illustrative demo data.** Replace `ASSETS` in `lib/data.ts` with the quotations you receive.
- Market benchmarks and vendor intel were researched on the web on 28 Sep 2026.
- Master data (factory name, asset names, fuel price, tariff, horizon) and discovered prices are saved in the browser.
