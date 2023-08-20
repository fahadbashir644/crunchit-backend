const express = require("express");
const { json } = require("express");
const app = express();
const cors = require("cors");
const { connect } = require("mongoose");
const { Types } = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const User = require("./Models/User");
const path = require('path');
const crypto = require("crypto");


// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname,'public/build')));

// Handle all other requests by serving the frontend's index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + "public/index.html"));
  });


//db connection
const connection_url =
  "mongodb+srv://fahadbashir1:c*fkn$*Yp$j!8Fr@cluster0.agg7z74.mongodb.net/Crunchit-db?retryWrites=true&w=majority";
connect(connection_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connected to Database");
  })
  .catch((error) => {
    console.log("Cannot connect to DB : ", error);
  });


// middlewares
app.use(cors());
app.use(json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    key: "userId",
    secret: "subscribe",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 60 * 5,
    },
  })
);

// Endpoints

app.post("/login", (req, res) => {
    User.findOne({
      email: req.body.data.email,
    }).then((userExist) => {
      if (userExist) {
        const token = jwt.sign({ userId: userExist._id }, "jwtToken", {
          expiresIn: "1h",
        });
        res.status(200).send({ userExist, token });
      } else {
        res.status(400).send("User does not exist");
      }
    });
});

app.post("/signup", (req, res) => {
    User.findOne({
        email: req.body.data.email,
    }).then((userExist) => {
        if (userExist) {
          res.status(402).send("Email already exists");
        } else {
            const user = new User({
                _id: new Types.ObjectId(),
                email: req.body.data.email,
                password: req.body.data.password,
            });
            console.log(user)
            user.save()
            .then((result) => {
                res.status(200).send(result);
            })
            .catch((saveError) => {
              console.error("Error saving user:", saveError);
              res.status(400).send("Error saving user");
            });    
        }
    }).catch((error) => {
      console.error('err2', error);
        res.status(400).send(error);
    });;
});

app.post("/ipn", (req, res) => {
  const hmac = crypto.createHmac("sha512", "5hOWEbra7oU79ejwSpcLcEvq5cYHIC7E");
  hmac.update(JSON.stringify(req.body, Object.keys(req.body).sort()));
  const signature = hmac.digest("hex");
  if (
    req.body.payment_status === "finished" &&
    signature === req.headers["x-nowpayments-sig"]
  ) {
    User.findOne({
      email: req.body.data.email,
    }).then((res2) => {
      if (res2) {
        User.findOneAndUpdate(
          { email: req.body.data.email },
          { balance: Number(req.body.data.balance) + Number(res2.balance) }
        ).then((result) => {
          console.log("updated");
        });
      }
    });
  }
  res.json({ status: 200 });
});

const PORT = 8000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));