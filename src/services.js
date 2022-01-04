const {
  validateRegularText,
  validateImageUrl,
  validateMongodbId,
} = require("./textValidator");
const { MongoClient, ObjectId } = require("mongodb");

module.exports = function services(app, db, jwt, csrfProtection) {
  app.post("/add_show", csrfProtection, async function (req, res) {
    try {
      const { name, overview, poster_path } = req.body;

      if (!name || !overview || !poster_path) {
        return res.status(400).send("Missing fields");
      }

      if (!validateRegularText(name) || !validateRegularText(overview)) {
        return res.status(400).send("Invalid name or overview");
      }

      if (!validateImageUrl(poster_path)) {
        return res.status(400).send("Invalid image url");
      }
      await db.collection("shows").insertOne({ name, overview, poster_path });
      res.redirect("/home");
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  });

  app.post("/add_comment", csrfProtection, async function (req, res) {
    try {
      const { comment, show_id } = req.body;

      if (!validateRegularText(comment)) {
        return res.status(400).send("Invalid comment");
      }

      if (!validateMongodbId(show_id)) {
        return res.status(400).send("Invalid show id");
      }

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
                $push: { comments: { commenter: decoded.email, comment } },
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
};
