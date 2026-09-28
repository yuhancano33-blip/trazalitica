import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../server/app.js';

describe('API base /api/v1', () => {
  it('GET /health responde 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('una ruta inexistente responde 404 con el formato de error uniforme', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('details');
  });

  it('un JSON mal formado responde 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"mal":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('aplica cabeceras de seguridad (helmet) y oculta x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('no refleja CORS para un origen no permitido', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://malicioso.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
