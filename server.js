const http = require("http");
const httpProxy = require("http-proxy");

// 環境変数
const comfyuiHost = process.env.COMFYUI_HOST || "localhost";
const comfyuiHostPort = process.env.COMFYUI_HOST_PORT || 8188;

const jupyterHost = process.env.JUPYTER_HOST || "localhost";
const jupyterHostPort = process.env.JUPYTER_HOST_PORT || 8888;

// 単一のプロキシインスタンス
const proxy = httpProxy.createProxyServer();

// ログやエラーハンドラ設定
proxy.on("error", (err, req, res) => {
  console.error("Proxy error occurred:", err);
  if (!res.headersSent) {
    res.writeHead(504);
  }
  res.end("Gateway Timeout");
});

proxy.on("proxyReq", (proxyReq, req, res, options) => {
  console.log("Proxy Request Headers:", proxyReq.getHeaderNames());
});

proxy.on("proxyRes", (proxyRes, req, res) => {
  console.log("Proxy Response Headers:", proxyRes.headers);
});

const server = http.createServer((req, res) => {
  if (req.url === "/healthcheck") {
    // ヘルスチェック
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("OK");
  }

  if (req.url === "/comfyui") {
    proxy.web(req, res, {
      target: `http://${comfyuiHost}:${comfyuiHostPort}`,
    });
  } else if (req.url === "/jupyter") {
    proxy.web(req, res, {
      target: `http://${jupyterHost}:${jupyterHostPort}`,
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

// WebSocketのupgradeイベントでも振り分ける
server.on("upgrade", function (req, socket, head) {
  if (req.url === "/comfyui") {
    proxy.ws(req, socket, head, {
      target: `http://${comfyuiHost}:${comfyuiHostPort}`,
    }, (err) => {
      console.error("WebSocket proxy error:", err);
      socket.end();
    });
  } else if (req.url === "/jupyter") {
    proxy.ws(req, socket, head, {
      target: `http://${jupyterHost}:${jupyterHostPort}`,
    }, (err) => {
      console.error("WebSocket proxy error:", err);
      socket.end();
    });
  } else {
    // 該当しないパスはcloseする
    socket.end();
  }
});

// ポートはAzureが割り当てる環境変数 PORT を使用
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Reverse proxy server listening on port ${port}`);
  console.log(
    `ComfyUI target: http://${comfyuiHost}:${comfyuiHostPort}, ` + 
    `Jupyter target: http://${jupyterHost}:${jupyterHostPort}`
  );
});
