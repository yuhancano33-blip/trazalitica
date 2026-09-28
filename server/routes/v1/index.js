import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Los routers de cada spec se registran aquí, p. ej.:
// router.use(projectsRouter);

export default router;
