const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

const ERR_USER_NOTFUND = {error: 'user not found'};

app.use(cors());
app.use("/public", express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: false }));

// log all requests for debugging
/*
app.use((req, res, next) => {
  console.log(`LOG: ${req.method} ${req.path}`);
  // if (req.method === 'POST') {
  //   console.log('  body:', req.body);
  // } else {
  //   console.log(' params:', req.params);
  // }
  next();
});
*/
// ---------------------- MongoDB ------------------------------
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
  .catch(err => {
    console.error('Cannot connect to mongoDB', err);
  });

const defaultDate = () => new Date().toISOString().slice(0, 10);
//const utcDate = (sd) => new Date(sd).toUTCString().replace(',','').slice(0,15); // 'Mon Jan 01 1990'

const userSchema = mongoose.Schema(
  {
    username: { type: String, required: true, unique: false },
    exercices: [
      {
        description: { type: String },
        duration: { type: Number },
        date: { type: String, required: false }
      }
    ]
  }
);
const User = mongoose.model('Users', userSchema);

// create and save user (OK)
function addUser(req, res) {
  let username = req.body.username;
  if (!username || username.length === 0) {
    res.json({ error: "Invalid username" });
  }
  const user = new User({ username: username });
  user.save(function (err, newUser) {
    if (err) {
      return console.log('addUser() error saving new user:', err);
    }
    res.json({ username: newUser.username, _id: newUser._id });
  });
}

// get all users (OK)
function getAllUsers(req, res) {
  User.find()
    .select('username _id')
    .exec(function (err, userList) {
      if (err) {
        return console.log('getAllUsers() error:', err);
      }
      res.json(userList);
    });
}
// add exercises = FAIL
/*
You can POST to /api/users/:_id/exercises with form data 'description', 'duration', and optionally 'date'. 
If no date is supplied, the current date will be used. 
The response returned will be the user object with the exercise fields added.
*/
function addExercise(req, res) {
  const userId = req.params.userId || req.body.userId; // userId from URL or from body
  const exObj = { 
    description: req.body.description,
    duration: +req.body.duration,
    date: req.body.date || defaultDate()
  }; // exrecise object to add
  console.log(' >> URL:',req.url); // sample: /api/users/607d75bde17ce700fff750fc/exercises
  console.log(' >> update params:', req.params);
  console.log(' >> update body:', req.body);
  console.log(' >> exObj:', exObj);
  User.findByIdAndUpdate(
    userId, // find user by _id
    {$push: { exercices: exObj } }, // add exObj to exercices[]
    {new: true},
    function (err, updatedUser) {
      if(err) {
        return console.log('update error:',err);
      }
      let returnObj = {
        _id: updatedUser.id,
        username: updatedUser.username,
        description: exObj.description,
        duration: exObj.duration,
        date: exObj.date
      };
      console.log(' >> UPDATED USER:',updatedUser);
      console.log(' >> ANSWER:',returnObj);
      res.json(returnObj);
    }
  );
}

// get log by _id (OK)
function getLog(req, res) {
  let userId = req.params.userId;
  let dFrom = req.query.from || '0000-00-00';
  let dTo = req.query.to || '9999-99-99';
  let limit = +req.query.limit || 9999;
  User.findOne({ _id: userId }, function (err, user) {
    if (err || !user) {
      return console.log('getLog() error:', err);
    }
    try {
      let ex = user.exercices.filter(e => e.date >= dFrom && e.date <= dTo)
        .map(e => ({description: e.description, duration: e.duration, date: e.date}))
        .slice(0,limit);
      let logObj = {};
      logObj.count = ex.length;
      logObj._id = user._id;
      logObj.username = user.username;
      logObj.log = ex;
      res.json(logObj);
    } catch (e) {
      res.json(ERR_USER_NOTFUND);
    }
  });
}

// ------------------- main API ------------------------
app.get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'));
// different endpoint in index.html and task description, so both 
app.post("/api/users", addUser); // task
app.post("/api/exercise/new-user", addUser); // index.html

app.get ("/api/users", getAllUsers); // task
app.get ("/api/exercise/users", getAllUsers); // just ion case

app.post("/api/exercise/add", addExercise); // OK
app.all("/api/users/:userId/exercises", addExercise); // fail

app.get("/api/exercises/:userId/log", getLog); // ok
app.get("/api/users/:userId/logs", getLog); // ok
// ------------------- Listener ------------------------
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
