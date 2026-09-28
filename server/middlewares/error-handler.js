import { ApiError } from '../lib/api-error.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, 'NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.path}`));
}

// Express identifica el manejador de errores por sus 4 argumentos: _next debe quedarse.
export function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    err = new ApiError(400, 'VALIDATION_ERROR', 'JSON mal formado');
  } else if (err.type === 'entity.too.large') {
    err = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la petición es demasiado grande');
  }

  if (!(err instanceof ApiError)) {
    req.log?.error({ err }, 'error no controlado');
    err = new ApiError(500, 'INTERNAL_ERROR', 'Error interno');
  }

  res.status(err.status).json({
    error: { code: err.code, message: err.message, details: err.details },
  });
}
