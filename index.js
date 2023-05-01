
require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");

const expireTime = 24 * 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var { database } = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
    crypto: {
        secret: mongodb_session_secret
    }
})

app.use(session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store 
    saveUninitialized: false,
    resave: true
}
));

app.get('/', (req, res) => {
    if (req.session.authenticated) {
        res.send(`
            <p>Hello, ${req.session.username}.</p>
            <a href="/members"><button>Go to Members Area</button></a><br>
            <a href="/logout"><button>Logout</button></a>
        `);
    } else {
        res.send(`
            <a href="/signup"><button>Sign Up</button></a><br>
            <a href="/login"><button>Log In</button></a>
               
        `);
    }
});

app.get('/members', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
        return;
    }
    res.send(`<h1>Welcome to the members area, ${req.session.username}.</h1>`);
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/signup', (req, res) => {
    res.send(`
        create user
        <form action='/signup' method='post'>
        <input name='username' type='text' placeholder='name'><br>
        <input name='email' type='email' placeholder='email'><br>
        <input name='password' type='password' placeholder='password'><br>
        <button>Submit</button>
        </form>
    `);
});

app.post('/signup', async (req, res) => {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    // Check for empty fields
    let errorMsg = "";
    if (!username) {
        errorMsg += "Name is required. <br>";
    }
    if (!email) {
        errorMsg += "Email is required. <br>";
    }
    if (!password) {
        errorMsg += "Password is required. <br>";
    }
    if (errorMsg !== "") {
        errorMsg += "<br><a href='/signup'>Try again</a>";
        res.send(errorMsg);
        return;
    }

    // Validate inputs using Joi
    const schema = Joi.object(
        {
            username: Joi.string().alphanum().max(20).required(),
            email: Joi.string().email().required(),
            password: Joi.string().max(20).required()
        });

    const validationResult = schema.validate({ username, email, password });
    if (validationResult.error != null) {
        console.log(validationResult.error);
        res.redirect("/signup");
        return;
    }

    var hashedPassword = await bcrypt.hash(password, saltRounds);

    // Add user to MongoDB database
    await userCollection.insertOne({ username: username, email: email, password: hashedPassword });
    console.log("Inserted user");

    // Create session and redirect to /members page
    req.session.userId = user._id;
    res.redirect("/members");
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
    res.status(404);
    res.send("Page not found - 404");
})

app.listen(port, () => {
    console.log("Node application listening on port " + port);
}); 
