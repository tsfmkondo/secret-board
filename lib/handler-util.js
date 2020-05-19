// /posts以外の処理
'use strict';

const fs = require('fs');

// ログアウトの実装
function handleLogout(req, res) {
  res.writeHead(401, {
    'Content-Type': 'text/html; charset=utf-8'
  });
  res.end(`<!DOCTYPE html><html lang="ja"><body>
          <h1>ログアウトしました</h1>
          <a href="/posts">ログイン</a>
          </body></html>`
  );
}

// Not Found の実装 （遊んでみてもいいかも）
function handleNotFound(req, res) {
  res.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end('ページが見つかりません');
}

// Bad Request の実装
function handleBadRequest(req, res) {
  res.writeHead(400, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end('未対応のリクエストです');
}

// ファビコン表示の実装
function handleFavicon(req, res) {
  res.writeHead(200, {
    'Content-Type': 'image/vnd.microsoft.icon' // ブラウザがファビコンを待ち受ける状態にする
  });
  const favicon = fs.readFileSync('./favicon.ico');
  res.end(favicon);
}

module.exports = {
  handleLogout,
  handleNotFound,
  handleBadRequest,
  handleFavicon
};