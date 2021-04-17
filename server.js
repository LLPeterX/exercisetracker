const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

app.use(cors());
app.use("/public", express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: false }));

// logging for debugging
/*
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  if (req.method === 'POST') {
    console.log('  body:', req.body);
  } else {
    console.log(' params:', req.params);
  }
  next();
});
*/
// ---------------------- MongoDB ------------------------------
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
  .catch(err => {
    console.error('Cannot connect to mongoDB', err);
  });

const defaultDate = () => new Date().toISOString().slice(0, 10);

const userSchema = mongoose.Schema(
  {
    username: { type: String, required: true, unique: false },
    exercies: [
      {
        description: { type: String },
        duration: { type: Number },
        date: { type: String, required: false }
      }
    ]
  }
);
const User = mongoose.model('Users', userSchema);

// create and save user
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

// get all users
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
// add exercises
function addExercise(req, res) {
  let { userId, description, duration, date } = req.body;
  if(!userId) {
    userId = req.params.userId;
  }
  if (!date || date.length != 10) {
    date = defaultDate();
  }
  if (isNaN(+duration)) {
    duration = 0;
  } else {
    duration = Number(duration);
  }
  console.log(' >> update params:', req.params);
  console.log(' >> update body:', req.body);
  let exObj = { description, duration, date }; // exrecise object to add
  User.findOneAndUpdate(
    { _id: userId }, // search 
    { $push: { exercices: exObj } }, // update
    { new: true }, // options
    function (err, updatedUser) { // callback
      if (err) {
        res.json({ error: 'user not found' });
      } else {
        console.log(' >>> updated user:',updatedUser);
        res.json(updatedUser);
      }
    }
  );
}

// get log by _id
function getLog(req, res) {
  console.log('log req params:', req.params);
  let userId = req.params.userId;
  let dFrom = req.query.from || '0000-00-00';
  let dTo = req.query.to || '9999-99-99';
  User.findOne({ _id: userId }, function (err, user) {
    if (err || !user) {
      return console.log('getLog() error:', err);
    }
    console.log('found user:', user._id);
    try {
      let ex = user.exercies.filter(e => e.date >= dFrom && e.date <= dTo)
        .map(e => ({description: e.description, duration: e.duration, date: e.date}));
      console.log(`ex len=${ex.length} usr ex len=${user.exercies.length}`);
      console.log('ex:',ex);
      let logObj = {};
      logObj.count = ex.length;
      logObj._id = user._id;
      logObj.username = user.username;
      logObj.log = ex;
      console.log('return user:',logObj);
      res.json(logObj);
    } catch (e) {
      res.json({ error: 'user not found' });
    }
  });
}


// find: db.users.find({awards: {$elemMatch: {award:'National Medal', year:1975}}})
// ------------------- main API ------------------------
app.get('/', (req, res) => {
  console.log('sending index.html');
  res.sendFile(__dirname + '/views/index.html');
});
// в index.html и в задании разные URL, так что оба варианта
app.post("/api/users", addUser);
app.post("/api/exercise/new-user", addUser);
app.get("/api/users", getAllUsers);
app.get("/api/exercise/users", getAllUsers);
app.post("/api/exercise/add", addExercise);
app.post("/api/users/:userId/excercices", addExercise);
app.get("/api/exercises/:userId/log", getLog);
// ------------------- Listener ------------------------
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
