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

This project uses the Notion MCP with user-delegated access to the full
table22 workspace. You MUST restrict all Notion reads and writes to pages
inside the 🎁 Product Drops section only.

Specifically:
- Only fetch, search, or modify pages under the 🎁 Product Drops parent page
  (https://www.notion.so/33a1c270baf480d49d82cab96801913f) and its descendants.
- The canonical PRD lives at the "Product Drops — PRD v0.1" page
  (https://www.notion.so/33b1c270baf481148c71e436483bbfdd) and its seven
  linked sub-pages. This Notion page is the single source of truth for the PRD.
  Do not create a markdown copy of the PRD in this repo, and do not edit the
  PRD from the repo side.
- Never run a workspace-wide Notion search. Always scope searches to within
  the Product Drops page tree.
- Never fetch, read, or reference pages from Brand, Research, Meetings, Portal,
  Design systems, Product Changelog, Library, Inbox, or any other section of
  the table22 workspace.
- If you need information that doesn't exist in Product Drops, STOP and ask
  Daniel. Do not search elsewhere to find it.

This rule is load-bearing. Follow it strictly.

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
