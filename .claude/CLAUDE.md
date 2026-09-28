# CLAUDE.md

Lee y sigue `AGENTS.md` en la raíz del repositorio: es la fuente única de verdad del proyecto (marco, stack, comandos, convenciones, Git, reglas de seguridad y Definición de Terminado).

@../AGENTS.md

## Notas específicas de Claude Code

- Antes de implementar cualquier parte de una spec, lee `docs/specs/00-convenciones-transversales.md` y la spec correspondiente en `docs/specs/`.
- Comandos del proyecto en `.claude/commands/`: `/nueva-migracion`, `/nuevo-endpoint`, `/nuevo-componente`, `/revisar-seguridad`.
- Plantillas y checklists detallados en `.agents/skills/<skill>/SKILL.md`; los comandos remiten a ellas.
- Trabaja en la rama de la spec (ver su encabezado). No hagas commit en `main`.
- Si una instrucción de la spec choca con `AGENTS.md` (p. ej. una tabla sin `created_by`), aplica `AGENTS.md` y menciónalo en el resumen.
