// backend/src/server.js
import app from './app.js';
import { prisma } from './config/prisma.js';

async function logDb() {
  const r = await prisma.$queryRaw`SELECT current_database() AS db, inet_server_addr() AS host, inet_server_port() AS port;`;
  console.log('DB CONNECTED TO:', r);
}
logDb().catch(console.error);
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`ActiVibe backend listening on port ${PORT}`);
});
