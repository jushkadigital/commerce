# Migración Manual Requerida

## Problema
Las tablas del módulo `tour-booking` anterior ya existen en la base de datos, lo que causa conflicto con las nuevas migraciones de `tour`.

## Solución
Ejecutar el siguiente SQL en PostgreSQL antes de correr las migraciones:

```sql
-- Eliminar tablas antiguas del módulo tour-booking
DROP TABLE IF EXISTS "tour_booking" CASCADE;
DROP TABLE IF EXISTS "tour_variant" CASCADE;
DROP TABLE IF EXISTS "tour_service_variant" CASCADE;
DROP TABLE IF EXISTS "tour" CASCADE;
```

## Comando
```bash
# Si tienes acceso a psql:
psql $DATABASE_URL -f /tmp/fix_tour_migrations.sql

# O ejecuta manualmente en tu cliente PostgreSQL
```

## Nota
⚠️ **ADVERTENCIA**: Esto eliminará TODOS los datos de tours existentes. Si necesitas preservar datos, haz backup primero:
```bash
pg_dump $DATABASE_URL --data-only --table='tour*' > tour_backup.sql
```

## Después de ejecutar SQL
Una vez limpiadas las tablas, ejecuta:
```bash
npx medusa db:migrate
```

Las migraciones deberían completarse exitosamente.
