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

const userSchema = mongoose.Schema(
  {
    username: { type: String, required: true, unique: false },
    description: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
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

// ------------------- main API ------------------------
app.get('/', (req, res) => {
  console.log('sending index.html');
  res.sendFile(__dirname + '/views/index.html');
});
// Тут х.з. - в index.html запрос post на "/api/exercise/new-user",
// а в задании на /api/users
app.post("/api/users", addUser);
app.post("/api/exercise/new-user", addUser);
app.get("/api/users", getAllUsers);
// ------------------- Listener ------------------------
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
