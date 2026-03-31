const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env') });
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');

// our modules loaded from cwd

const { Connection } = require('./connection');
const cs304 = require('./cs304');
const { add, result, find } = require('lodash');

// Create and configure the app

const app = express();

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);  // tell the user about any request data

app.use(serveStatic('public'));
app.set('view engine', 'ejs');
app.use(express.static('public'));

const mongoUri = cs304.getMongoUri();

//declaring wabanimals our db for all functions/queries
const db = "wabanimals";


//home page results in the home ejs file
app.get('/', (req, res) => {
    res.render('home.ejs');
})


//should this be post??
app.get('/order', (req, res) => {
    const queryData = req.query;
    console.log(queryData);
});


//register form
app.post("/join", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, DBNAME);
        var existingUser = await db.collection(USERS).findOne({ username: username });
        if (existingUser) {
            req.flash('error', "Login already exists - please try logging in instead.");
            return res.redirect('/')
        }
        const hash = await bcrypt.hash(password, ROUNDS);
        await db.collection(USERS).insertOne({
            username: username,
            hash: hash
        });
        console.log('successfully joined', username, password, hash);
        req.flash('info', 'successfully joined and logged in as ' + username);
        req.session.username = username;
        req.session.logged_in = true;
        return res.redirect('/hello');
    } catch (error) {
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/')
    }
});

app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, DBNAME);
        var existingUser = await db.collection(USERS).findOne({ username: username });
        console.log('user', existingUser);
        if (!existingUser) {
            req.flash('error', "Username does not exist - try again.");
            return res.redirect('/')
        }
        const match = await bcrypt.compare(password, existingUser.hash);
        console.log('match', match);
        if (!match) {
            req.flash('error', "Username or password incorrect - try again.");
            return res.redirect('/')
        }
        req.flash('info', 'successfully logged in as ' + username);
        req.session.username = username;
        req.session.logged_in = true;
        console.log('login as', username);
        return res.redirect('/hello');
    } catch (error) {
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/')
    }
});

app.post('/logout', (req, res) => {
    if (req.session.username) {
        req.session.username = null;
        req.session.logged_in = false;
        req.flash('info', 'You are logged out');
        return res.redirect('/');
    } else {
        req.flash('error', 'You are not logged in - please do so.');
        return res.redirect('/');
    }
});

function requiresLogin(req, res, next) {
    if (!req.session.loggedIn) {
        req.flash('error', 'This page requires you to be logged in - please do so.');
        return res.redirect("/");
    } else {
        next();
    }
}


//inserts new post entry with inputted parameters, some from back end, some from form
async function insertNewPost(db, postID, userID, postTitle, species, description, sightingDate, sightingTime, sightingLocation) {
    const newPost = {
        //created by us
        postID: postID,
        //determined on the back end
        userID: userID,
        //from form
        postTitle: postTitle,
        //from form
        species: species,
        //do we still want this?? numComments: '',
        //from form
        description: description,
        //from form
        sightingDate: sightingDate,
        //from form
        sightingTime: sightingTime,
        //from form
        sightingLocation: sightingLocation
    }

    const result = await db.collection("posts").insertOne(newPost);
    //return true when result is within the database
    return result.acknowledged === true;
}

//finds a post in the db given the postID
async function findPost(db, postID) {
    const post = await db.collection("posts")
        .findOne({ postID: postID });

    return post;
}

//NEED TO DO UPDATEPOST - what are they allowed to update??
// updates pet by searching for petID through database


//deletes post by postID - only for admin
async function deletePost(db, postID) {
    const result = await db.collection("posts").deleteOne({ postID: postID });

    //return true if one object was deleted
    return result.deletedCount === 1;
}


//inserts new user entry with the inputted parameters
async function insertNewUser(db, userID, numPosts, admin, numTotalComments, speciesSighted) {
    const newUser = {
        userID: userID,
        numPosts: numPosts,
        admin: admin,
        numTotalComments: numTotalComments,
        speciesSighted: speciesSighted
    }

    const result = await db.collection("users").insertOne(newUser);
    return result.acknowledged === true;
}

//finds a user in the db given the userID
async function findUser(db, userID) {
    const user = await db.collection("users")
        .findOne({ userID: userID });

    return user;
}

//DO UPDATE USER

//deletes user by userID - only for admin
async function deleteUser(db, userID) {
    const result = await db.collection("users").deleteOne({ userID: userID });

    //return true if one object was deleted
    return result.deletedCount === 1;
}



async function main() {
    console.log('starting function check...\n');

    //load wabanimals database
    const wabanimals_db = await Connection.open(mongoUri, 'wabanimals');

    //inserting a post under ai106, postID = 1, 3 cute bunnies
    const test_insert_post = await insertNewPost(wabanimals_db, 1, 'ai106', 'three cute bunnies', 'rabbit', 'super cute bunnies!', '2026-03-26', '10:04 AM', 'Sev Green');
    console.log("insertNewPost (test 3 bunnies): ", test_insert_post);

    //searching for postID = 1 (3 cute bunnies)
    const test_find_post = await findPost(wabanimals_db, 1);
    console.log("findPost: ", test_find_post);

    //TEST UPDATE POST HERE

    //deleting postID = 1 (3 cute bunnies)
    const test_delete_post = await deletePost(wabanimals_db, 1);
    console.log("deletePost: ", test_delete_post);

    //inserting a user as ai106
    const test_insert_user = await insertNewUser(wabanimals_db, 'ai106', 3, true, 2, ['rabbit', 'hawk', 'goose']);
    console.log("insertNewUser (ai106): ", test_insert_user);

    //searching for userID = ai106
    const test_find_user = await findUser(wabanimals_db, 'ai106');
    console.log("findUser: ", test_find_user);

    //TEST UPDATE USER HERE

    //deleting userID = 'ai106'
    const test_delete_user = await deleteUser(wabanimals_db, 'ai106');
    console.log("deleteUser: ", test_delete_user);

    //DECIDE ON HOW TO DO ANIMALS COLLECTION


    await Connection.close();
}
main().catch(console.error);


//--------------------------- last --------------------------------

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function () {
    console.log(`open http://localhost:${serverPort}`);
});
