#!/usr/bin/env bash
# queue-adapter.sh — educa-web adapter for /queue skill.
#
# Parses:
#   - .claude/chats/waiting/        → Waiting (blocked by external)
#   - .claude/chats/awaiting-prod/  → Awaiting-prod (post-deploy verify)
#   - .claude/chats/running/        → Running (currently active)
#   - .claude/chats/open/           → Pullable (briefs ready for /start-chat)
#
# Contract: `bash queue-adapter.sh items` prints markdown sections to stdout.

set -eu

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
chats_dir="$repo_root/.claude/chats"

cmd="${1:-items}"
shift || true

# Parse optional filters
filter_kind=""
top_n=""
while [ $# -gt 0 ]; do
  case "$1" in
    --kind) filter_kind="$2"; shift 2 ;;
    --top) top_n="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# emit_section <kind> <emoji> <label> <dir>
emit_section() {
  local kind="$1" emoji="$2" label="$3" dir="$4"
  [ -n "$filter_kind" ] && [ "$filter_kind" != "$kind" ] && return 0
  [ ! -d "$dir" ] && return 0

  # Collect .md files (sorted by name = chat id ascending)
  local files=()
  while IFS= read -r f; do files+=("$f"); done < <(find "$dir" -maxdepth 1 -name '*.md' -type f 2>/dev/null | sort)

  local count="${#files[@]}"
  [ "$count" -eq 0 ] && return 0

  printf '### %s %s (%s)\n\n' "$emoji" "$label" "$count"
  local i=0
  for f in "${files[@]}"; do
    if [ -n "$top_n" ] && [ "$i" -ge "$top_n" ]; then
      printf -- '- _… +%s más_\n' $((count - i))
      break
    fi
    local base
    base="$(basename "$f" .md)"
    # NNN-tag-slug → extract id + title from first heading or filename
    local id="${base%%-*}"
    local slug="${base#*-}"
    # Try first heading from file
    local title
    title="$(grep -m1 '^# ' "$f" 2>/dev/null | sed 's/^# //' || true)"
    [ -z "$title" ] && title="$slug"
    printf -- '- **%s** — %s\n' "$id" "$title"
    printf -- '  · `chats/%s/%s.md`\n' "$(basename "$dir")" "$base"
    i=$((i + 1))
  done
  printf '\n'
}

case "$cmd" in
  items)
    any=0

    # Running first (current WIP) — treated as its own pseudo-kind
    if [ -z "$filter_kind" ] || [ "$filter_kind" = "running" ]; then
      running_count="$(find "$chats_dir/running" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
      if [ "$running_count" -gt 0 ]; then
        emit_section "running" "🟢" "Running" "$chats_dir/running"
        any=1
      fi
    fi

    # Pullable: open briefs ready for /start-chat
    open_count="$(find "$chats_dir/open" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
    if [ "$open_count" -gt 0 ]; then
      emit_section "pullable" "🟢" "Pullable — arrancable con /start-chat" "$chats_dir/open"
      any=1
    fi

    # Waiting: external blocker
    waiting_count="$(find "$chats_dir/waiting" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
    if [ "$waiting_count" -gt 0 ]; then
      emit_section "waiting" "🟡" "Waiting — bloqueado por externo" "$chats_dir/waiting"
      any=1
    fi

    # Awaiting-prod: post-deploy verify pending
    aprod_count="$(find "$chats_dir/awaiting-prod" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
    if [ "$aprod_count" -gt 0 ]; then
      emit_section "waiting" "🟠" "Awaiting-prod — pendiente /verify" "$chats_dir/awaiting-prod"
      any=1
    fi

    # Troubles bucket (technical blocker) — emit if exists
    if [ -d "$chats_dir/troubles" ]; then
      troubles_count="$(find "$chats_dir/troubles" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
      if [ "$troubles_count" -gt 0 ]; then
        emit_section "future" "🔴" "Troubles — bloqueo técnico" "$chats_dir/troubles"
        any=1
      fi
    fi

    if [ "$any" -eq 0 ]; then
      echo '_Queue vacía._'
    fi

    # Pointer al maestro
    printf -- '---\n\n'
    printf -- '_Cola priorizada FE-only en_ `plan/maestro.md` §Cola priorizada.\n'
    printf -- '_Sub-chats cross-repo en_ `../educa-coord/plans/maestro.md`.\n'
    ;;

  health)
    # Drift detection: open con >0 + running vacío + awaiting-prod cerca de límite
    drift_count=0
    issues=""

    running_count="$(find "$chats_dir/running" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
    open_count="$(find "$chats_dir/open" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
    aprod_count="$(find "$chats_dir/awaiting-prod" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"

    if [ "$running_count" -eq 0 ] && [ "$open_count" -gt 0 ]; then
      issues="${issues}- **[idle]** running/ vacío con $open_count brief(s) en open/ — sugerir \`/start-chat\`.\n"
      drift_count=$((drift_count + 1))
    fi

    if [ "$aprod_count" -ge 20 ]; then
      issues="${issues}- **[bucket-pressure]** awaiting-prod/ = $aprod_count (soft=20, hard=25) — priorizar \`/verify\`.\n"
      drift_count=$((drift_count + 1))
    fi

    if [ "$open_count" -gt 5 ]; then
      issues="${issues}- **[bucket-pressure]** open/ = $open_count (soft=5) — considerar \`/triage\`.\n"
      drift_count=$((drift_count + 1))
    fi

    if [ "$drift_count" -eq 0 ]; then
      exit 3  # no drift reportable
    fi

    printf '### ⚠️ Drift (%s)\n\n' "$drift_count"
    printf -- "$issues"
    ;;

  *)
    echo "queue-adapter: unknown command '$cmd'" >&2
    exit 1
    ;;
esac
