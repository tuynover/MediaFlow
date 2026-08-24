import net from 'node:net';

const SERVICES = [
  { name: 'PostgreSQL', host: 'localhost', port: 5432 },
  { name: 'Redis', host: 'localhost', port: 6379 },
  { name: 'MinIO API', host: 'localhost', port: 9000 },
];

function checkService(service) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(service.port, service.host);
  });
}

async function waitForAll() {
  console.log('⏳ Checking infrastructure services readiness (PostgreSQL, Redis, MinIO)...');
  for (const service of SERVICES) {
    const ready = await checkService(service);
    if (ready) {
      console.log(`  ✅ ${service.name} is reachable on ${service.host}:${service.port}`);
    } else {
      console.log(`  🟡 ${service.name} is not reachable on ${service.host}:${service.port} (run 'docker compose up -d' to start)`);
    }
  }
}

waitForAll();
