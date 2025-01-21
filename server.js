const http = require("http");
const httpProxy = require("http-proxy");

// comfyuiあてリバースプロキシ作成
const comfyuiHost = process.env.COMFYUI_HOST || "localhost";
const comfyuiHostPort = process.env.COMFYUI_HOST_PORT || 8188;
const comfyuiProxy = httpProxy.createProxyServer({
  target: "http://" + host + ":" + hostPort,
});

// jupyterあてリバースプロキシ作成
const jupyterHost = process.env.JUPYTER_HOST || "localhost";
const jupyterHostPort = process.env.JUPYTER_HOST_PORT || 8888;
const jupyterProxy = httpProxy.createProxyServer({
  target: "http://" + jupyterHost + ":" + jupyterHostPort,
});

// ログ出力
console.log('Proxy Target:', proxy.options.target);

proxy.on('error', (err, req, res) => {
  console.error('Proxy error occurred:', err);
  res.writeHead(504);
  res.end('Gateway Timeout');
});
proxy.on('proxyReq', (proxyReq, req, res, options) => {
  console.log('Proxy Request Headers:', proxyReq.getHeaderNames());
});
proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log('Proxy Response Headers:', proxyRes.headers);
});

const server = http.createServer((req, res) => {
  if (req.url === '/healthcheck') {
    // ヘルスチェックのパス。すぐに 200 を返す
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('OK');
  }

  if (req.url === '/comfyui') {
    // それ以外はリバースプロキシへ
    comfyuiProxy.web(req, res, {}, (err) => {
      console.error("Proxy error:", err);
      res.writeHead(504);
      res.end("Gateway Timeout");
    });
  }
  else if (req.url === '/jupyter') {
  // それ以外はリバースプロキシへ
    jupyterProxy.web(req, res, {}, (err) => {
      console.error("Proxy error:", err);
      res.writeHead(504);
      res.end("Gateway Timeout");
    });
  }else{
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// WebSocketもサポート
server.on("upgrade", function (req, socket, head) {
  proxy.ws(req, socket, head, {}, (e) => {
    console.error("WebSocket proxy error:", e);
    socket.end();
  });
});

// ポートはAzureが割り当てる環境変数 PORT を使用
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Reverse proxy server listening on port ${port}`);
});
