const http = require("http");
const httpProxy = require("http-proxy");

// リバースプロキシ作成
const host = process.env.HOST || "localhost";
const proxy = httpProxy.createProxyServer({
  target: "http://" + host + ":8888",
  // デバッグオプション
  // 例えば 'proxyReq', 'proxyRes' イベントでログを出すなど
});
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
  // それ以外はリバースプロキシへ
  proxy.web(req, res, {}, (err) => {
    console.error("Proxy error:", err);
    res.writeHead(504);
    res.end("Gateway Timeout");
  });
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
