const http = require("http");
const httpProxy = require("http-proxy");

// リバースプロキシ作成
const proxy = httpProxy.createProxyServer({
  target: "http://comfyui:8888",
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
