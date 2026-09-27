# Convenciones transversales

Estas reglas aplican a todas las specs y evitan que cada módulo resuelva de forma distinta los mismos problemas.

### Base de datos

- Identificadores `uuid` con `default gen_random_uuid()`. Nombres de tablas y columnas en `snake_case`. Se recomienda fijar un idioma único para el esquema (este documento usa español para conceptos del marco y términos técnicos estándar en inglés, como `created_at`).
- Toda tabla de negocio incluye `project_id`, `created_by`, `created_at` y `updated_at`. Incluir `project_id` también en tablas hijas (por ejemplo, nodos DAPS) simplifica las políticas RLS y evita subconsultas costosas.
- Los rangos y reglas críticas se validan en dos capas: en la API (Zod) y en la base de datos (`check`, `not null`, llaves foráneas). La base de datos es la última línea de defensa.
- Migraciones versionadas con Supabase CLI (`supabase/migrations`), nunca cambios manuales en el panel en producción.

### API REST

- Prefijo `/api/v1`. Recursos anidados bajo el proyecto cuando pertenecen a él (`/projects/:projectId/...`).
- Formato de error uniforme: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.
- Códigos HTTP: 400 entrada mal formada; 401 sin sesión válida; 403 sin permiso por rol; 404 recurso inexistente o no visible para el usuario; 409 conflicto de estado o de versión; 422 regla de negocio no cumplida.
- Documentación OpenAPI 3.1 generada a partir de los esquemas Zod (por ejemplo, con `zod-to-openapi`).

### Git y calidad

- Ramas: `feature/<kebab-case>`, `fix/<kebab-case>`, `chore/<kebab-case>`. Se conservan los nombres de rama propuestos en la versión 1.0.
- Commits con Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Pull requests obligatorios hacia `main` con al menos una revisión y CI en verde (lint, pruebas, `npm audit`).
- **Definición de Terminado (DoD)** para cada spec: migraciones aplicadas, políticas RLS probadas, pruebas unitarias de la lógica de negocio, pruebas de integración de endpoints, criterios de aceptación de la spec verificados y documentación OpenAPI actualizada.

