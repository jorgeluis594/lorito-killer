#!/usr/bin/env bash
# Compila el gateway para Windows con la configuración de producción incrustada.
# Uso: ./publish-prod.sh [win-x64|win-x86]   (por defecto ambos)
set -euo pipefail
cd "$(dirname "$0")"
ENV_FILE="${ENV_FILE:-../../.env}"
BACKEND_URL="${PRINT_BACKEND_URL:-https://kogoz.net}"
get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
SUPABASE_URL="$(get NEXT_PUBLIC_SUPABASE_URL)"
SUPABASE_KEY="$(get NEXT_PUBLIC_SUPABASE_ANON_KEY)"
[ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ] || { echo "Faltan valores de Supabase en $ENV_FILE" >&2; exit 1; }
runtimes=("${@:-win-x64 win-x86}")
for rt in ${runtimes[@]}; do
  dotnet publish Lorito.PrintGateway.csproj -c Release -f net10.0-windows -r "$rt" --self-contained true \
    -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true \
    -p:EmbeddedBackendUrl="$BACKEND_URL" -p:EmbeddedSupabaseUrl="$SUPABASE_URL" -p:EmbeddedSupabaseKey="$SUPABASE_KEY" \
    -o "publish/$rt"
done
