
const tls = require('tls');
const host = '22f5c40e1f97aad6d3792642f156df05.r2.cloudflarestorage.com';

console.log(`Testing TLS connection to ${host}...`);
const socket = tls.connect(443, host, { servername: host }, () => {
  console.log('connected', socket.authorized ? 'authorized' : 'unauthorized');
  socket.end();
});

socket.on('error', (err) => {
  console.error('TLS Error:', err);
});
