const {
  validateEmail,
  validateRegularText,
  validateMongodbId,
} = require("./textValidator");
const { MongoClient, ObjectId } = require("mongodb");

module.exports = function pages(app, db, jwt, transporter, csrfProtection) {
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

  app.get("/login", csrfProtection, function (req, res) {
    res.render("pages/login", { csrf: req.csrfToken() });
  });

  app.get("/register", csrfProtection, function (req, res) {
    res.render("pages/register", { csrf: req.csrfToken() });
  });

  app.get("/forgot_password", csrfProtection, function (req, res) {
    res.render("pages/forgot_password", { csrf: req.csrfToken() });
  });

  app.get("/reset", csrfProtection, async function (req, res) {
    const email = req.query.email;
    if (!email) {
      return res.status(400).send("Missing fields");
    }

    if (!validateEmail(email)) {
      return res.status(400).send("Invalid email");
    }

    const existing = await db.collection("users").findOne({ email });
    if (!existing) {
      return res.status(400).send("User does not exist");
    }
    await generateAndSend2faCode(email);
    res.render("pages/reset", {
      email,
      csrf: req.csrfToken(),
    });
  });

  async function generateAndSend2faCode(email) {
    await db.collection("pins").deleteOne({ email });
    const pin = Math.floor(100000 + Math.random() * 900000);
    await db.collection("pins").insertOne({ email, pin });

    await transporter.sendMail({
      from: '"Show App" <show@noreply.com>',
      to: email,
      subject: "Reset your password",
      text: "Use this pin to reset your password " + pin,
    });

    setTimeout(() => {
      db.collection("pins").deleteOne({ email, pin });
    }, 1000 * 60 * 5);
  }

  app.get("/home", csrfProtection, async function (req, res) {
    const search = req.query.search;

    let shows;
    if (search) {
      if (!validateRegularText(search)) {
        return res.status(400).send("Invalid search");
      }
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
      csrf: req.csrfToken(),
    });
  });

  app.get("/blog", csrfProtection, async function (req, res) {
    const id = req.query.id;
    if (!validateMongodbId(id)) {
      return res.status(400).send("Invalid show id");
    }
    if (!id) {
      return res.status(400).send("Missing fields");
    }
    const result = await db.collection("shows").findOne({ _id: ObjectId(id) });
    if (!result) {
      return res.status(400).send("Show does not exist");
    }
    res.render("pages/blog", {
      show: result,
      csrf: req.csrfToken(),
    });
  });
};
