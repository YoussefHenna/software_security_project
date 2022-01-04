function validateEmail(email) {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
}

module.exports = function auth(app, db, jwt, transporter) {
  app.post("/auth/login", async function (req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).send("Missing fields");
      }

      const existing = await db.collection("users").findOne({ email });
      if (!existing) {
        return res.status(400).send("User does not exist");
      }
      if (password === existing.password) {
        const token = jwt.sign(
          { id: existing._id, email },
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
      const { password, email } = req.body;

      if (!password || !email) {
        return res.status(400).send("Missing fields");
      }

      if (!validateEmail(email)) {
        return res.status(400).send("Invalid email");
      }

      const existing = await db.collection("users").findOne({ email });
      if (existing) {
        return res.status(409).send("User already exists");
      }
      await generateAndSend2faCode(email);

      res.render("pages/verify", {
        email,
        password,
      });
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  async function generateAndSend2faCode(email) {
    await db.collection("pins").deleteOne({ email });
    const pin = Math.floor(100000 + Math.random() * 900000);
    await db.collection("pins").insertOne({ email, pin });

    await transporter.sendMail({
      from: '"Show App" <show@noreply.com>',
      to: email,
      subject: "Verify your account",
      text: "Use this pin to verify your account " + pin,
    });

    setTimeout(() => {
      db.collection("pins").deleteOne({ email, pin });
    }, 1000 * 60 * 5);
  }

  app.post("/auth/verify", async function (req, res) {
    try {
      const { password, email, code } = req.body;

      if (!password || !email || !code) {
        return res.status(400).send("Missing fields");
      }

      const pinObj = await db.collection("pins").findOne({ email });
      if (pinObj.pin != code) {
        return res.status(401).send("Incorrect code");
      }
      await db.collection("pins").deleteOne({ email });

      const result = await db
        .collection("users")
        .insertOne({ password, email });
      const token = jwt.sign(
        { id: result.insertedId, email },
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
      const { email, password, code } = req.body;

      if (!email || !password || !code) {
        return res.status(400).send("Missing fields");
      }

      const pinObj = await db.collection("pins").findOne({ email });
      if (pinObj.pin != code) {
        return res.status(401).send("Incorrect code");
      }
      await db.collection("pins").deleteOne({ email });

      const existing = await db.collection("users").findOne({ email });
      if (!existing) {
        return res.status(400).send("User does not exist");
      }
      await db.collection("users").updateOne(
        {
          email,
        },
        { $set: { password } }
      );
      res.redirect("/login");
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
};
