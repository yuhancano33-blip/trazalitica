import { describe, it, expect } from 'vitest';
import { ApiError, fromSupabaseError } from '../../server/lib/api-error.js';

describe('fromSupabaseError', () => {
  it.each([
    ['23505', 409, 'CONFLICT'],
    ['23503', 422, 'BUSINESS_RULE_VIOLATION'],
    ['23514', 400, 'VALIDATION_ERROR'],
    ['42501', 403, 'FORBIDDEN'],
    ['PGRST116', 404, 'NOT_FOUND'],
    ['P0409', 409, 'VERSION_CONFLICT'],
  ])('mapea %s a %i %s', (pgCode, status, code) => {
    const err = fromSupabaseError({ code: pgCode, message: 'detalle interno de la BD' });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(status);
    expect(err.code).toBe(code);
    expect(err.message).not.toContain('detalle interno');
  });

  it('convierte un error desconocido en 500 sin filtrar el mensaje original', () => {
    const err = fromSupabaseError({ code: 'XX000', message: 'stack secreto' });
    expect(err.status).toBe(500);
    expect(err.message).toBe('Error interno');
  });
});
