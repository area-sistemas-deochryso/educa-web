#!/usr/bin/env bash
# queue-adapter.sh — educa-web adapter for /queue skill.
#
# Parses:
#   - .claude/plan/maestro.md "Orden de ejecución" tier tables → pullable | future
#   - .claude/chats/{waiting,running,open,troubles,awaiting-prod}/ → chat buckets
#
# Sub-commands:
#   items [--kind <k>] [--top N]   Emit queue markdown (default)
#   health                          Drift detection
#   info <KEY>                      Plan detail lookup
#
# Args:
#   --kind <waiting|pullable|future|running>  Filter to a single kind.
#   --top N                                    Cap pullable section at N (default 5).

set -eu

cmd="${1:-items}"
shift || true

info_key=""
if [ "$cmd" = "info" ]; then
  info_key="${1:-}"
else
  top=5
  kind_filter=""

  while [ $# -gt 0 ]; do
    case "$1" in
      --top) shift; top="$1" ;;
      --kind) shift; kind_filter="$1" ;;
      *) ;;
    esac
    shift || true
  done
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
chats_dir="$repo_root/.claude/chats"
maestro="$repo_root/.claude/plan/maestro.md"

show_kind() {
  [ -z "$kind_filter" ] && return 0
  [ "$kind_filter" = "$1" ]
}

# ---- emit_bucket <kind> <emoji> <label> <dir> ----
emit_bucket() {
  local kind="$1" emoji="$2" label="$3" dir="$4"
  show_kind "$kind" || return 0
  [ -d "$dir" ] || return 0

  local files=()
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    files+=("$f")
  done < <(find "$dir" -maxdepth 1 -name '*.md' -not -name 'README.md' -type f 2>/dev/null | sort)

  local count="${#files[@]}"
  [ "$count" -eq 0 ] && return 0

  printf '### %s %s (%s)\n\n' "$emoji" "$label" "$count"
  local i=0
  for f in "${files[@]}"; do
    if [ "$kind" = "pullable" ] && [ "$top" -gt 0 ] && [ "$i" -ge "$top" ]; then
      printf -- '  _...+%s más_\n' $((count - i))
      break
    fi
    local base; base="$(basename "$f" .md)"
    local id="${base%%-*}"
    local title; title="$(grep -m1 '^# ' "$f" 2>/dev/null | sed 's/^# //' || true)"
    [ -z "$title" ] && title="${base#*-}"
    local bucket_name; bucket_name="$(basename "$dir")"
    printf -- '- **%s** — %s\n  · `chats/%s/%s.md`\n' "$id" "$title" "$bucket_name" "$base"
    i=$((i + 1))
  done
  printf '\n'
}

# ---- pullable + future from maestro Orden de ejecución (tier-aware) ----
#
# FE maestro tiers have variable columns:
#   Tier 1-2: | Pos | Key | Plan | Próximo | Repo | Desbloquea | Gate |
#   Tier 3:   | Pos | Key | Plan | Próximo | Cierra | Gate |
#   Tier 4-6: | Pos | Key | Plan | Próximo | Gate |
#
# Gate = last data column. Items with 🔒/⏸️/incremental → future.
emit_maestro_cola() {
  show_kind pullable || show_kind future || [ -z "$kind_filter" ] || return 0
  [ -f "$maestro" ] || return 0

  local section; section=$(awk '
    /^### .* Orden de ejecución/ {inside=1; next}
    inside && /^## / {inside=0}
    inside {print}
  ' "$maestro")
  [ -z "$section" ] && return 0

  local pullable_tsv="" future_tsv=""
  local current_tier=""

  while IFS= read -r line; do
    case "$line" in '#### '*)
      current_tier=$(echo "$line" | sed -e 's/^#### //' -e 's/ *$//')
      continue ;; esac

    case "$line" in '| '*) ;; *) continue ;; esac
    case "$line" in '|---'*) continue ;; esac
    case "$line" in '| Pos '*) continue ;; esac

    local ncols; ncols=$(echo "$line" | awk -F'|' '{print NF}')
    local gate; gate=$(echo "$line" | awk -F'|' -v c="$((ncols-1))" '{print $c}' | sed -e 's/^ *//' -e 's/ *$//' -e 's/\*//g')

    local pos key plan proximo repo
    pos=$(echo "$line" | awk -F'|' '{print $2}' | sed -e 's/^ *//' -e 's/ *$//' -e 's/\*//g')
    key=$(echo "$line" | awk -F'|' '{print $3}' | sed -e 's/^ *//' -e 's/ *$//' -e 's/\*//g')
    plan=$(echo "$line" | awk -F'|' '{print $4}' | sed -e 's/^ *//' -e 's/ *$//' -e 's/\*//g')
    proximo=$(echo "$line" | awk -F'|' '{print $5}' | sed -e 's/^ *//' -e 's/ *$//' -e 's/\*//g')
    repo=$(echo "$line" | awk -F'|' '{print $6}' | sed -e 's/^ *//' -e 's/ *$//' -e 's/\*//g')

    [ -z "$plan" ] && continue

    local tsv_line; tsv_line=$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s' "$pos" "$key" "$plan" "$proximo" "$repo" "$gate" "$current_tier")

    case "$gate" in
      *🔒*|*⏸️*|*incremental*)
        future_tsv="${future_tsv}${tsv_line}"$'\n' ;;
      *)
        pullable_tsv="${pullable_tsv}${tsv_line}"$'\n' ;;
    esac
  done <<< "$section"

  if show_kind pullable && [ -n "$pullable_tsv" ]; then
    local total; total=$(printf '%s' "$pullable_tsv" | grep -c . || true)
    printf '### 🟢 Pullable FE (%s)\n\n' "$total"

    local prev_tier=""
    local tier_count=0
    local tier_skipped=0

    while IFS=$'\t' read -r pos key plan proximo repo gate tier; do
      [ -z "$plan" ] && continue

      if [ "$tier" != "$prev_tier" ]; then
        if [ "$tier_skipped" -gt 0 ]; then
          printf '  _...+%s más_\n' "$tier_skipped"
        fi
        [ -n "$prev_tier" ] && printf '\n'
        printf '**%s**\n' "$tier"
        prev_tier="$tier"
        tier_count=0
        tier_skipped=0
      fi

      tier_count=$((tier_count + 1))
      if [ "$top" -gt 0 ] && [ "$tier_count" -gt "$top" ]; then
        tier_skipped=$((tier_skipped + 1))
        continue
      fi

      printf '%s. **%s** %s — %s · %s\n' "$pos" "$key" "$plan" "$proximo" "$repo"
    done <<< "$pullable_tsv"

    if [ "$tier_skipped" -gt 0 ]; then
      printf '  _...+%s más_\n' "$tier_skipped"
    fi
    printf '\n'
  fi

  if show_kind future && [ -n "$future_tsv" ]; then
    local count; count=$(printf '%s' "$future_tsv" | grep -c . || true)
    printf '### ⏸️ Future FE (%s) — bloqueado / dependiente\n\n' "$count"
    while IFS=$'\t' read -r pos key plan proximo repo gate tier; do
      [ -z "$plan" ] && continue
      printf -- '- **%s** %s — %s · gate: %s\n' "$key" "$plan" "$proximo" "$gate"
    done <<< "$future_tsv"
    printf '\n'
  fi
}

case "$cmd" in
  items)
    output=""

    # Running
    if show_kind running || [ -z "$kind_filter" ]; then
      output+="$(emit_bucket "running" "🔵" "Running" "$chats_dir/running")"$'\n'
    fi

    # Pullable from open/ briefs
    if show_kind pullable || [ -z "$kind_filter" ]; then
      output+="$(emit_bucket "pullable" "🟢" "Pullable — briefs en open/" "$chats_dir/open")"$'\n'
    fi

    # Pullable + future from maestro cola
    output+="$(emit_maestro_cola)"$'\n'

    # Waiting
    output+="$(emit_bucket "waiting" "🟡" "Waiting — bloqueado por externo" "$chats_dir/waiting")"$'\n'

    # Awaiting-prod
    output+="$(emit_bucket "waiting" "🟠" "Awaiting-prod — pendiente /verify" "$chats_dir/awaiting-prod")"$'\n'

    # Troubles
    if [ -d "$chats_dir/troubles" ]; then
      output+="$(emit_bucket "future" "🔴" "Troubles — bloqueo técnico" "$chats_dir/troubles")"$'\n'
    fi

    # Trim whitespace
    output=$(printf '%s' "$output" | awk 'NF{f=1} f{print}' | awk '{a[NR]=$0} END{for(i=NR;i>=1;i--)if(a[i]!=""){last=i;break} for(i=1;i<=last;i++)print a[i]}')

    if [ -z "$output" ]; then
      echo '_Queue vacía._'
    else
      printf '%s\n' "$output"
    fi

    printf -- '\n---\n\n'
    printf -- '_Cola priorizada FE en_ `plan/maestro.md` §Orden de ejecución.\n'
    printf -- '_Cross-repo en_ `../educa-coord/plans/maestro.md`.\n'
    ;;

  health)
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
      exit 3
    fi

    printf '### ⚠️ Drift (%s)\n\n' "$drift_count"
    printf -- "$issues"
    ;;

  info)
    [ -z "$info_key" ] && { echo "Usage: queue-adapter.sh info <KEY>" >&2; exit 1; }

    # Normalize: f1 → F1, xp45 → xP45
    info_key=$(echo "$info_key" | sed -E 's/^(x?)(.)/\1\U\2/' | sed -E 's/^(x?[A-Z])(.+)/\1\U\2/')
    # Simpler: just uppercase all
    info_key_upper=$(echo "$info_key" | tr '[:lower:]' '[:upper:]')

    # --- Header ---
    printf '## 📋 %s — Info\n\n' "$info_key"

    # --- 1. Find in INDEX table ---
    if [ -f "$maestro" ]; then
      idx_row=$(awk -F'|' -v key="$info_key_upper" '
        /^<!-- INDEX:START/,/^<!-- INDEX:END/ {
          if (/^\|---/ || /^\| Key /) next
          k=$2; gsub(/^ +| +$/, "", k); gsub(/\*/, "", k);
          if (toupper(k) == key) { print; exit }
        }
      ' "$maestro")

      if [ -n "$idx_row" ]; then
        printf '### Estado (INDEX)\n\n'
        idx_plan=$(echo "$idx_row" | awk -F'|' '{print $3}' | sed -e 's/^ *//' -e 's/ *$//')
        idx_estado=$(echo "$idx_row" | awk -F'|' '{print $4}' | sed -e 's/^ *//' -e 's/ *$//')
        idx_notas=$(echo "$idx_row" | awk -F'|' '{print $5}' | sed -e 's/^ *//' -e 's/ *$//')
        printf -- '- **Plan**: %s\n' "$idx_plan"
        printf -- '- **Estado**: %s\n' "$idx_estado"
        printf -- '- **Notas**: %s\n' "$idx_notas"
        printf '\n'
      fi

      # --- 2. Find in INV table ---
      inv_row=$(awk -F'|' -v key="$info_key_upper" '
        /^## \[INV\]/ { inside=1; next }
        inside && /^## / { inside=0 }
        !inside { next }
        /^\| Key / || /^\|---/ { next }
        {
          k=$2; gsub(/^ +| +$/, "", k); gsub(/\*/, "", k);
          if (toupper(k) == key) { print; exit }
        }
      ' "$maestro")

      if [ -n "$inv_row" ]; then
        inv_num=$(echo "$inv_row" | awk -F'|' '{print $3}' | sed -e 's/^ *//' -e 's/ *$//')
        inv_plan=$(echo "$inv_row" | awk -F'|' '{print $4}' | sed -e 's/^ *//' -e 's/ *$//')
        inv_estado=$(echo "$inv_row" | awk -F'|' '{print $5}' | sed -e 's/^ *//' -e 's/ *$//')
        inv_notas=$(echo "$inv_row" | awk -F'|' '{print $6}' | sed -e 's/^ *//' -e 's/ *$//')
        printf '### Detalle (INV)\n\n'
        printf -- '- **#**: %s\n' "$inv_num"
        printf -- '- **Plan**: %s\n' "$inv_plan"
        printf -- '- **Estado**: %s\n' "$inv_estado"
        printf -- '- **Notas**: %s\n' "$inv_notas"
        printf '\n'
      fi
    fi

    # --- 3. Position in Orden de ejecución ---
    if [ -f "$maestro" ]; then
      exec_row=$(awk -F'|' -v key="$info_key_upper" '
        /^### .* Orden de ejecución/ {inside=1; next}
        inside && /^## / {inside=0}
        inside && /^\| / && !/^\|---/ && !/^\| Pos / {
          k=$3; gsub(/^ +| +$/, "", k); gsub(/\*/, "", k);
          if (toupper(k) == key) { print; exit }
        }
      ' "$maestro")
      if [ -n "$exec_row" ]; then
        exec_pos=$(echo "$exec_row" | awk -F'|' '{print $2}' | sed -e 's/^ *//' -e 's/ *$//' -e 's/\*//g')
        exec_next=$(echo "$exec_row" | awk -F'|' '{print $5}' | sed -e 's/^ *//' -e 's/ *$//' -e 's/\*//g')
        printf '### Posición en cola\n\n'
        printf -- '- **Posición**: #%s\n' "$exec_pos"
        printf -- '- **Próximo paso**: %s\n' "$exec_next"
        printf '\n'
      fi
    fi

    # --- 4. Related briefs across all chat buckets ---
    printf '### Briefs relacionados\n\n'
    # Extract plan number: F1 → 1, xP45 → 45, F13 → 13
    plan_num=$(echo "$info_key" | sed -E 's/^x?[A-Za-z]//' | tr '[:upper:]' '[:lower:]')
    found_any=false
    for bucket in running open waiting troubles awaiting-prod closed; do
      bucket_dir="$chats_dir/$bucket"
      [ -d "$bucket_dir" ] || continue
      matches=$(find "$bucket_dir" -maxdepth 1 -name '*.md' -not -name 'README.md' 2>/dev/null \
        | while IFS= read -r f; do
            fname=$(basename "$f" .md)
            case "$fname" in
              *[Pp]lan"$plan_num"*|*[Pp]lan-"$plan_num"*|*"$info_key"*|*"$(echo "$info_key" | tr '[:upper:]' '[:lower:]')"*) echo "$f" ;;
            esac
          done)
      [ -z "$matches" ] && continue
      found_any=true
      while IFS= read -r f; do
        [ -z "$f" ] && continue
        bname=$(basename "$f" .md)
        printf -- '- **%s** · `%s`\n' "$bname" "$bucket"
      done <<< "$matches"
    done
    if ! $found_any; then
      printf '_No briefs found matching %s_\n' "$info_key"
    fi
    printf '\n'
    ;;

  *)
    echo "queue-adapter: unknown command '$cmd'" >&2
    exit 1
    ;;
esac
