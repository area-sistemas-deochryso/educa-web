#!/bin/bash
# drift-check-quick.sh — Hook pre-push para educa-web
# Checks rápidos que se ejecutan antes de cada push.
# C1.1 (refs rotas en CLAUDE.md) bloquea el push (exit 1).
# Resto son warnings informativos.

set -uo pipefail

# Resolve project root (where .claude/ lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_ROOT="$(cd "$PROJECT_ROOT/../Educa.API/Educa.API" 2>/dev/null && pwd || echo "")"

ERRORS=0
WARNINGS=0

echo "========================================="
echo " drift-check-quick (pre-push)"
echo "========================================="

# ─────────────────────────────────────────────
# C1.1 — @-refs rotas en CLAUDE.md (BLOQUEANTE)
# ─────────────────────────────────────────────
echo ""
echo "[C1.1] Verificando @-refs en CLAUDE.md..."

CLAUDE_MD="$PROJECT_ROOT/.claude/CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
  while IFS= read -r line; do
    # Extract path after @
    ref_path=$(echo "$line" | sed 's/^@//')
    # Resolve relative to .claude/ directory
    full_path="$PROJECT_ROOT/.claude/$ref_path"
    # Strip .claude/.claude/ if doubled
    full_path=$(echo "$full_path" | sed "s|/.claude/.claude/|/.claude/|g")

    if [ ! -f "$full_path" ] && [ ! -d "$full_path" ]; then
      echo "  ROTA: @$ref_path -> $full_path"
      ERRORS=$((ERRORS + 1))
    fi
  done < <(grep -E "^@" "$CLAUDE_MD" 2>/dev/null || true)

  if [ "$ERRORS" -eq 0 ]; then
    echo "  OK: Todas las @-refs existen."
  fi
else
  echo "  SKIP: CLAUDE.md no encontrado."
fi

# ─────────────────────────────────────────────
# C5.1 — Separadores ==== (WARNING)
# ─────────────────────────────────────────────
echo ""
echo "[C5.1] Buscando separadores ==== en TS..."

SEPARATORS=$(grep -rn "// =====" "$PROJECT_ROOT/src/app/" --include="*.ts" 2>/dev/null | wc -l)
if [ "$SEPARATORS" -gt 0 ]; then
  echo "  WARNING: $SEPARATORS archivos con separadores ====. Migrar a // #region."
  WARNINGS=$((WARNINGS + 1))
fi

# ─────────────────────────────────────────────
# C5.6 — DateTime.Now en BE (WARNING)
# ─────────────────────────────────────────────
if [ -n "$BACKEND_ROOT" ] && [ -d "$BACKEND_ROOT" ]; then
  echo ""
  echo "[C5.6] Buscando DateTime.Now en backend..."

  DT_NOW=$(grep -rn "DateTime\.Now\b" "$BACKEND_ROOT" --include="*.cs" 2>/dev/null | grep -v "// OK" | grep -v "PeruNow" | wc -l)
  if [ "$DT_NOW" -gt 0 ]; then
    echo "  WARNING: $DT_NOW ocurrencias de DateTime.Now. Usar DateTimeHelper.PeruNow()."
    WARNINGS=$((WARNINGS + 1))
  fi

  # ─────────────────────────────────────────────
  # C5.5 — Archivos BE > 300 líneas (WARNING)
  # ─────────────────────────────────────────────
  echo ""
  echo "[C5.5] Buscando archivos BE > 300 lineas..."

  BIG_FILES=$(find "$BACKEND_ROOT" -name "*.cs" -exec wc -l {} + 2>/dev/null | awk '$1 > 300 {print}' | grep -v "ApplicationDbContext" | grep -v "total" | wc -l)
  if [ "$BIG_FILES" -gt 0 ]; then
    echo "  WARNING: $BIG_FILES archivos .cs con mas de 300 lineas (excl. DbContext)."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# ─────────────────────────────────────────────
# Reporte viejo (WARNING)
# ─────────────────────────────────────────────
REPORT="$PROJECT_ROOT/.claude/reporte-drift-check/drift-report.md"
if [ -f "$REPORT" ]; then
  echo ""
  echo "[INFO] Verificando antigüedad del reporte..."

  # Check if report is older than 7 days
  REPORT_AGE_DAYS=$(( ($(date +%s) - $(date -r "$REPORT" +%s 2>/dev/null || stat -c %Y "$REPORT" 2>/dev/null || echo "0")) / 86400 ))
  if [ "$REPORT_AGE_DAYS" -gt 7 ]; then
    echo "  WARNING: El reporte tiene ${REPORT_AGE_DAYS} dias. Ejecutar /drift-check para actualizar."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# ─────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────
echo ""
echo "========================================="
echo " Resultado: $ERRORS errores, $WARNINGS warnings"
echo "========================================="

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "PUSH BLOQUEADO: Hay $ERRORS referencia(s) rota(s) en CLAUDE.md."
  echo "Corregir las @-refs antes de pushear."
  exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo ""
  echo "Push permitido con $WARNINGS warning(s). Considerar ejecutar /drift-check."
fi

exit 0
