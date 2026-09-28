# Anexo A. Resumen de la revisión de la versión 1.0

Los hallazgos más relevantes de la revisión, que motivan los cambios incorporados en cada spec, son los siguientes:

| # | Hallazgo | Impacto | Spec |
|---|---|---|---|
| 1 | No existían las tablas `projects`, `project_members` ni `requirements`, aunque varias specs las referenciaban como llave foránea. | Alto: el esquema no podía migrarse. | 0 |
| 2 | El gráfico de saliencia cruzaba "poder vs. interés/legitimidad". El modelo de saliencia usa poder, legitimidad y urgencia; "interés" pertenece a otra matriz (poder-interés). | Medio: inconsistencia teórica. | 1 |
| 3 | La Fase 1 no capturaba la VOC en sí (acta, necesidad expresada, objetivo, fuentes de datos mencionadas). | Alto: el marco exige estos datos. | 1 |
| 4 | Kano se modelaba con puntajes enteros. El cuestionario Kano usa respuestas categóricas y una tabla de evaluación que produce seis categorías, no tres; además se requiere agregación entre varios encuestados. | Alto: la clasificación sería incorrecta. | 2 |
| 5 | No se registraban factibilidad, dependencias ni informe de viabilidad temprana (exigidos en Fase 2). | Medio. | 2 |
| 6 | Los nodos DAPS no pertenecían a un diagrama ni a un proyecto, faltaba el nodo "Fuente de datos" y el cliente de Supabase no ofrece transacciones de varias sentencias directamente. | Alto. | 3 |
| 7 | Las fichas no incluían descripción, origen, prioridad, estado ni árbol CTQ; la calidad de datos era texto libre. | Medio. | 4 |
| 8 | El trigger de auditoría depende de `auth.uid()`, que es nulo si el backend usa la llave `service_role`; además `change_log` no era realmente inmutable. | Alto: la auditoría quedaría sin autor. | 5 |
| 9 | El gate usaba un único `aprobado_por`, no registraba rechazos ni observaciones, no permitía retroceder de fase (el marco es iterativo) y respondía 403 ante una regla de negocio. | Alto. | 6 |
| 10 | La política RLS cubría solo SELECT; la llave `service_role` omite RLS; `express-rate-limit` en memoria no funciona en serverless. | Alto: falsa sensación de seguridad. | 7 |
| 11 | Los roles se guardaban en metadatos de usuario, que el propio usuario puede modificar; los roles además deben ser por proyecto. | Crítico: escalamiento de privilegios. | 8 |
| 12 | No había forma de medir el impacto del marco en el estudio de caso. | Medio: afecta el OE3. | 9 |

