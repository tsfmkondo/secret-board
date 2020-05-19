// サーバーの起動
'use strict';

const http = require('http');
const auth = require('http-auth');
const router = require('./lib/router'); // require で読み込む際は、.js 可

const basic = auth.basic({
  realm: 'Enter username and password.',
  file: './users.htpasswd'
});

// ↓ createServer は関数を引数にとる関数、関数(関数)みたいな感じ
// ↓ createServer の返り値はオブジェクトなので、 server 変数に代入
const server = http.createServer(basic, (req, res) => {
  router.route(req, res); // router というモジュールの route 関数により、リクエストの振り分け処理をする設定
}).on('error', (e) => {
  console.error('Server Error', e);
}).on('clientError', (e) => {
  console.error('ClientError', e);
});

const port = 8000;
server.listen(port, () => {
  console.info(`Listening on ${port}`);
});