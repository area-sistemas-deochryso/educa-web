#!/usr/bin/env bash
# .claude/hooks/backlog-check.sh
#
# Reporta estado de los 7 backlogs por rules/backlog-hygiene.md.
# Sin argumento: imprime snapshot completo (para SessionStart).
# Con --wrap-system-reminder: solo imprime si hay warnings, envuelto
# en <system-reminder> tags (para UserPromptSubmit).
# Exit 0 siempre — es telemetría, no gate bloqueante.

set -u

wrap_sr=false
for arg in "$@"; do
  case "$arg" in
    --wrap-system-reminder) wrap_sr=true ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLAUDE="$ROOT/.claude"
TODAY_EPOCH=$(date +%s)
TODAY_ISO=$(date +%Y-%m-%d)

# Portable: GNU date -d (Git Bash on Windows también), BSD date -j -f, fallback silencioso.
days_since() {
  local date_str="$1"
  local then
  if then=$(date -d "$date_str" +%s 2>/dev/null); then :;
  elif then=$(date -j -f "%Y-%m-%d" "$date_str" +%s 2>/dev/null); then :;
  else echo ""; return; fi
  echo $(( (TODAY_EPOCH - then) / 86400 ))
}

count_md() {
  local dir="$1"
  [[ -d "$dir" ]] || { echo 0; return; }
  find "$dir" -maxdepth 1 -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' '
}

oldest_in() {
  local dir="$1"
  local max=0
  local file=""
  [[ -d "$dir" ]] || return
  for f in "$dir"/*.md; do
    [[ -f "$f" ]] || continue
    local created
    created=$(grep -oE '\*\*Creado\*\*:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}' "$f" 2>/dev/null | head -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    if [[ -z "$created" ]]; then
      created=$(grep -oE 'created:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}' "$f" 2>/dev/null | head -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    fi
    # Fallback al mtime del archivo si no tiene "Creado"
    if [[ -z "$created" ]]; then
      local mtime
      mtime=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || echo "$TODAY_EPOCH")
      local days=$(( (TODAY_EPOCH - mtime) / 86400 ))
      if (( days > max )); then
        max=$days
        file=$(basename "$f")
      fi
      continue
    fi
    local days
    days=$(days_since "$created")
    [[ -z "$days" ]] && continue
    if (( days > max )); then
      max=$days
      file=$(basename "$f")
    fi
  done
  [[ $max -gt 0 ]] && echo "$max|$file"
}

LINES=()
WARNINGS=()

check_bucket() {
  local label="$1" dir="$2" limit="$3" age="$4" kind="$5"
  local count status
  count=$(count_md "$dir")
  if (( count > limit )); then
    status="EXCEDIDO ($count/$limit)"
    WARNINGS+=("$label en $count (limite $kind $limit)")
  elif (( count == limit )); then
    status="AL LIMITE ($count/$limit)"
    [[ "$kind" == "blando" ]] && WARNINGS+=("$label al limite ($count/$limit) - considerar /triage")
  else
    status="$count/$limit"
  fi
  if [[ "$age" != "-" ]]; then
    local oldest
    oldest=$(oldest_in "$dir")
    if [[ -n "$oldest" ]]; then
      local days name
      days="${oldest%|*}"
      name="${oldest#*|}"
      if (( days > age )); then
        WARNINGS+=("$label: $name lleva ${days}d (critico >${age}d)")
      fi
    fi
  fi
  LINES+=("| $label | $status | $kind |")
}

cola_count() {
  local f="$CLAUDE/plan/maestro.md"
  [[ -f "$f" ]] || { echo 0; return; }
  # educa-web maestro: la cola vive en seccion "## ... chats ... cola ..."
  # Cuenta items numerados "N. ** ..." bajo esa seccion.
  # Uso BEGIN{IGNORECASE=1} (gawk) — Git Bash en Windows trae gawk.
  awk 'BEGIN{IGNORECASE=1}
    /^##.*chats.*cola/ { in_section=1; next }
    /^## / && in_section==1 { in_section=0 }
    in_section==1 && /^[0-9]+\.[[:space:]]+\*\*/ { count++ }
    END { print count+0 }
  ' "$f"
}

active_brief() {
  local dir="$CLAUDE/chats/running"
  [[ -d "$dir" ]] || return
  local f
  for f in "$dir"/*.md; do
    [[ -f "$f" ]] || continue
    local title plan
    title=$(grep -m1 '^# ' "$f" | sed 's/^# *//')
    plan=$(grep -m1 -oE '\*\*Plan\*\*:[^·]*' "$f" | sed 's/\*\*Plan\*\*: *//' | sed 's/ *$//')
    [[ -n "$title" ]] && echo "$(basename "$f")|$title|$plan"
    return
  done
}

last_shipped() {
  local dir="$CLAUDE/chats/closed"
  [[ -d "$dir" ]] || return
  ls "$dir"/*.md 2>/dev/null | sort | tail -1 | xargs -I{} basename {} .md
}

check_bucket "running/"        "$CLAUDE/chats/running"        1 "-"  "duro"
check_bucket "open/"           "$CLAUDE/chats/open"           5 30   "blando"
check_bucket "waiting/"        "$CLAUDE/chats/waiting"        3 14   "blando"
check_bucket "troubles/"       "$CLAUDE/chats/troubles"       2 7    "blando"
check_bucket "awaiting-prod/"  "$CLAUDE/chats/awaiting-prod"  8 14   "blando"
check_bucket "tasks/"          "$CLAUDE/tasks"                8 60   "blando"

cola=$(cola_count)
if (( cola > 12 )); then
  cola_status="EXCEDIDO ($cola/12)"
  WARNINGS+=("maestro cola en $cola items (limite 12)")
elif (( cola == 12 )); then
  cola_status="AL LIMITE ($cola/12)"
  WARNINGS+=("maestro cola al limite - considerar podar a tasks/")
else
  cola_status="$cola/12"
fi
LINES+=("| maestro cola | $cola_status | blando |")

# Build output
out=""
out+="## Backlog snapshot ($TODAY_ISO)"$'\n\n'

# Contexto del trabajo (brief activo / ultimo cerrado)
brief=$(active_brief)
ultimo=$(last_shipped)

ctx_lines=()
if [[ -n "$brief" ]]; then
  IFS='|' read -r b_file b_title b_plan <<< "$brief"
  ctx_line="🟢 **Activo**: $b_title"
  [[ -n "$b_plan" ]] && ctx_line+=" · $b_plan"
  ctx_lines+=("$ctx_line")
else
  ctx_lines+=("⚪ **Activo**: ninguno")
fi
[[ -n "$ultimo" ]] && ctx_lines+=("✅ **Ultimo cerrado**: $ultimo")

if [[ ${#ctx_lines[@]} -gt 0 ]]; then
  for l in "${ctx_lines[@]}"; do
    out+="$l"$'\n'
  done
  out+=$'\n'
fi

out+="| bucket | estado | tipo |"$'\n'
out+="| --- | --- | --- |"$'\n'
for line in "${LINES[@]}"; do
  out+="$line"$'\n'
done
out+=$'\n'
if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  out+="**Avisos**:"$'\n'
  for w in "${WARNINGS[@]}"; do
    out+="- $w"$'\n'
  done
  out+=$'\n'
  out+="-> Correr \`/triage\` para ver acciones sugeridas antes de \`/next-chat\` o \`/start-chat\`."$'\n'
else
  out+="Todo dentro de limites."$'\n'
fi

if $wrap_sr; then
  # UserPromptSubmit: solo inyectar si hay warnings (silent en estado sano).
  if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    echo "<system-reminder>"
    printf '%s' "$out"
    echo "</system-reminder>"
  fi
else
  # SessionStart: siempre imprimir.
  printf '%s' "$out"
fi

exit 0
