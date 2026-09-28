// Servidor local para desarrollo. En Vercel la entrada es api/index.js.
import app from './app.js';

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API en http://localhost:${port}/api/v1`);
});
