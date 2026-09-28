---
name: endpoint-express-zod
description: Crear un endpoint REST de Express bajo /api/v1 con autenticación, autorización por rol de proyecto, validación Zod, manejo de errores uniforme y prueba de integración.
---

# Endpoint Express + Zod

## Cuándo usarla

- Implementas una fila de la tabla "Backend" de cualquier spec.
- Cambias el contrato (entrada, salida o códigos) de un endpoint existente.

## Pasos

1. Toma de la spec: método, ruta, rol permitido, códigos de respuesta y criterios de aceptación.
2. Esquema Zod en `shared/schemas/<recurso>.schema.js`.
3. Lógica pura en `server/services/<recurso>.service.js` + pruebas en `tests/unit/`.
4. Ruta en `server/routes/v1/<recurso>.routes.js`; regístrala en `server/routes/v1/index.js`.
5. Prueba de integración en `tests/integration/<recurso>.test.js`.
6. Entrada en OpenAPI (registro del esquema y la ruta).
7. `npm run lint && npm run test:unit && npm run test:integration`.

## Plantilla

### Esquema — `shared/schemas/stakeholder.schema.js`

```js
import { z } from 'zod';

const escala = z.number().int().min(1).max(5); // igual al check de la BD
export const textoPlano = (max) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((v) => !/[<>]/.test(v), 'No se permiten etiquetas HTML');

export const stakeholderSchema = z
  .object({
    nombre: textoPlano(150),
    rol_negocio: textoPlano(100),
    tipo: z.enum(['negocio', 'tecnico', 'usuario_final', 'regulador']),
    poder: escala,
    legitimidad: escala,
    urgencia: escala,
  })
  .strict(); // rechaza campos no declarados (project_id, created_by, rol...)
```

### Ruta — `server/routes/v1/stakeholders.routes.js`

```js
import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requireProjectRole } from '../../middlewares/require-project-role.js';
import { validateBody } from '../../middlewares/validate-body.js';
import { fromSupabaseError } from '../../lib/api-error.js';
import { stakeholderSchema } from '../../../shared/schemas/stakeholder.schema.js';

const router = Router();
const EDITORES = ['lider_tecnico', 'analista_requisitos']; // matriz de permisos, Spec 8

router.post(
  '/projects/:projectId/stakeholders',
  authenticate,
  requireProjectRole(EDITORES),
  validateBody(stakeholderSchema),
  async (req, res) => {
    const { data, error } = await req.supabase // cliente con el JWT del usuario → RLS
      .from('stakeholders')
      .insert({ ...req.body, project_id: req.params.projectId })
      .select()
      .single();
    if (error) throw fromSupabaseError(error);
    res.status(201).json(data);
  },
);

export default router;
```

### Middleware de validación — `server/middlewares/validate-body.js`

```js
import { ApiError } from '../lib/api-error.js';

export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'La entrada no es válida',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  req.body = result.data;
  next();
};
```

Las reglas que dependen de la BD (tipo del requisito leído de la tabla, objetivo de otro proyecto, transición inexistente) se validan en el handler y responden `422 BUSINESS_RULE_VIOLATION`.

### Prueba — `tests/integration/stakeholders.test.js`

```js
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../server/app.js';
import { crearEscenario } from './helpers/escenario.js'; // usuarios y proyectos ficticios

describe('POST /api/v1/projects/:projectId/stakeholders', () => {
  let esc;
  beforeAll(async () => {
    esc = await crearEscenario();
  });

  const valido = {
    nombre: 'Ana Prueba',
    rol_negocio: 'Gerente',
    tipo: 'negocio',
    poder: 4,
    legitimidad: 4,
    urgencia: 4,
  };
  const url = () => `/api/v1/projects/${esc.proyectoA}/stakeholders`;

  it('crea el stakeholder y lo clasifica como definitivo (4,4,4)', async () => {
    const res = await request(app)
      .post(url())
      .set('Authorization', `Bearer ${esc.tokens.analista}`)
      .send(valido);
    expect(res.status).toBe(201);
    expect(res.body.clase_saliencia).toBe('definitivo');
  });

  it('400 si poder = 6', async () => {
    const res = await request(app)
      .post(url())
      .set('Authorization', `Bearer ${esc.tokens.analista}`)
      .send({ ...valido, poder: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('401 sin token', async () => {
    expect((await request(app).post(url()).send(valido)).status).toBe(401);
  });

  it('403 para un científico de datos del proyecto', async () => {
    const res = await request(app)
      .post(url())
      .set('Authorization', `Bearer ${esc.tokens.cientifico}`)
      .send(valido);
    expect(res.status).toBe(403);
  });

  it('404 para un usuario de otro proyecto', async () => {
    const res = await request(app)
      .post(url())
      .set('Authorization', `Bearer ${esc.tokens.ajeno}`)
      .send(valido);
    expect(res.status).toBe(404);
  });
});
```

## Checklist final

- [ ] Ruta, método y rol coinciden con la tabla de la spec.
- [ ] Cadena `authenticate → requireProjectRole → validateBody → handler` en ese orden.
- [ ] Solo `req.supabase`; ningún cliente global ni `service_role`.
- [ ] Esquema `.strict()`, longitudes máximas, rangos iguales a los `check` de la BD, texto plano sin `<`/`>`.
- [ ] `project_id` y `created_by` nunca vienen del cuerpo.
- [ ] Errores con `ApiError`/`fromSupabaseError`; formato `{ error: { code, message, details } }`.
- [ ] Códigos: 400 esquema, 401 sin sesión, 403 rol, 404 no miembro/inexistente, 409 conflicto, 422 regla de negocio.
- [ ] Pruebas: feliz, 400, 401, 403, 404 y criterios de aceptación de la spec.
- [ ] OpenAPI actualizado.
