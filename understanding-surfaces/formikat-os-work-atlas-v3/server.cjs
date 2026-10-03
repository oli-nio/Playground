const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 4173;
const root = __dirname;
http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://local').pathname);
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file,(err,data) => { if(err) {res.writeHead(404);res.end('Not found');return;} res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.md')?'text/plain; charset=utf-8':'application/octet-stream'); res.end(data); });
}).listen(port,'0.0.0.0',()=>console.log('Work Atlas preview on '+port));
