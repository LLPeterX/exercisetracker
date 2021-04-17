const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

app.use(cors());
app.use("/public", express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: false }));

// logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  if (req.method === 'POST') {
    console.log('  body:', req.body);
  } else {
    console.log(' params:', req.params);
  }
  next();
});

// ---------------------- MongoDB ------------------------------
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
  .catch(err => {
    console.error('Cannot connect to mongoDB', err);
  });

// ниже переработать! 
// длбавить массив exercies c {description, duration, date}
// дата в YYYY-MM-DD

const defaultDate = new Date().toISOString().slice(0, 10);

// const exSchema = mongoose.Schema({
//    description: { type: String, default: null },
//    duration: { type: Number, default: 0 },
//    date: { type: String, default: defaultDate()}
// });
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
    //exercies: { type: [exSchema], default: undefined}
    // description: { type: String, default: null },
    // duration: { type: Number, default: 0 },
    // date: { type: String, default: null }
  }
);
const User = mongoose.model('Users', userSchema);

// create and save user
function addUser(req, res) {
  console.log('addUser() body:', req.body);
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
  console.log('get all users');
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
  if (!date || date.length != 10) {
    date = defaultDate();
  }
  if (isNaN(+duration)) {
    duration = 0;
  } else {
    duration = Number(duration);
  }
  let exObj = { description, duration, date }; // exrecise object to add
  User.findOneAndUpdate(
    { _id: userId }, // search 
    { $push: { exercies: exObj } }, // update
    { new: true }, // options
    function (err, updatedUser) { // callback
      if (err) {
        res.json({ error: 'user not found' });
      } else {
        res.json(updatedUser);
      }
    }
  );
}

// get log by _id
function getLog(req, res) {
  let userId = req.params.userId;
  let dFrom = req.params.from || '0000-00-00';
  let dTo = req.params.to || '9999-99-99';
  User.find({_id: userId})
    .select('description duration date')
    .exec(function (err, user) {
      if (err) {
        return console.log('getLog() error:', err);
      }
      let ex = user.exercies.filter(str => str>=dFrom && str<=dTo);
      user.exercies = ex;
      res.json(user);
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
app.get("/api/exercise/log", getLog);
// ------------------- Listener ------------------------
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
