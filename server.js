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
    res.writeHead(504, { "Content-Type": "text/plain" });
  }
  res.end("Gateway Timeout");
});

// パスリライト用
proxy.on("proxyReq", (proxyReq, req, res, options) => {
  // /comfyui から始まるURLを ComfyUI のルートに変換する
  if (req.url.startsWith("/comfyui")) {
    // 例: /comfyui/abc → /abc
    proxyReq.path = req.url.replace(/^\/comfyui/, "") || "/";
  }
  // /jupyter から始まるURLを Jupyter のルートに変換する
  else if (req.url.startsWith("/jupyter")) {
    proxyReq.path = req.url.replace(/^\/jupyter/, "") || "/";
  }
});

const server = http.createServer((req, res) => {
  // ヘルスチェック
  if (req.url === "/healthcheck") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("OK");
  }

  // Jupyter: /jupyter だけ来たら、/jupyter/tree? へリダイレクト
  if (req.url === "/jupyter") {
    res.writeHead(302, { Location: "/jupyter/tree?" });
    return res.end();
  }
  // Jupyter: /jupyter/... の場合はすべて Jupyter へプロキシ
  else if (req.url.startsWith("/jupyter")) {
    proxy.web(req, res, {
      target: `http://${jupyterHost}:${jupyterHostPort}`,
    });
    return;
  }

  // ComfyUI: /comfyui だけ来た場合、ComfyUIのトップへ飛ばしたい
  if (req.url === "/comfyui") {
    // 例: /comfyui だけでアクセスされたら /comfyui/ にリダイレクト
    // ComfyUI が / でトップページを返すなら、リライト後に / でアクセスさせればOK
    res.writeHead(302, { Location: "/comfyui/" });
    return res.end();
  }
  // ComfyUI: /comfyui/... の場合はすべて ComfyUI へプロキシ
  else if (req.url.startsWith("/comfyui")) {
    proxy.web(req, res, {
      target: `http://${comfyuiHost}:${comfyuiHostPort}`,
    });
    return;
  }

  // それ以外は 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

// WebSocketのupgradeイベント
server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/comfyui")) {
    proxy.ws(req, socket, head, {
      target: `http://${comfyuiHost}:${comfyuiHostPort}`,
    }, (err) => {
      console.error("WebSocket proxy error:", err);
      socket.end();
    });
  } else if (req.url.startsWith("/jupyter")) {
    proxy.ws(req, socket, head, {
      target: `http://${jupyterHost}:${jupyterHostPort}`,
    }, (err) => {
      console.error("WebSocket proxy error:", err);
      socket.end();
    });
  } else {
    socket.end();
  }
});

// ポート設定
const port = process.env.PORT || 8080;
server.listen(port, "0.0.0.0", () => {
  console.log(`Reverse proxy server listening on port ${port}`);
  console.log(
    `ComfyUI target: http://${comfyuiHost}:${comfyuiHostPort}, ` +
    `Jupyter target: http://${jupyterHost}:${jupyterHostPort}`
  );
});
