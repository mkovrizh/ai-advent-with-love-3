# AI Advent with Love #3

Advent calendar of AI experiments — 35 days, 35 mini-projects exploring LLM capabilities.

## Stack

- Vue 3 + TypeScript
- Quasar Framework
- Anthropic Claude API

## Setup

```bash
npm install
cp .env.example .env
```

Add your Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Run

```bash
npm run dev
```

Open http://localhost:8001

## Days

| Day | Topic | Description |
|-----|-------|-------------|
| 01  | Chat  | Chat interface with Claude, model selection, system prompt |
| 02  | Response Format | Compare responses with and without format/length/stop constraints |
| 03  | Reasoning | Compare 4 reasoning strategies: direct, step-by-step, meta-prompt, expert panel |
| 04  | Temperature | Compare responses at temperature 0, 0.6, 1.0 — accuracy, creativity, diversity |
| 05  | Model Versions | Compare Haiku, Sonnet, Opus — response time, tokens, cost, quality |
