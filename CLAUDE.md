# product-drops

A project to design and (eventually) build a product drop app, inspired by services like Hotplate.

## Status
Early stage. Currently in research and PRD-writing phase. No code yet.

## Owner
Daniel

## Folder structure
- `docs/research/` — competitor teardowns, market notes, reference material
- `docs/figjam-exports/` — exported screenshots/PDFs from the FigJam reference board

## Notion access scope

This project's Notion access is scoped strictly to the 🎁 Product Drops
section of the table22 workspace. The full rule, parent page IDs, and PRD
links live in the `feedback_notion_scope` memory (auto-loaded at session
start). Read it before any Notion operation. This rule is load-bearing.

## Working agreement for future Claude (Claude Code) sessions
- Read this file first.
- Read the Notion PRD parent page at
  https://www.notion.so/33b1c270baf481148c71e436483bbfdd and all seven of its
  linked sub-pages (Success metrics, End-to-end journey, Feature spec, State
  machines in prose, Data model overview, Integration notes, Rejected
  alternatives) before writing any code. Notion is the source of truth — do
  not create or maintain a markdown copy in the repo.
- Read `docs/research/` for context on the problem space and competitors.
- Do not modify files outside this `product-drops` folder.
- Ask before introducing new dependencies, frameworks, or major architectural
  choices.

## Tooling notes
- Research and PRD authoring is being done in Cowork mode.
- Implementation will be handed off to Claude Code once the PRD is stable.
