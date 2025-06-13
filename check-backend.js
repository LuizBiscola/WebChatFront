// Script para verificar se o backend está rodando
const https = require('https');
const http = require('http');

const ports = [5093, 7267, 5000, 7000];
const hosts = ['localhost', '127.0.0.1'];

function checkEndpoint(protocol, host, port) {
  return new Promise((resolve) => {
    const client = protocol === 'https' ? https : http;
    const options = {
      hostname: host,
      port: port,
      path: '/api/users', // Endpoint comum
      method: 'GET',
      timeout: 2000,
      rejectUnauthorized: false // Para HTTPS com certificados auto-assinados
    };

    const req = client.request(options, (res) => {
      resolve({ 
        success: true, 
        url: `${protocol}://${host}:${port}`, 
        status: res.statusCode 
      });
    });

    req.on('error', () => {
      resolve({ success: false, url: `${protocol}://${host}:${port}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, url: `${protocol}://${host}:${port}` });
    });

    req.end();
  });
}

async function checkAllEndpoints() {
  console.log('Verificando endpoints do backend...\n');
  
  for (const host of hosts) {
    for (const port of ports) {
      // Testar HTTPS primeiro
      const httpsResult = await checkEndpoint('https', host, port);
      if (httpsResult.success) {
        console.log(`✅ Backend encontrado: ${httpsResult.url} (Status: ${httpsResult.status})`);
        return httpsResult.url;
      }
      
      // Testar HTTP se HTTPS falhar
      const httpResult = await checkEndpoint('http', host, port);
      if (httpResult.success) {
        console.log(`✅ Backend encontrado: ${httpResult.url} (Status: ${httpResult.status})`);
        return httpResult.url;
      }
      
      console.log(`❌ Não encontrado: ${httpsResult.url} e ${httpResult.url}`);
    }
  }
  
  console.log('\n❌ Nenhum backend encontrado nas portas testadas.');
  console.log('Verifique se o backend está rodando e em qual porta.');
  return null;
}

checkAllEndpoints().then(result => {
  if (result) {
    console.log(`\n📝 Configure o environment.ts para usar: ${result}`);
  }
});
