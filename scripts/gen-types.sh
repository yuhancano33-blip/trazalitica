#!/usr/bin/env bash
# Genera los tipos de la base de datos a partir del esquema de Supabase.
#   Local (por defecto):  bash scripts/gen-types.sh
#   Remoto:               SUPABASE_PROJECT_ID=<ref> bash scripts/gen-types.sh
# Solo se exporta el esquema public; auth y storage no forman parte del contrato de la app.
set -euo pipefail

OUT="src/types/supabase.ts"
mkdir -p "$(dirname "$OUT")"

if [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > "$OUT.tmp"
else
  npx supabase gen types typescript --local --schema public > "$OUT.tmp"
fi

mv "$OUT.tmp" "$OUT"
echo "Tipos generados en $OUT"
