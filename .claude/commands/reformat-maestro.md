# /reformat-maestro — Add keyed index to maestro files

## Usage

- `/reformat-maestro` — reformat current repo's maestro
- `/reformat-maestro coord` — reformat coord maestro (from any repo)
- `/reformat-maestro all` — all 3 maestros

## Algorithm

1. **Read** the full maestro file.
2. **Extract** all plan items: number, name, state, priority, gates.
3. **Assign keys** per schema (`reference/maestro-key-schema.md`):
   - Coord plans: `P{N}` (numbered), `P{slug}` (unnumbered like `SMTP`).
   - FE-only plans: `F{N}`.
   - BE-only plans: `B{N}` or `B{slug}` (like `BCI`).
   - Cross-repo pointers: `xP{N}`.
   - Brujulas: `W{N}`.
   - Coord-internal: `C{slug}`.
4. **Generate `<!-- INDEX:START/END -->` block** after the maestro header, before the first `---`.
   - Coord columns: `| Key | Plan | Estado | Pri | Gate |`
   - FE columns: `| Key | Plan | Estado | Notas |`
   - BE columns: `| Key | Plan | Estado | Pri |`
5. **Tag body section headings** with `[KEY]` anchor: `### [P45] Plan name`.
6. **Convert free-text cross-references** to key format in cola tables and prose.
   - `Plan 45 F5 BE` → `P45:F5:BE`
   - `→ ver maestro coord` lines get `xP{N}` prefix where applicable.
7. **Convert gate references** to key format: `P45:F5:BE ✅` not `Plan 45 F5 BE ✅`.
8. **Show preview** — print diff stats and sample of changed lines. Wait for user confirmation.
9. **Write** the file. Do NOT commit.

## Edge cases

- **Unnumbered plans** (e.g., "Migracion SMTP cPanel → ACS") → slug key: `SMTP`.
- **Archived plans** → listed in index with `archived` estado.
- **Cross-repo pointers** → `xP{N}` prefix, estado says `ver P{N}`.
- **Brujulas** → `W{N}` key, listed in their own section but also in the index.
- **Coord-internal plans** → `C{slug}` key.

## Key schema reference

Read `reference/maestro-key-schema.md` for the full prefix table and phase key format.

## Safety

- Read-before-write: always read the maestro before modifying.
- Preview diff before writing — never auto-write without user confirmation.
- Do not commit — the caller (`/go`, `/end`, or manual) handles commits.
- If a plan has ambiguous numbering or duplicate keys, stop and ask.
