# Specs — Plataforma de soporte al Marco de gestión de requisitos en proyectos de análisis de datos

Versión 2.0 — Afanador-Calderon D. A., Diaz-Andrade A. F., Marroquin-Cano Y. Y., Hernandez C. D. (UNAC, GI2A)

## Índice

| Archivo | Contenido | Fase | Rama |
|---|---|---|---|
| [00-convenciones-transversales.md](00-convenciones-transversales.md) | Reglas comunes de BD, API, Git y Definición de Terminado | Todas | — |
| [spec-00-nucleo-datos.md](spec-00-nucleo-datos.md) | Spec 0: Núcleo de datos del proyecto | Transversal | `feature/nucleo-datos-proyecto` |
| [spec-01-elicitacion-stakeholders.md](spec-01-elicitacion-stakeholders.md) | Spec 1: Elicitación y mapeo sociotécnico | Fase 1: Elicitación | `feature/modulo-elicitacion-stakeholders` |
| [spec-02-priorizacion-kano.md](spec-02-priorizacion-kano.md) | Spec 2: Priorización con modelo Kano | Fase 2: Análisis y Priorización | `feature/priorizacion-modelo-kano` |
| [spec-03-diagramas-daps.md](spec-03-diagramas-daps.md) | Spec 3: Diagramas DAPS | Fase 2: Análisis y Priorización | `feature/editor-diagramas-daps` |
| [spec-04-fichas-ctq-kpi.md](spec-04-fichas-ctq-kpi.md) | Spec 4: Fichas CTQ-KPI | Fase 3: Especificación | `feature/fichas-especificacion-ctq` |
| [spec-05-trazabilidad-change-log.md](spec-05-trazabilidad-change-log.md) | Spec 5: Trazabilidad y change log inmutable | Fase 4: Validación y Trazabilidad | `feature/matriz-trazabilidad-inmutable` |
| [spec-06-motor-estados-gates.md](spec-06-motor-estados-gates.md) | Spec 6: Motor de estados y gates | Fase 4: Validación y Trazabilidad | `feature/motor-estados-gates` |
| [spec-07-seguridad-rls.md](spec-07-seguridad-rls.md) | Spec 7: Aislamiento de infraestructura y RLS | Seguridad transversal | `chore/configuracion-seguridad-rls` |
| [spec-08-autenticacion-rbac.md](spec-08-autenticacion-rbac.md) | Spec 8: Autenticación JWT y RBAC | Seguridad transversal | `feature/autenticacion-rbac-jwt` |
| [spec-09-metricas-estudio-caso.md](spec-09-metricas-estudio-caso.md) | Spec 9: Métricas para el estudio de caso | Estudio de caso (OE3) | `feature/metricas-estudio-caso` |
| [anexos/A-revision-version-1.md](anexos/A-revision-version-1.md) | Hallazgos de la revisión de la v1.0 | — | — |
| [anexos/B-observaciones-documentos-base.md](anexos/B-observaciones-documentos-base.md) | Inconsistencias del artículo y la evidencia; referencias sugeridas | — | — |

> Leer primero `00-convenciones-transversales.md`: aplica a todas las specs.

## 1. Propósito y alcance

Este documento traduce el marco de trabajo de cuatro fases (Elicitación, Análisis y Priorización, Especificación, Validación y Trazabilidad) en especificaciones técnicas implementables para una plataforma web que soporte su aplicación en proyectos reales, en particular durante el estudio de caso previsto para el Objetivo Específico 3. Cada spec se deriva de la información a documentar y de los artefactos que el marco exige en cada fase, de modo que la herramienta sea una instanciación fiel del marco y no un sistema paralelo.

La versión 1.0 contenía ocho specs con una base técnica sólida (Supabase, Node.js/Express, Vue 3, Vercel). Esta versión 2.0 corrige inconsistencias conceptuales y técnicas detectadas, agrega un núcleo de datos común (Spec 0) que antes no existía y del que dependían varias llaves foráneas, y añade una spec de métricas (Spec 9) para medir el impacto del marco en el estudio de caso.

## 1.1 Stack tecnológico de referencia

| Capa | Tecnología | Observación |
|---|---|---|
| Base de datos y autenticación | Supabase (PostgreSQL 15+, Supabase Auth, RLS) | Toda tabla con RLS habilitado (Spec 7). |
| Backend / API | Node.js 20 LTS + Express, Zod para validación | Desplegado como funciones serverless en Vercel. |
| Frontend | Vue 3 (Composition API, `<script setup>`), Vite, Pinia, vue-router | Librerías: @vue-flow/core, ag-grid-vue3, vue-echarts. |
| Despliegue | Vercel (frontend y API) | Cabeceras de seguridad en `vercel.json`. |
| Control de versiones | Git + GitHub, flujo por ramas de funcionalidad | Convención de ramas y commits en la sección 2. |

## 3. Trazabilidad entre el marco de trabajo y las specs

La tabla siguiente muestra cómo cada artefacto exigido por el marco queda respaldado por una spec. Es, en sí misma, una pequeña matriz de trazabilidad del sistema hacia el marco.

| Fase del marco | Artefacto exigido por el marco | Spec que lo implementa |
|---|---|---|
| Transversal | Proyecto, miembros, objetivos de negocio, requisitos, KPI, fuentes de datos | Spec 0 — Núcleo de datos |
| Fase 1: Elicitación | Acta de reunión de elicitación, ficha de caso de negocio, mapa de stakeholders con saliencia | Spec 1 |
| Fase 2: Análisis y Priorización | Clasificación por tipo, matriz de priorización Kano, informe de viabilidad temprana | Spec 2 |
| Fase 2: Análisis y Priorización | Diagrama DAPS (objetivo, pregunta analítica, KPI, fuente de datos) | Spec 3 |
| Fase 3: Especificación | Ficha de especificación, backlog priorizado, matriz CTQ-KPI | Spec 4 |
| Fase 4: Validación y Trazabilidad | Matriz de trazabilidad (requisito, objetivo, artefacto técnico) y registro de cambios | Spec 5 |
| Fase 4: Validación y Trazabilidad | Gates de validación, acta de validación, retorno iterativo a fases previas | Spec 6 |
| Transversal | Protección de la información del proyecto | Specs 7 y 8 |
| Estudio de caso (OE3) | Evidencia de trazabilidad, alineación, retrabajo y percepción | Spec 9 |

## 5. Orden de implementación sugerido

| Orden | Spec | Justificación |
|---|---|---|
| 1 | Spec 0 — Núcleo de datos | Todas las demás dependen de sus tablas. |
| 2 | Spec 8 — Autenticación y roles | Define identidad y roles que usan las políticas y los endpoints. |
| 3 | Spec 7 — RLS e infraestructura | Conviene que la seguridad exista antes de cargar datos reales. |
| 4 | Spec 5 (solo `change_log` y triggers) | La auditoría debe registrar desde el primer requisito. |
| 5 | Spec 1 — Elicitación | Primera fase del marco. |
| 6 | Specs 2 y 3 — Kano y DAPS | Segunda fase; pueden desarrollarse en paralelo. |
| 7 | Spec 4 — Fichas CTQ-KPI | Tercera fase. |
| 8 | Spec 5 (matriz) y Spec 6 — Gates | Cuarta fase; los gates usan los criterios de las fases anteriores. |
| 9 | Spec 9 — Métricas | Se alimenta de todo lo anterior; necesaria antes de iniciar el estudio de caso. |

