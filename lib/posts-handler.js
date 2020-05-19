// /posts アクセス時、メソッドによって処理を振り分ける実装
'use strict';

const crypto = require('crypto'); // 暗号化のモジュール
const pug = require('pug');
const Cookies = require('cookies');
const util = require('./handler-util');
const Post = require('./post');
const moment = require('moment-timezone');

const trackingIdKey = 'tracking_id'; // Key 名が変わることを想定して定数定義する

const oneTimeTokenMap = new Map(); // キーをユーザー名、値をトークンとする連想配列

function handle(req, res) {
  const cookies = new Cookies(req, res); // cookie 用のオブジェクト作成
  const trackingId = addTrackingCookie(cookies, req.user);
  switch (req.method) {
    case 'GET': // 閲覧
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      Post.findAll({order:[['id', 'DESC']]}).then((posts) => {
        posts.forEach((post) => {
          post.content = post.content.replace(/\+/g, ' ');
          post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
        });
        // 閲覧した時にワンタイムパスワードを発行
        const oneTimeToken = crypto.randomBytes(8).toString('hex');
        oneTimeTokenMap.set(req.user, oneTimeToken);
        res.end(pug.renderFile('./views/posts.pug', {
          posts: posts,
          user: req.user,
          oneTimeToken: oneTimeToken
        }));
        console.info(
          `[閲覧されました]: ` +
          `Time: ${new Date()}, ` +
          `user: ${req.user}, ` +
          `trackingId: ${trackingId}, ` +
          `remoteAddress: ${req.connection.remoteAddress}, ` +
          `user-agent: ${req.headers['user-agent']}`
        );
      });
      break;
    case 'POST': // 投稿
      let body = '';
      req.on('data', (chunk) => {
        body = body + chunk;
      }).on('end', () => { // データを送り終わった場合の処理
        const decoded = decodeURIComponent(body); // body の中身は pug の投稿で作成
        const dataArray = decoded.split('&'); // decodedの中身「content=投稿内容&oneTimeToken=トークン本体」を & で分割
        const content = dataArray[0] ? dataArray[0].split('content=')[1] : '';
        const requestedOneTimeToken = dataArray[1] ? dataArray[1].split('oneTimeToken=')[1] : '';
        // ワンタイムパスワードの照合　閲覧したことがないと投稿できない
        if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
          console.info('[投稿されました]: ' + content);
          Post.create({
            content: content,
            trackingCookie: trackingId,
            postedBy: req.user
          }).then(() => {
            oneTimeTokenMap.delete(req.user);
            handleRedirectPosts(req, res);
          });
        } else {
          util.handleBadRequest(req, res);
        }
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

// 削除の実装
function handleDelete(req, res) {
  switch (req.method) {
    case 'POST':
      let body = '';
      req.on('data', (chunk) => {
        body = body + chunk;
      }).on('end', () => { // データを送り終わった場合の処理
        const decoded = decodeURIComponent(body);
        const dataArray = decoded.split('&'); // decodedの中身「id=投稿ID&oneTimeToken=トークン本体」を & で分割
        const id = dataArray[0] ? dataArray[0].split('id=')[1] : '';
        const requestedOneTimeToken = dataArray[1] ? dataArray[1].split('oneTimeToken=')[1] : '';
        // ワンタイムパスワードの照合　閲覧したことがないと投稿できない
        if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
        // sequelize における削除の実装方法
          Post.findById(id).then((post) => {
            if (req.user === post.postedBy || req.user === 'admin') { // リクエストユーザと投稿者が同じかどうかを再度確認
              post.destroy().then(() => {
                console.info(
                  `[削除されました]: user: ${req.user}, ` +
                  `remoteAddress: ${req.connection.remoteAddress}, ` +
                 `user-agent: ${req.headers['user-agent']} `
                );
               oneTimeTokenMap.delete(req.user);
               handleRedirectPosts(req, res);
              });
            }
          });
        } else {
            util.handleBadRequest(req, res);
        }
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

// cookie の付与
/**
* Cookieに含まれているトラッキングIDに異常がなければその値を返し、
* 存在しない場合や異常なものである場合には、再度作成しCookieに付与してその値を返す
* @param {Cookies} cookies
* @param {String} userName
* @return {String} トラッキングID
*/
function addTrackingCookie(cookies, userName) {
  const requestedTrackingId =cookies.get(trackingIdKey);
  if (isValidTrackingId(requestedTrackingId, userName)) {
    return requestedTrackingId;
  } else {
    const originalId = parseInt(crypto.randomBytes(8).toString('hex'), 16);
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    const trackingId = originalId + '_' + createValidHash(originalId, userName);
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    return trackingId;
  }
}

// TrackingId と RequestedTrackingId の照合
function isValidTrackingId(trackingId, userName) {
  if (!trackingId) {
    return false;
  }
  const splitted = trackingId.split('_');
  const originalId = splitted[0];
  const requestedHash = splitted[1];
  return createValidHash(originalId, userName) === requestedHash;
}

// 秘密鍵
const secretKey =
`75221fcee23b3b84e78b2358cf89d37323cc03cb670b1ef005cf3d921916
4e9f2697df6fe569d8eb94993137bdb7fef8ca956a9ed5c05675aab490013
3b3a35b81a909d274714012c04627c99fa5f7d7d8c6ec244875abebba8c0b
e7a2a2e2610940463efa9bb92b555f6ae2b6b3edc4c0bd8a7e4834039cf11
f5018cb166715add1354a2bf04dcf7a73f00ce078ccfb8d01ec29abf19a4d
e5316230c7d3f468d38baf0c19346708591d69a4f59e23f1b694780811fed
7a69d21994ba585f218357b29d6f38fa7fc115ef345a7a41c3d53f4237096
b76e278693de0bc0a8c098278b4bb75f28eba87eea3b2768c023db3eac0ec
08abd4fdbb9635cc666f735a0`;

// ハッシュ化処理
function createValidHash(originalId, userName) {
  const sha1sum = crypto.createHash('sha1'); // SHA-1 というアルゴリズムでハッシュ化
  sha1sum.update(originalId + userName + secretKey); // ここではメモリだけの状態
  return sha1sum.digest('hex'); // 16進数の文字列データとして返す
}

// 投稿後のリダイレクト
function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
};

module.exports = {
  handle,
  handleDelete
};