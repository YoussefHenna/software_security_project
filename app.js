const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const { json } = require("express");
require("dotenv").config();

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  })
);

const uri =
  "mongodb+srv://admin:YoNB2Tmx29DSz54jpgWOw@cluster0.ew2wn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.connect((err) => {
  const db = client.db("main");

  app.get("/", function (req, res) {
    jwt.verify(
      req.cookies.token,
      process.env.TOKEN_KEY,
      function (err, decoded) {
        if (err) {
          res.redirect("/login");
        } else {
          res.redirect("/home");
        }
      }
    );
  });

  app.get("/login", function (req, res) {
    res.render("pages/login", { title: "Hello there" });
  });

  app.get("/register", function (req, res) {
    res.render("pages/register", { title: "Hello there" });
  });

  app.post("/auth/login", async function (req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).send("Missing fields");
      }

      const existing = await db.collection("users").findOne({ username });
      if (!existing) {
        return res.status(400).send("User does not exist");
      }
      if (password == existing.password) {
        const token = jwt.sign({ id: existing._id }, process.env.TOKEN_KEY, {
          expiresIn: "7d",
        });
        const date = new Date();
        date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);

        res.cookie("token", token, { expires: date });
        res.redirect("/");
      } else {
        res.status(401);
      }
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.post("/auth/register", async function (req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).send("Missing fields");
      }

      const existing = await db.collection("users").findOne({ username });
      if (existing) {
        return res.status(409).send("User already exists");
      }
      const result = await db
        .collection("users")
        .insertOne({ username, password });
      const token = jwt.sign({ id: result.insertedId }, process.env.TOKEN_KEY, {
        expiresIn: "7d",
      });
      const date = new Date();
      date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);

      res.cookie("token", token, { expires: date });
      res.redirect("/");
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.listen(process.env.PORT);
  console.log("Server is listening  http://localhost:" + process.env.PORT);
});
