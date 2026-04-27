#!/usr/bin/env bash
# .claude/scripts/progress.sh
#
# Reporte visual de avance del proyecto educa-web.
# Versión adaptada del progress.sh de app-fgame:
# - SÍ tabla de Planes activos (parsea inventario del maestro)
# - SÍ tendencia general (commits + briefs cerrados/semana, sparklines)
# - SÍ subsistemas con churn (top 8 carpetas FE modificadas en N semanas)
# - SÍ zonas muertas (subsistemas FE sin commits >42d)
# - SÍ resumen de planes en cola del maestro
#
# Limitación: solo mide el repo educa-web (FE). El BE vive en Educa.API/ y
# tiene su propia historia git separada.
#
# Uso:
#   bash .claude/scripts/progress.sh          # reporte completo (12 semanas)
#   bash .claude/scripts/progress.sh --weeks 4 # ventana custom

set -u

WEEKS=12
for ((i=1; i<=$#; i++)); do
  arg="${!i}"
  if [[ "$arg" == "--weeks" ]]; then
    next=$((i+1))
    WEEKS="${!next}"
  fi
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 1

TODAY_EPOCH=$(date +%s)
TODAY_ISO=$(date +%Y-%m-%d)
WEEK_SEC=604800
MAESTRO="$ROOT/.claude/plan/maestro.md"

CHARS=(▁ ▂ ▃ ▄ ▅ ▆ ▇ █)

# ============================================================
# Helpers
# ============================================================
sparkline() {
  local max=0 n
  for n in "$@"; do
    (( n > max )) && max=$n
  done
  if (( max == 0 )); then
    for n in "$@"; do printf "·"; done
    return
  fi
  for n in "$@"; do
    if (( n == 0 )); then
      printf "·"
    else
      local idx
      idx=$(awk -v n="$n" -v m="$max" 'BEGIN {
        v = log(n+1) / log(m+1) * 7
        i = int(v + 0.5)
        if (i > 7) i = 7
        if (i < 0) i = 0
        print i
      }')
      printf "%s" "${CHARS[$idx]}"
    fi
  done
}

# Renderiza barra de progreso `[████████░░] 80%` con N=10 segmentos
progress_bar() {
  local pct="$1"
  if [[ "$pct" == "—" || "$pct" == "N/A" || -z "$pct" ]]; then
    printf "[··········] %s" "${pct:-—}"
    return
  fi
  local n=$(( pct / 10 ))
  (( n > 10 )) && n=10
  (( n < 0 )) && n=0
  local filled="" empty="" i
  for ((i=0; i<n; i++)); do filled+="█"; done
  for ((i=n; i<10; i++)); do empty+="░"; done
  printf "[%s%s] %d%%" "$filled" "$empty" "$pct"
}

iso_date() {
  date -d "@$1" +%Y-%m-%d 2>/dev/null || date -r "$1" +%Y-%m-%d 2>/dev/null || echo "?"
}

# Limpia bold ** y emojis comunes del nombre del plan, trunca a N chars
clean_plan_name() {
  local raw="$1"
  raw=$(echo "$raw" | sed -E 's/\*\*//g; s/^[[:space:]]*//; s/[[:space:]]*$//')
  raw=$(echo "$raw" | sed -E 's/^(🔴|🟢|🟡|🔄|✅|⏳|🔒|🚧)[[:space:]]*//')
  local max=42
  if (( ${#raw} > max )); then
    raw="${raw:0:$((max-1))}…"
  fi
  printf "%s" "$raw"
}

# Determina ícono de estado según el texto del Estado del inventario
plan_status_icon() {
  local estado="$1"
  case "$estado" in
    *"100%"*"CERRADO"*|*"100%"*"archivado"*|*"✅ **100%"*) echo "🎉" ;;
    *"🟢"*) echo "🟢" ;;
    *"🟡"*) echo "🟡" ;;
    *"🔴"*) echo "🔴" ;;
    *"🔒"*|*"bloqueado"*|*"Bloqueado"*) echo "🔒" ;;
    *"🔄"*) echo "🔄" ;;
    *"Incremental"*) echo "♾️" ;;
    *"⏳"*) echo "⏳" ;;
    *) echo "·" ;;
  esac
}

# Cuenta briefs cerrados con patrón "*-plan-N-*" por semana en ventana
plan_briefs_per_week() {
  local plan_n="$1"
  local out=""
  for ((i=0; i<WEEKS; i++)); do out+="0 "; done
  local closed_dir="$ROOT/.claude/chats/closed"
  [[ -d "$closed_dir" ]] || { echo "$out"; return; }
  declare -A counts
  for ((i=0; i<WEEKS; i++)); do counts[$i]=0; done
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    local epoch="${line%% *}"
    local file="${line#* }"
    local weeks_ago=$(( (TODAY_EPOCH - epoch) / WEEK_SEC ))
    if (( weeks_ago < WEEKS )); then
      local idx=$(( WEEKS - 1 - weeks_ago ))
      counts[$idx]=$(( counts[$idx] + 1 ))
    fi
  done < <(
    for f in "$closed_dir"/*-plan-${plan_n}-*.md "$closed_dir"/*-plan-${plan_n}b-*.md; do
      [[ -f "$f" ]] || continue
      local epoch
      epoch=$(git log -1 --diff-filter=A --format=%at -- "$f" 2>/dev/null)
      [[ -z "$epoch" ]] && epoch=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null)
      [[ -n "$epoch" ]] && echo "$epoch $f"
    done
  )
  out=""
  for ((i=0; i<WEEKS; i++)); do out+="${counts[$i]} "; done
  echo "$out"
}

# ============================================================
# 1. Header
# ============================================================
echo "## 📊 Avance del proyecto · $TODAY_ISO · ventana $WEEKS semanas · repo educa-web"
echo

# ============================================================
# 2. Planes activos (NUEVO — parseo del inventario del maestro)
# ============================================================
echo "### 🗂️ Planes activos"
echo
if [[ ! -f "$MAESTRO" ]]; then
  echo "_No existe \`$MAESTRO\`._"
  echo
else
  echo "| # | Plan | Repo | Avance | Sparkline (${WEEKS}w) | Estado |"
  echo "| ---: | --- | --- | --- | --- | --- |"

  awk -F'|' '
    /^\| # \| Plan \| Repo \| Ruta \| Estado \| % \|/ { in_table=1; next }
    in_table && /^\|[[:space:]]*-/ { next }
    in_table && /^[^|]/ { in_table=0 }
    !in_table { next }
    NF >= 7 {
      n=$2; name=$3; repo=$4; estado=$6; pct=$7;
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", n);
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", name);
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", repo);
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", estado);
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", pct);
      # Solo procesar filas con N numérico
      if (n !~ /^[*]*[0-9]+[*]*$/) next;
      # Limpiar bold ** en todos los campos
      gsub(/\*/, "", n);
      gsub(/\*/, "", repo);
      gsub(/\*/, "", pct);
      print n "\t" name "\t" repo "\t" estado "\t" pct
    }
  ' "$MAESTRO" | while IFS=$'\t' read -r n name repo estado pct; do
    [[ -z "$n" ]] && continue

    # Extraer % numérico (primer match)
    pct_num=""
    if [[ "$pct" =~ ([0-9]+)% ]]; then
      pct_num="${BASH_REMATCH[1]}"
    elif [[ "$pct" == *"—"* ]]; then
      pct_num="100"  # archivado = 100%
    fi

    # Skip planes 0% sin actividad (saturarían la tabla)
    if [[ -z "$pct_num" || "$pct_num" == "0" ]]; then
      # Solo mostrar si está marcado como bloqueado activo o ⏳ con sub-marcas
      if [[ "$estado" != *"🔒"* && "$estado" != *"bloqueado"* && "$estado" != *"Bloqueado"* ]]; then
        continue
      fi
    fi

    icon=$(plan_status_icon "$estado")
    name_clean=$(clean_plan_name "$name")
    bar=$(progress_bar "${pct_num:-—}")
    spark_data=$(plan_briefs_per_week "$n")
    spark=$(sparkline $spark_data)

    # Estado short: limpiar bold + emoji inicial duplicado + links + collapse spaces, tomar primeras 50 chars
    estado_short=$(echo "$estado" \
      | sed -E 's/\*\*//g' \
      | sed -E 's/\[.*\]\([^)]*\)//g' \
      | sed -E 's/^(🟢|🟡|🔴|🔄|✅|⏳|🔒|🚧|🎉|·)[[:space:]]*//' \
      | sed -E 's/  +/ /g' \
      | sed -E 's/^[[:space:]]+//' \
      | cut -c1-50)
    [[ ${#estado_short} -ge 50 ]] && estado_short="${estado_short:0:49}…"

    printf "| %s | %s | %s | \`%s\` | \`%s\` | %s %s |\n" "$n" "$name_clean" "$repo" "$bar" "$spark" "$icon" "$estado_short"
  done
fi
echo

# ============================================================
# 3. Volumen general (commits + briefs cerrados/semana)
# ============================================================
declare -a commits_week briefs_week
for ((i=0; i<WEEKS; i++)); do commits_week[$i]=0; briefs_week[$i]=0; done

while read -r epoch; do
  [[ -z "$epoch" ]] && continue
  weeks_ago=$(( (TODAY_EPOCH - epoch) / WEEK_SEC ))
  if (( weeks_ago < WEEKS )); then
    idx=$(( WEEKS - 1 - weeks_ago ))
    commits_week[$idx]=$(( commits_week[idx] + 1 ))
  fi
done < <(git log --since="$WEEKS weeks ago" --format=%at 2>/dev/null)

cur_epoch=0
while read -r line; do
  if [[ "$line" =~ ^[0-9]+$ ]]; then
    cur_epoch="$line"
  elif [[ "$line" =~ \.claude/chats/closed/.*\.md$ ]]; then
    weeks_ago=$(( (TODAY_EPOCH - cur_epoch) / WEEK_SEC ))
    if (( weeks_ago < WEEKS )); then
      idx=$(( WEEKS - 1 - weeks_ago ))
      briefs_week[$idx]=$(( briefs_week[idx] + 1 ))
    fi
  fi
done < <(git log --since="$WEEKS weeks ago" --diff-filter=A --format='%at' --name-only -- '.claude/chats/closed/*.md' 2>/dev/null)

total_commits=0; for n in "${commits_week[@]}"; do total_commits=$((total_commits + n)); done
total_briefs=0;  for n in "${briefs_week[@]}";  do total_briefs=$((total_briefs + n));   done

echo "### 📈 Volumen general"
echo
echo '```text'
printf "commits  "; sparkline "${commits_week[@]}"; printf "  (%d)\n" "$total_commits"
printf "briefs   "; sparkline "${briefs_week[@]}"; printf "  (%d)\n" "$total_briefs"
printf "         %-12s%s\n" "${WEEKS}w ago" "now"
echo '```'
echo

# ============================================================
# 4. Subsistemas con churn y zonas muertas
# ============================================================
DEAD_THRESHOLD_DAYS=$(( WEEKS * 7 / 2 ))
top_subs=$(git log --since="$WEEKS weeks ago" --format= --name-only 2>/dev/null \
  | grep -E '^src/app/(core|features|shared)/' \
  | awk -F/ 'NF>=4 {print $3 "/" $4}' \
  | sort | uniq -c | sort -rn | head -8)

dead_zones=()
for d in src/app/core/*/ src/app/features/*/ src/app/shared/*/; do
  [[ -d "$d" ]] || continue
  rel="${d#src/app/}"; rel="${rel%/}"
  last=$(git log -1 --format=%at -- "$d" 2>/dev/null)
  if [[ -n "$last" ]]; then
    days=$(( (TODAY_EPOCH - last) / 86400 ))
    (( days > DEAD_THRESHOLD_DAYS )) && dead_zones+=("$days|$rel")
  fi
done

echo "### 🔥 Subsistemas con churn (${WEEKS}w)"
echo
if [[ -z "$top_subs" ]]; then
  echo "_Sin commits en \`src/app/{core,features,shared}/\` en la ventana._"
else
  echo "| # | Subsistema | Files-touched | Estado |"
  echo "| ---: | --- | ---: | --- |"
  rank=0
  echo "$top_subs" | while read -r count path; do
    [[ -z "$count" ]] && continue
    rank=$((rank + 1))
    if (( rank <= 3 )); then icon="🔥 hot"
    elif (( rank <= 6 )); then icon="🟢 activo"
    else icon="🟡 bajo"
    fi
    echo "| $rank | \`$path\` | $count | $icon |"
  done
fi
echo

echo "### 💀 Zonas muertas en código (>${DEAD_THRESHOLD_DAYS}d sin tocar)"
echo
if [[ ${#dead_zones[@]} -eq 0 ]]; then
  echo "🟢 _Ninguna — todos los subsistemas FE se tocaron en los últimos ${DEAD_THRESHOLD_DAYS} días._"
else
  echo "| Subsistema | Días sin commit | Severidad |"
  echo "| --- | ---: | --- |"
  printf '%s\n' "${dead_zones[@]}" | sort -rn | head -8 | while IFS='|' read -r days path; do
    if (( days > 90 )); then icon="💀 crítico"
    elif (( days > 60 )); then icon="🔴 alto"
    else icon="🟡 medio"
    fi
    echo "| \`$path\` | $days | $icon |"
  done
fi
echo

# ============================================================
# 5. Cola del maestro (top 5)
# ============================================================
echo "### 📋 Cola del maestro (top 5)"
echo
if [[ ! -f "$MAESTRO" ]]; then
  echo "_No existe \`$MAESTRO\`._"
else
  cola=$(awk 'BEGIN{IGNORECASE=1}
    /^##.*chats.*cola/ { in_section=1; next }
    /^## / && in_section==1 { in_section=0 }
    in_section==1 && /^[0-9]+\.[[:space:]]+\*\*/ { print }
  ' "$MAESTRO" | head -5)
  if [[ -z "$cola" ]]; then
    echo "_Cola vacía._"
  else
    echo "$cola"
  fi
fi
echo

echo "_Generado por \`.claude/scripts/progress.sh\` · ventana $WEEKS semanas_"
