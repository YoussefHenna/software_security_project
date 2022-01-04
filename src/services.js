module.exports = function services(app, db) {
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
