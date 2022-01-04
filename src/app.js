const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const nodemailer = require("nodemailer");
const pages = require("./pages");
const auth = require("./auth");
const services = require("./services");
const helmet = require("helmet");
const csurf = require("csurf");
const path = require("path");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(cookieParser());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  })
);
//denies usage in iframes (Content Frame Options)
app.use(helmet.frameguard({ action: "deny" }));

app.use(function (req, res, next) {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; img-src https:; script-src 'self' https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js; style-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css; frame-src 'self'"
  );
  next();
});

const uri =
  "mongodb+srv://admin:YoNB2Tmx29DSz54jpgWOw@cluster0.ew2wn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.connect(async (err) => {
  const db = client.db("main");

  const csrfProtection = csurf({ cookie: true });
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PWD,
    },
  });

  pages(app, db, jwt, transporter, csrfProtection);
  auth(app, db, jwt, transporter, csrfProtection);
  services(app, db, jwt, csrfProtection);

  app.listen(process.env.PORT);
});
