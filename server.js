const http = require("http");
const httpProxy = require("http-proxy");

// リバースプロキシ作成
const proxy = httpProxy.createProxyServer({ target: "http://myjupyter:8888" });
const server = http.createServer((req, res) => {
  proxy.web(req, res, {}, (e) => {
    console.error("Proxy error:", e);
    res.writeHead(502);
    res.end("Bad gateway");
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
