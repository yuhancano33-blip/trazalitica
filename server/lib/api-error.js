// Error de API con el formato uniforme { error: { code, message, details } } (convenciones transversales).
export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Códigos de PostgreSQL / PostgREST más frecuentes → respuesta HTTP.
// El mensaje original de la BD no se expone al cliente.
const MAPA_PG = {
  23505: [409, 'CONFLICT', 'El recurso ya existe'],
  23503: [422, 'BUSINESS_RULE_VIOLATION', 'Referencia a un recurso inexistente o de otro proyecto'],
  23514: [400, 'VALIDATION_ERROR', 'Un valor no cumple las restricciones'],
  23502: [400, 'VALIDATION_ERROR', 'Falta un campo obligatorio'],
  42501: [403, 'FORBIDDEN', 'No tiene permiso para esta operación'],
  PGRST116: [404, 'NOT_FOUND', 'Recurso no encontrado'],
  P0409: [409, 'VERSION_CONFLICT', 'El recurso fue modificado por otro usuario'],
};

export function fromSupabaseError(error) {
  const conocido = MAPA_PG[error?.code];
  if (conocido) return new ApiError(...conocido);
  return new ApiError(500, 'INTERNAL_ERROR', 'Error interno');
}
