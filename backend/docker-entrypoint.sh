#!/bin/sh
set -e

echo "🔧 Generando cliente Prisma..."
npx prisma generate

echo "🗄️  Aplicando migraciones..."
npx prisma migrate deploy

if [ "${SEED_DB:-true}" = "true" ]; then
  echo "🌱 Ejecutando seed (idempotente)..."
  node dist/seed/seed.js
fi

echo "🚀 Iniciando NeatHogar API..."
exec "$@"
