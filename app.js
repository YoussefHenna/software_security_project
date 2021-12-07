const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
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
    res.render("pages/login");
  });

  app.get("/register", function (req, res) {
    res.render("pages/register");
  });

  app.get("/forgot_password", function (req, res) {
    res.render("pages/forgot_password");
  });

  app.get("/question_reset", async function (req, res) {
    const username = req.query.username;
    if (!username) {
      return res.status(400).send("Missing fields");
    }
    const existing = await db.collection("users").findOne({ username });
    if (!existing) {
      return res.status(400).send("User does not exist");
    }
    res.render("pages/question_reset", {
      question: existing.security_question,
      username,
    });
  });

  app.get("/home", async function (req, res) {
    const search = req.query.search;
    let shows;
    if (search) {
      db.collection("shows").createIndex({ name: "text" });
      shows = await db
        .collection("shows")
        .find({ $text: { $search: search } })
        .toArray();
    } else {
      shows = await db.collection("shows").find().toArray();
    }
    res.render("pages/home", {
      shows,
      search,
    });
  });

  app.get("/blog", async function (req, res) {
    const id = req.query.id;
    if (!id) {
      return res.status(400).send("Missing fields");
    }
    const result = await db.collection("shows").findOne({ _id: ObjectId(id) });
    if (!result) {
      return res.status(400).send("Show does not exist");
    }
    res.render("pages/blog", {
      show: result,
    });
  });

  app.post("/auth/login", async function (req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).send("Missing fields");
      }

      const existing = await db.collection("users").findOne({ username });
      if (!existing) {
        return res.status(400).send("User does not exist");
      }
      if (password === existing.password) {
        const token = jwt.sign(
          { id: existing._id, username },
          process.env.TOKEN_KEY,
          {
            expiresIn: "7d",
          }
        );
        const date = new Date();
        date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);

        res.cookie("token", token, { expires: date });
        res.redirect("/");
      } else {
        res.status(401).send("Incorrect password");
      }
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.post("/auth/register", async function (req, res) {
    try {
      const { username, password, security_question, security_answer } =
        req.body;

      if (!username || !password || !security_question || !security_answer) {
        return res.status(400).send("Missing fields");
      }

      const existing = await db.collection("users").findOne({ username });
      if (existing) {
        return res.status(409).send("User already exists");
      }
      const result = await db
        .collection("users")
        .insertOne({ username, password, security_question, security_answer });
      const token = jwt.sign(
        { id: result.insertedId, username },
        process.env.TOKEN_KEY,
        {
          expiresIn: "7d",
        }
      );
      const date = new Date();
      date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);

      res.cookie("token", token, { expires: date });
      res.redirect("/");
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.post("/auth/reset_password", async function (req, res) {
    try {
      const { username, password, security_answer } = req.body;

      if (!username || !password || !security_answer) {
        return res.status(400).send("Missing fields");
      }

      const existing = await db.collection("users").findOne({ username });
      if (!existing) {
        return res.status(400).send("User does not exist");
      }
      if (existing.security_answer === security_answer) {
        await db.collection("users").updateOne(
          {
            username,
          },
          { $set: { password } }
        );
        res.redirect("/login");
      } else {
        return res.status(401).send("Incorrect answer");
      }
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.post("/add_show", async function (req, res) {
    try {
      const { name, overview, poster_path } = req.body;

      if (!name || !overview || !poster_path) {
        return res.status(400).send("Missing fields");
      }
      await db.collection("shows").insertOne({ name, overview, poster_path });
      res.redirect("/home");
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.post("/add_comment", async function (req, res) {
    try {
      const { comment, show_id } = req.body;

      if (!comment || !show_id) {
        return res.status(400).send("Missing fields");
      }
      const result = await db
        .collection("shows")
        .findOne({ _id: ObjectId(show_id) });
      if (!result) {
        return res.status(400).send("Show not found");
      }
      jwt.verify(
        req.cookies.token,
        process.env.TOKEN_KEY,
        async function (err, decoded) {
          if (err) {
            return res.status(401).send("Not authenticated");
          } else {
            await db.collection("shows").updateOne(
              { _id: ObjectId(show_id) },
              {
                $push: { comments: { commenter: decoded.username, comment } },
              }
            );
            res.redirect("/blog?id=" + show_id);
          }
        }
      );
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.post("/sign_out", async function (req, res) {
    try {
      res.clearCookie("token");
      res.redirect("/");
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.listen(process.env.PORT);
});
