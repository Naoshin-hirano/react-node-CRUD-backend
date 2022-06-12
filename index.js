const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require('mysql');

const cookieParser = require('cookie-parser');
// サイトにアクセスするとサーバー側でuser情報を記憶する
const session = require('express-session');

const bcrypt = require("bcrypt");
const saltRounds = 10;

const jwt = require('jsonwebtoken');

const app = express();

// データベース接続情報
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Naoyakun1!',
    database: 'crud'
  });
// 「Cross-origin resource sharing」の略.
// clientとserverで異なるorigin（URLのProtocol、Host、Port Numberの3つを合わせたもの）を共有すること
// オブジェクトはsessionとcookie使うのに必要な情報
app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(cookieParser());
// req.session = cockieのこと
app.use(session({
    // cookie内のssession.idのkeyの呼び名
    key: "userId",
    // 指定した文字列を使ってクッキーIDを暗号化しクッキーIDが書き換えらているかを判断
    secret: "subscribe",
    // セッションにアクセスすると上書きされる
    resave: false,
    // 未初期化状態のセッションも保存するようなオプション
    saveUninitialized: false,
    // cookieの有効期限が24h
    cookie: {
        expires: 60 * 60 * 24,
    }
}));
// クライアントから送信されたデータを、 req.body 経由で会得、操作できる。Body-Parser を基にExpressに組み込まれた機能、
app.use(express.json());
// Content-Type が application/x-www-form-urlencoded である POST リクエストのボディ部を解析し、 リクエストオブジェクトの body プロパティにフォームデータの内容を表すオブジェクトをセット
app.use(bodyParser.urlencoded({extended: true}));

app.get("/api/get", (req, res)=> {
    const sqlSelect = "SELECT * FROM movie_reviews";
    db.query(sqlSelect, (err, results) => {
        // sendでフロントへ送り返す
        res.send(results);
    });
});
  
app.post("/api/insert", (req, res) => {
    // clientからpostでリクエストされたパラメータをbodyで受け取る
    const movieName = req.body.movieName;
    const movieReview = req.body.movieReview;

    const sqlInsert = "INSERT INTO movie_reviews (movieName, movieReview) VALUES (?, ?)";
    db.query(sqlInsert, [movieName, movieReview], (err, results)=> {
        console.log(results);
    })
});

app.post("/api/register", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    // passwordをhash化してDBへ挿入
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.log(err)
        }
        const sqlRegister = "INSERT INTO users (username, password) VALUES (?, ?)";
        db.query(sqlRegister, [username, hash], (err, result) => {
            if(err) console.log(err);
        });
    })
});

// jwtミドルウェア
const veryfyJWT = (req, res, next) => {
    // api/isUserAuth リクエストのheaders[x-access-token]にtokenが保存されているか
    const token = req.headers["x-access-token"]

    if(!token){
        res.send("トークンが必要ですので付与してください");
    } else {
        // tokenをシークレットキー(jwtSecret)で文字列に復号
        jwt.verify(token, "jwtSecret", (err, decoded) => {
            if(err){
                res.json({auth: false, message: "認証に失敗しました"});
            } else {
                req.userId = decoded.id;
                next();
            }
        });
    }
};

// Userが認証されているかの確認
app.get("/api/isUserAuth", veryfyJWT, (req, res) => {
    res.send("あなたは認証されてます");
});

app.post("/api/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // ここでpassword = ? にすると、hash化されてないpasswordとhash化済みのpassword比べるのでエラーになる
    const sqlLogin = "SELECT * FROM users WHERE username = ?";
    db.query(sqlLogin, [username], (err, result) => {
        if(err){
            res.send({ err: err });
        }
        // resultは配列で返ってくるのでlengthが必要
        if(result.length > 0){
            const hash = result[0].password;

            bcrypt.compare(password, hash , (err, isEqual) => {
                if(isEqual){
                    const id = result[0].id
                    // jwt: token発行
                    // 第2引数: 秘密鍵 → tokenをjsonに復号するため
                    // 第３引数: オブション
                    const token = jwt.sign({id}, "jwtSecret", {
                        expiresIn: 300
                    });
                    // サーバーのuser情報をreq.session(cookie)へ送信する
                    // フロント側のcookie内とサーバー側のsession内に同じuser情報が存在する状態になる
                    req.session.user = result;
                    // json形式にしてフロントへ送信
                    res.json({auth: true, token: token, result: result});
                } else {
                    res.json({auth: false, message: "usernameかpasswordが間違っています"});
                }
            })
        } else {
            res.json({ auth: false, message: "ユーザーが存在しません" });
        }
        
    });
});

app.get("/api/login", (req, res) => {
    // req.session(cookie)にuser情報があれば、「ログイン中=true」のステータスとcookie内にあるユーザー情報をフロントへ返す
    if(req.session.user){
        res.send({ loggedIn: true, user: req.session.user });
    } else {
        res.send({ loggedIn: false});
    }
});

app.put("/api/update", (req, res) => {
    const name = req.body.movieName;
    const review = req.body.movieReview;

    const sqlUpdate = "UPDATE movie_reviews SET movieReview = ? WHERE movieName = ?";
    db.query(sqlUpdate, [review, name], (err, results) => {
        if(err) console.log(err);
    })
});

app.delete("/api/delete/:movieName", (req, res) => {
    const movieName = req.params.movieName;

    const sqlDelete = "DELETE FROM movie_reviews WHERE movieName = ?";
    db.query(sqlDelete, [movieName], (err, results) => {
       if(err) console.log(err);
    });
});

app.listen(3001, ()=> {
    console.log("running on port 3001");
});