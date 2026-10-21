import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createBingService, HttpError, MARKETS } from './lib/bing.mjs';
import { startHistoryCollector } from './lib/history.mjs';
import { createImageReadPool } from './lib/image-reads.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/sw.js': ['sw.js', 'text/javascript; charset=utf-8'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
};

function defaultService() {
  return createBingService({cacheDir:join(root,'.cache'),historyDir:resolve(root,process.env.HISTORY_DIR || '.history'),
    historyRepository:process.env.HISTORY_REPOSITORY || undefined,
    onError:(context,error)=>console.warn(`[upstream ${context}] ${error.message}`)});
}
export function startSavedHistoryCollector(service,onWarning=error=>console.warn(`[history sync] ${error.message}`)) {
  return startHistoryCollector({collect:async()=>{
    const result=await service.syncHistory();
    // A completed sync has already persisted its precise image/freshness diagnosis.
    if(result.error)onWarning(new Error(result.error));
  },onError:async error=>{await service.history.markSyncError();onWarning(error);}});
}
export function createApp({ service = defaultService(), imageReads = createImageReadPool(), imageSendTimeoutMs = 30000 } = {}) {
  if(!Number.isSafeInteger(imageSendTimeoutMs) || imageSendTimeoutMs<1)throw new TypeError('Invalid image response timeout');
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data: https://www.bing.com https://cn.bing.com; connect-src 'self' https://www.bing.com https://cn.bing.com; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    function send(status, body, type = 'application/json; charset=utf-8') {
      const data = Buffer.isBuffer(body) ? body : Buffer.from(type.startsWith('application/json') ? JSON.stringify(body) : body);
      response.writeHead(status, { 'Content-Type': type, 'Content-Length': data.length });
      response.end(request.method === 'HEAD' ? undefined : data);
    }
    async function sendImage(key,load,cacheControl,filename) {
      const controller=new AbortController();let lease,timer;
      const finish=()=>{
        clearTimeout(timer);controller.abort();lease?.release();lease=null;
        response.off('finish',finish);response.off('close',finish);
      };
      response.once('finish',finish);response.once('close',finish);
      try {
        lease=await imageReads.acquire(key,load,{signal:controller.signal});
        if(response.destroyed){finish();return;}
        response.setHeader('Cache-Control',cacheControl);
        if(filename)response.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
        // Bound retention even if a peer remains connected but stops consuming bytes.
        timer=setTimeout(()=>response.destroy(),imageSendTimeoutMs);timer.unref?.();
        send(200,lease.bytes,'image/jpeg');
      }catch(error){finish();throw error;}
    }
    try {
      const host = (request.headers.host || '').split(':')[0];
      if (!['localhost', '127.0.0.1'].includes(host)) throw new HttpError(403, '此本地服务仅接受 localhost 请求。');
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.setHeader('Allow', 'GET, HEAD');
        throw new HttpError(405, '不支持此请求方法。');
      }
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/api/health') return send(200, { ok: true, app: 'daily-picture-web', version: '1.5.0' });
      if (url.pathname === '/api/markets') return send(200, MARKETS);
      if (url.pathname === '/api/history') {
        response.setHeader('Cache-Control','no-store');
        if (url.searchParams.has('market') && url.searchParams.get('market') !== 'zh-CN') throw new HttpError(400,'历史浏览目前支持中国区。');
        return send(200, url.searchParams.has('month')
          ? await service.history.month(url.searchParams.get('month'),url.searchParams.get('refresh')==='1')
          : await service.history.catalog());
      }
      if (url.pathname === '/api/history/image') {
        const date=url.searchParams.get('date'),id=url.searchParams.get('id'),size=url.searchParams.get('size') || 'original';
        if(url.searchParams.get('direct')==='1'){
          const location=await service.history.remoteImage(date,id,size);
          if(location){response.writeHead(302,{'Location':location,'Cache-Control':'no-store'});response.end();return;}
        }
        return await sendImage(JSON.stringify(['history',date,id,size]),()=>service.history.image(date,id,size),
          'public, max-age=86400',url.searchParams.get('download')==='1'?`Bing_CN_${date}.jpg`:null);
      }
      if (url.pathname === '/api/archive') {
        const result = await service.archive(url.searchParams.get('market') || 'zh-CN', url.searchParams.get('refresh') === '1');
        response.setHeader('Cache-Control', 'no-store');
        return send(200, result);
      }
      if (url.pathname === '/api/image') {
        const id = url.searchParams.get('id');
        const size = url.searchParams.get('size') || '1920x1080';
        return await sendImage(JSON.stringify(['recent',id,size]),()=>service.image(id,size),
          'public, max-age=604800, immutable',url.searchParams.get('download')==='1'?`${id}_${size}.jpg`:null);
      }
      const file = files[url.pathname];
      if (!file) throw new HttpError(404, '没有找到这个页面。');
      response.setHeader('Cache-Control', 'no-cache');
      const bytes = await readFile(join(root, 'public', file[0]));
      const etag = `"${createHash('sha256').update(bytes).digest('hex')}"`;
      response.setHeader('ETag', etag);
      const validators = request.headers['if-none-match']?.split(',').map((value) => value.trim().replace(/^W\//, '')) || [];
      if (validators.includes('*') || validators.includes(etag)) { response.writeHead(304); response.end(); return; }
      return send(200, bytes, file[1]);
    } catch (error) {
      if (!response.headersSent && !response.destroyed) {
        response.setHeader('Cache-Control', 'no-store');
        if (error.status === 503) response.setHeader('Retry-After', '5');
        send(error.status || 500, { error: error.status ? error.message : '本地服务遇到问题，请重试。' });
      }
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.argv.slice(2).find((arg) => /^\d+$/.test(arg)) || process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const service = defaultService();
  const server = createApp({service});
  let collector;
  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(`Daily Picture is ready at ${url}`);
    if(process.env.HISTORY_COLLECTOR!=='off')collector = startSavedHistoryCollector(service);
    if (process.argv.includes('--open') && !process.argv.includes('--no-open')) {
      const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      const browser = spawn(command, [url], { stdio: 'ignore', windowsHide: true });
      browser.on('error', () => console.log(`Please open ${url} in your browser.`));
      browser.unref();
    }
  });
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用。请设置其他 PORT 后重试。` : error.message);
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { collector?.stop(); server.close(); server.closeAllConnections(); });
}
