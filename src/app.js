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

client.connect(async (err) => {
  const db = client.db("main");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PWD,
    },
  });

  pages(app, db, jwt, transporter);
  auth(app, db, jwt, transporter);
  services(app, db);

  app.listen(process.env.PORT);
});
