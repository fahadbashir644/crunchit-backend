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
const axios = require('axios');
const http = require('http').Server(app);
const Message = require("./Models/Message");
const Subscription = require("./Models/Subscription");
const hourlyRate = require("./Models/hourlyRate");
const Service = require("./Models/Service");
const Transaction = require("./Models/Transaction");
const bcrypt = require("bcrypt");
const saltrounds = 2;

const socketIO = require('socket.io')(http, {
  cors: {
    origin: "http://137.184.81.218"
  }
});

socketIO.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  socket.on('message', (data) => {
    const { sender, receiver, text } = data;
    const newMessage = new Message({ sender, receiver, text });
    newMessage.save();
    socketIO.emit('privateMessage', data);
  });

  socket.on('disconnect', () => {
    console.log('🔥: A user disconnected');
  });
});

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
  }).then((user) => {
    if (user) {
      bcrypt.compare(req.body.data.password, user.password, (err, response) => {
        if (response) {
          const token = jwt.sign({ userId: user._id }, "jwtToken", {
            expiresIn: "1h",
          });
          res.status(200).send({ user, token });
        } else {
          res.status(400).send("Incorrect email or password");
        }
      })
    } else {
      res.status(404).send("User does not exist");
    }
  });
});

function getCurrentDate() {
const currentDate = new Date();

const day = currentDate.getDate().toString().padStart(2, '0');
const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
const year = currentDate.getFullYear();

const formattedDate = `${day}/${month}/${year}`;
return formattedDate;
}

app.post("/signup", (req, res) => {
  User.findOne({
      email: req.body.data.email,
  }).then((userExist) => {
      if (userExist) {
        res.status(400).send("Email already exists");
      } else {
        bcrypt.hash(req.body.data.password, saltrounds, (err, hash) => {
          if (err) {
            console.error('err2', err);
            res.status(400).send(err);
          } else {
            const user = new User({
              _id: new Types.ObjectId(),
              email: req.body.data.email,
              name: req.body.data.name,
              password: hash,
              isVa: req.body.data.isVa,
              balance: 0
            });
            user.save()
            .then((result) => {
                res.status(200).send(result);
            })
            .catch((saveError) => {
              console.error("Error saving user:", saveError);
              res.status(400).send("Error saving user");
            });    
          }
        });
      }
  }).catch((error) => {
    console.error('err2', error);
    res.status(400).send(error);
  });
});

app.post("/ipn", (req, res) => {
const hmac = crypto.createHmac("sha512", "5hOWEbra7oU79ejwSpcLcEvq5cYHIC7E");
hmac.update(JSON.stringify(req.body, Object.keys(req.body).sort()));
const signature = hmac.digest("hex");
if (
  req.body.payment_status === "finished" &&
  signature === req.headers["x-nowpayments-sig"]
) {
  let email = req.body.order_description;
  User.findOne({
    email: email,
  }).then((res2) => {
    if (res2) {
      User.findOneAndUpdate(
        { email: email },
        { balance: Number(req.body.payment_amount) + Number(res2.balance) }
      ).then((result) => {
        const transaction = new Transaction({
          _id: new Types.ObjectId(),
          user: email,
          type: 'Topup',
          balanceBefore: Number(res2.balance),
          balanceAfter: Number(req.body.payment_amount) + Number(res2.balance),
          status: 'Complete',
          date: getCurrentDate(),
          totalAmount: Number(req.body.payment_amount)
        });
        transaction.save()
        .then((result) => {
          const data = {
            email: email,
            balance: Number(req.body.payment_amount) + Number(res2.balance)
          };
          socketIO.emit('updateBalance', data);
          res.status(200).send();
        })
        .catch((saveError) => {
          console.error("Error saving transaction:", saveError);
          res.status(400).send("Error saving transaction");
        });  
      })
    }
  });
}
});

app.post("/testipn", (req, res) => {
  let email = req.body.order_description;
  console.log(req.body);
  console.log(email);
  User.findOne({
    email: email,
  }).then((res2) => {
    console.log('res2', res2);
    if (res2) {
      User.findOneAndUpdate(
        { email: email },
        { balance: Number(req.body.payment_amount) + Number(res2.balance) }
      ).then((result) => {
        console.log('result');
        const transaction = new Transaction({
          _id: new Types.ObjectId(),
          user: email,
          type: 'Topup',
          balanceBefore: Number(res2.balance),
          balanceAfter: Number(req.body.payment_amount) + Number(res2.balance),
          status: 'Complete',
          date: getCurrentDate(),
          totalAmount: Number(req.body.payment_amount)
        });
        transaction.save()
        .then((result2) => {
          console.log('result2');
          const data = {
            email: email,
            balance: Number(req.body.payment_amount) + Number(res2.balance)
          };
          console.log('testipn', data);
          socketIO.emit('updateBalance', data);
          res.status(200).send();
        })
        .catch((saveError) => {
          console.error("Error saving transaction:", saveError);
          res.status(400).send("Error saving transaction");
        });  
      }).catch((saveError) => {
        console.error("Error saving user:", saveError);
        res.status(400).send("Error saving user");
      });  
    }
  }).catch((saveError) => {
    console.error("User not found:", saveError);
    res.status(400).send("User not found");
  });  
});

app.post('/topup', async (req, res) => {
try {
  var config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.nowpayments.io/v1/invoice',
    headers: { 
      'x-api-key': 'WNY90XC-2094328-H02FN1E-2FH1DY4', 
      'Content-Type': 'application/json'
    },
    data : req.body.data
  };
  const response = await axios(config);
  res.json(response.data);
} catch(error) {
  console.error(error);
  res.status(500).send('An error occurred.');
}

});

app.post("/getbalance", (req, res) => {
User.findOne({
  email: req.body.email,
}).then((res2) => {
  if (res2) {
    res.send({ balance: res2.balance });
  }
});
});

app.post("/getAvailability", (req, res) => {
User.findOne({
  email: req.body.email,
}).then((res2) => {
  if (res2) {
    res.send({ available: res2.available });
  }
});
});

app.post("/addService", (req, res) => {
Service.findOne({
  name: req.body.service,
}).then((service) => {
  if (service) {
    res.status(400).send("Service Already Exists.");
  } else {
    const service = new Service({
      _id: new Types.ObjectId(),
      name: req.body.service,
      rate: req.body.rate
    });
    service.save()
    .then((result) => {
        res.status(200).send(result);
    })
  }
});
});

app.post("/removeService", (req, res) => {
Service.deleteOne({
  name: req.body.service,
}).then((res2) => {
  if (res2) {
    res.status(200).send();
  }
});
});

app.get("/getAllServices", (req, res) => {
Service.find({}).then((res2) => {
  if (res2) {
    res.send({ services: res2 });
  }
});
});

app.post("/changeAvailability", (req, res) => {
User.findOne({
  email: req.body.email
}).then((res2) => {
  if (res2) {
    User.findOneAndUpdate(
      { email: req.body.email },
      { available: req.body.available }
    ).then((result) => {
      res.status(200).send();
    }).catch((error) => {
        res.status(400).send(error);
    });
  }
});
});

app.post("/changePassword", (req, res) => {
User.findOne({
  email: req.body.email
}).then((res2) => {
  if (res2) {
    bcrypt.hash(req.body.password, saltrounds, (err, hash) => {
      if (err) {
        console.error('err2', err);
        res.status(400).send(err);
      } else {
        User.findOneAndUpdate(
          { email: req.body.email },
          { password: hash }
        ).then((result) => {
          res.status(200).send();
        }).catch((error) => {
            res.status(400).send(error);
        });   
      }
    });
  }
});
});

app.post("/completeProject", (req, res) => {
Subscription.findOneAndUpdate(
  { _id: req.body._id },
  { projectStatus: 'complete' }
).then((result) => {
  let balance = Number(req.body.balance);
  let projectFee = Number(req.body.vaRate) * Number(req.body.workingHours);
  balance += projectFee;
  User.findOneAndUpdate(
    { email: req.body.va },
    { balance:  balance}
  ).then((result) => {
    Subscription.find({
      client: req.body.email,
      projectStatus: 'inprogress'
    }).then((res2) => {
      if (res2) {
        res.send({ subscriptions: res2 });
      }
    });
  }).catch((error) => {
      res.status(400).send(error);
  });
}).catch((error) => {
    res.status(400).send(error);
});
});

app.post("/setRateOfVa", (req, res) => {
User.findOne({
  _id: req.body.va
}).then((res2) => {
  if (res2) {
    User.findOneAndUpdate(
      { _id: req.body.va },
      { vaRate: Number(req.body.vaRate) }
    ).then((result) => {
      res.status(200).send();
    }).catch((error) => {
        res.status(400).send(error);
    });
  }
});
});

app.post("/setServiceRate", (req, res) => {
Service.findOne({
  _id: req.body.service
}).then((res2) => {
  if (res2) {
    Service.findOneAndUpdate(
      { _id: req.body.service },
      { rate: Number(req.body.rate) }
    ).then((result) => {
      res.status(200).send();
    }).catch((error) => {
        res.status(400).send(error);
    });
  }
});
});

app.post("/getSubscriptionsOfUser", (req, res) => {
Subscription.find({
  client: req.body.email,
  projectStatus: 'inprogress'
}).then((res2) => {
  if (res2) {
    res.send({ subscriptions: res2 });
  }
});
});

app.post("/getPendingRequests", (req, res) => {
  Subscription.find({
    client: req.body.email,
    projectStatus: 'pending'
  }).then((res2) => {
    if (res2) {
      res.send({ subscriptions: res2 });
    }
  });
}); 

app.post("/getSubscriptionsOfVa", (req, res) => {
Subscription.find({
  va: req.body.email
}).then((res2) => {
  if (res2) {
    res.send({ subscriptions: res2 });
  }
});
});

app.post("/getTransactions", (req, res) => {
Transaction.find({
  user: req.body.email
}).then((res2) => {
  if (res2) {
    res.send({ transactions: res2 });
  }
});
});

app.get("/getHourlyRate", (req, res) => {
hourlyRate.find({}).then((res2) => {
  if (res2) {
    res.send({ hourlyRate: res2[0]?.hourlyRate });
  }
});
});

app.post("/setHourlyRate", (req, res) => {
hourlyRate.find({}).then((res2) => {
  if (res2) {
    hourlyRate.findOneAndUpdate(
      { _id: res2[0]?._id },
      { hourlyRate: req.body.hourlyRate }
    ).then((result) => {
      res.status(200).send();
    }).catch((error) => {
        res.status(400).send(error);
    });
  }
});
});

app.post("/handleSubscription", (req, res) => {
Subscription.findOne({
  _id: req.body.subscriptionId
}).then((res2) => {
  if (res2) {
    Subscription.findOneAndUpdate(
      { _id: req.body.subscriptionId },
      { va: req.body.va,
        projectStatus: 'inprogress',
        vaStatus: 'assigned' },
    ).then((result) => {
      res.status(200).send();
    }).catch((error) => {
        res.status(400).send(error);
    });
  }
});
});

app.post("/getRelatedUsers", (req, res) => {
Subscription.find({
  va: req.body.va,
  projectStatus: 'inprogress'
}).then((subs) => {
  if (subs) {
    let relatedUsers = subs.map(sub => sub['client']);
    User.find({ email: { $in: relatedUsers } }).then((users) => {
      if (users) {
        res.send({ users: users });
      } else {
        res.send({ users: [] });
      }
    });
  }
});
});

app.post("/getRelatedVas", (req, res) => {
Subscription.find({
  client: req.body.client,
  projectStatus: 'inprogress'
}).then((subs) => {
  if (subs) {
    let relatedVas = subs.map(sub => sub['va']);
    User.find({ email: { $in: relatedVas } }).then((users) => {
      if (users) {
        res.send({ users: users });
      } else {
        res.send({ users: [] });
      }
    });
  }
})
});

app.get("/getActiveSubscriptions", (req, res) => {
Subscription.find({
  projectStatus: 'inprogress',
}).then((res2) => {
  if (res2) {
    res.send({ subscriptions: res2 });
  }
});
});

app.get("/getCompletedSubscriptions", (req, res) => {
Subscription.find({
  projectStatus: 'complete',
}).then((res2) => {
  if (res2) {
    res.send({ subscriptions: res2 });
  }
});
});

app.get("/getCompletedSubscriptionsOfVa", (req, res) => {
Subscription.find({
  va: req.body.va,
  projectStatus: 'complete',
}).then((res2) => {
  if (res2) {
    res.send({ subscriptions: res2 });
  }
});
});

app.get("/getHiringRequests", (req, res) => {
Subscription.find({
  paymentStatus: 'paid',
  projectStatus: 'pending',
  isCustom: false
}).then((res2) => {
  if (res2) {
    res.send({ hiringRequests: res2 });
  }
});
});

app.get("/getCustomRequests", (req, res) => {
Subscription.find({
  projectStatus: 'pending',
  isCustom: true
}).then((res2) => {
  if (res2) {
    res.send({ hiringRequests: res2 });
  }
});
});

app.get("/getAvailableVas", (req, res) => {
User.find({
  isVa: true,
  available: true
}).then((res2) => {
  if (res2) {
    res.send({ vas: res2 });
  }
});
});

app.get("/getAllVas", (req, res) => {
User.find({
  isVa: true,
}).then((res2) => {
  if (res2) {
    res.send({ vas: res2 });
  }
});
});

app.post("/handleEnquiry", (req, res) => {
const subscription = new Subscription({
  _id: new Types.ObjectId(),
  client: req.body.email,
  fee: req.body.price,
  service: req.body.selectedService,
  totalHours: req.body.totalHours,
  paymentStatus: 'none',
  vaStatus: 'not-assigned',
  projectStatus: 'pending',
  workingHours: req.body.workingHours,
  timezone: req.body.timezone,
  isCustom: true,
  enquiry: req.body.enquiry
});
subscription.save()
.then((result2) => {
  res.send();
})
.catch((saveError) => {
  console.error("Error saving subscription:", saveError);
  res.status(400).send("Error saving user");
}); 
});

app.post("/pay", (req, res) => {
User.findOne({
  email: req.body.email
}).then((res2) => {
  if (res2) {
    User.findOneAndUpdate(
      { email: req.body.email },
      { balance: Number(res2.balance) - Number(req.body.price) }
    ).then((result) => {
      const subscription = new Subscription({
        _id: new Types.ObjectId(),
        client: req.body.email,
        fee: req.body.price,
        service: req.body.selectedService,
        totalHours: req.body.totalHours,
        paymentStatus: 'paid',
        vaStatus: 'not-assigned',
        projectStatus: 'pending',
        workingHours: req.body.workingHours,
        timezone: req.body.timezone
      });
      subscription.save()
      .then((result2) => {
        const transaction = new Transaction({
          _id: new Types.ObjectId(),
          user: req.body.email,
          type: 'Subscription',
          balanceBefore: Number(res2.balance),
          balanceAfter: Number(res2.balance) - Number(req.body.price),
          status: 'Complete',
          date: getCurrentDate(),
          totalAmount: Number(req.body.price)
        });
        transaction.save()
        .then((result) => {
            res.status(200).send({balance: Number(res2.balance) - Number(req.body.price)});
        })
        .catch((saveError) => {
          console.error("Error saving transaction:", saveError);
          res.status(400).send("Error saving transaction");
        });  
      })
      .catch((saveError) => {
        console.error("Error saving subscription:", saveError);
        res.status(400).send("Error saving user");
      }); 
    }).catch((error) => {
        res.status(400).send(error);
    });
  }
});
});

// Retrieve messages for a specific chat
app.post('/getMessages', async (req, res) => {
try {
  const { sender, receiver } = req.body;
  const messages = await Message.find({
    $or: [
      { sender: sender, receiver: receiver },
      { sender: receiver, receiver: sender },
    ],
  }).sort({ timestamp: 1 });
  res.json(messages);
} catch (error) {
  res.status(500).json({ error: 'Failed to retrieve messages' });
}
});

const PORT = 8000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
