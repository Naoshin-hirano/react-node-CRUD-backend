const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require('mysql');
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
app.use(cors());
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

    const sqlRegister = "INSERT INTO users (username, password) VALUES (?, ?)";
    db.query(sqlRegister, [username, password], (err, result) => {
        if(err) console.log(err);
    });
});

app.post("/api/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const sqlLogin = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(sqlLogin, [username, password], (err, result) => {
        if(err){
            res.send({ err: err });
        }
        // resultは配列で返ってくるのでlengthが必要
        if(result.length > 0){
            res.send(result);
        } else {
            res.send({ message: "usernameかpasswordが間違っています"});
        }
        
    });
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