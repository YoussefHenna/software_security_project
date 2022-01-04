const bcrypt = require("bcrypt");
const saltRounds = 10;
const {
  validateEmail,
  validatePassword,
  validatePin,
} = require("./textValidator");

module.exports = function auth(app, db, jwt, transporter, csrfProtection) {
  app.post("/auth/login", csrfProtection, async function (req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).send("Missing fields");
      }

      if (!validateEmail(email)) {
        return res.status(400).send("Invalid email");
      }

      if (!validatePassword(password)) {
        return res
          .status(400)
          .send(
            "Password must be at least 8 characters, contains upper and lowercase characters, at least one number, and one special character "
          );
      }

      const existing = await db.collection("users").findOne({ email });
      if (!existing) {
        return res.status(400).send("User does not exist");
      }
      const verified = bcrypt.compareSync(password, existing.password);
      if (verified) {
        const token = jwt.sign(
          { id: existing._id, email },
          process.env.TOKEN_KEY,
          {
            expiresIn: "7d",
          }
        );
        const date = new Date();
        date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);

        res.cookie("token", token, {
          expires: date,
          secure: true,
          httpOnly: true,
          sameSite: "lax",
        });
        res.redirect("/");
      } else {
        res.status(401).send("Incorrect password");
      }
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.post("/auth/register", csrfProtection, async function (req, res) {
    try {
      const { password, email } = req.body;

      if (!password || !email) {
        return res.status(400).send("Missing fields");
      }

      if (!validateEmail(email)) {
        return res.status(400).send("Invalid email");
      }

      if (!validatePassword(password)) {
        return res
          .status(400)
          .send(
            "Password must be at least 8 characters, contains upper and lowercase characters, at least one number, and one special character "
          );
      }

      const existing = await db.collection("users").findOne({ email });
      if (existing) {
        return res.status(409).send("User already exists");
      }
      await generateAndSend2faCode(email);

      res.render("pages/verify", {
        email,
        password,
        csrf: req.csrfToken(),
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

  app.post("/auth/verify", csrfProtection, async function (req, res) {
    try {
      const { password, email, code } = req.body;

      if (!password || !email || !code) {
        return res.status(400).send("Missing fields");
      }

      if (!validateEmail(email)) {
        return res.status(400).send("Invalid email");
      }

      if (!validatePassword(password)) {
        return res
          .status(400)
          .send(
            "Password must be at least 8 characters, contains upper and lowercase characters, at least one number, and one special character "
          );
      }

      if (!validatePin(code)) {
        return res.status(400).send("Invalid code");
      }

      const pinObj = await db.collection("pins").findOne({ email });
      if (pinObj.pin != code) {
        return res.status(401).send("Incorrect code");
      }
      await db.collection("pins").deleteOne({ email });

      const hashed = bcrypt.hashSync(password, saltRounds);

      const result = await db
        .collection("users")
        .insertOne({ password: hashed, email });
      const token = jwt.sign(
        { id: result.insertedId, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "7d",
        }
      );
      const date = new Date();
      date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);

      res.cookie("token", token, {
        expires: date,
        secure: true,
        httpOnly: true,
        sameSite: "lax",
      });
      res.redirect("/");
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.post("/auth/reset_password", csrfProtection, async function (req, res) {
    try {
      const { email, password, code } = req.body;

      if (!email || !password || !code) {
        return res.status(400).send("Missing fields");
      }

      if (!validateEmail(email)) {
        return res.status(400).send("Invalid email");
      }

      if (!validatePassword(password)) {
        return res
          .status(400)
          .send(
            "Password must be at least 8 characters, contains upper and lowercase characters, at least one number, and one special character "
          );
      }

      if (!validatePin(code)) {
        return res.status(400).send("Invalid code");
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
      const hashed = bcrypt.hashSync(password, saltRounds);

      await db.collection("users").updateOne(
        {
          email,
        },
        { $set: { password: hashed } }
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
