// データベースの設定

'use strict';
const Sequelize = require('sequelize');
const sequelize = new Sequelize(
  'postgres://postgres:postgres@localhost/secret_board',
  {
    logging: false,
    operatorsAliases: false 
  });
const Post = sequelize.define('Post', {
  id: { // IDの設定
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  content: { // 投稿内容
    type: Sequelize.TEXT
  },
  postedBy: { // 投稿ユーザー名
    type: Sequelize.STRING
  },
  trackingCookie: { // トラッキング Cookie
    type: Sequelize.STRING
  }
}, {
  freezeTableName: true,
  timestamps: true // 自動的に createdAt と updatedAt 追加する設定
});

Post.sync();
module.exports = Post;