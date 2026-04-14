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
const flash = require('express-flash');
const bcrypt = require('bcrypt');

const counters = require('./counters');

const ROUNDS = 15;

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
app.use(flash());

app.use(cookieSession({
    name: 'session',
    keys: [cs304.randomString(20)],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))


const mongoUri = cs304.getMongoUri();

//declaring wabanimals our db for all functions/queries
const wabanimals_db = "wabanimals";
const USERS = "users";
const POSTS = "posts";



// HOME FEED ROUTE
// Displays all posts on the homepage (feed)
app.get('/', async (req, res) => {
    try {
       
        const db = await Connection.open(mongoUri, wabanimals_db);

        // get all posts from the posts collection
        // Sort by postID descending so newest posts appear first
        const posts = await db.collection(POSTS)
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        // Render home.ejs and pass posts into the template
        res.render('home', {
            posts: posts
        });

    } catch (error) {
        console.error("Error loading homepage feed:", error);

        // error by rendering page with no posts
        req.flash('error', 'Unable to load posts at this time.');
        res.render('home', { posts: [] });
    }
});

//search route 
app.get('/search', async (req, res) => {

    try {
        const term = req.query.term;
        const kind = req.query.kind;

        // if no search yet, render empty page
        if (!term || !kind) {
            return res.render('search', {
                results: null,
                term: "",
                kind: ""
            });
        }
        const db = await Connection.open(mongoUri, wabanimals_db);

        let query = {};

        if (term && kind) {
            if (kind === "species") {
                query.species = { $regex: term, $options: "i" };
            }  else if (kind === "date") {
                query.sightingDate = term;
            }
        }

        const results = await db.collection("posts").find(query).toArray();
        //flash errors
        if (results.length === 0) {
            req.flash('info', `No results found for "${term}" in ${kind}.`);
        }

        res.render("search", {
            results: results,
            term: term,
            kind: kind
        });

    } catch (err) {
        console.error("Search error:", err);
        req.flash('error', "Search failed: " + err.message);
        res.redirect('/search');
    }


});

//register form
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, wabanimals_db);
        var existingUser = await db.collection(USERS).findOne({username: username});
        if (existingUser) {
          req.flash('error', "Login already exists - please try logging in instead.");
          return res.redirect('/')
        }
        const hash = await bcrypt.hash(password, ROUNDS);
        const result = await insertNewUser(db, username, hash, 0, false, 0, [])
    
        if (result){
            console.log('successfully joined', username, password, hash);
            req.flash('info', 'successfully joined and logged in as ' + username);
        }
        

        req.session.username = username;
        req.session.logged_in = true;
        return res.redirect('/');
      } catch (error) {
        console.log(error);
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/')
      }
});

//login form (need to make password covered)
app.get('/login', (req, res) => {
    res.render('login');
});

app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, wabanimals_db);
        var existingUser = await db.collection(USERS).findOne({ userID: username });
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
        return res.redirect('/');
    } catch (error) {
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/')
    }
});

app.get('/logout', (req, res) => {
    res.render('logout');
});

app.post('/logout', (req, res) => {
    if (req.session.username) {
        req.session.username = null;
        req.session.logged_in = false;
        req.flash('info', 'You are logged out');
        return res.redirect('/');
    } else {
        req.flash('error', 'You are not logged in - please do so.');
        return res.redirect('/login');
    }
});

function requiresLogin(req, res, next) {
    if (!req.session.logged_in) {
        req.flash('error', 'This page requires you to be logged in - please do so.');
        return res.redirect("/");
    } else {
        next();
    }
}

app.get('/profile', async (req, res) => {
    try {
        //make sure user is logged in
        if (!req.session.logged_in) {
            req.flash('error', 'Please log in first.');
            return res.redirect('/');
        }

        const db = await Connection.open(mongoUri, wabanimals_db);

        const userID = req.session.username;

        const userProfile = await db.collection(USERS).findONE({userID: userID});
        console.log("profile data: ", userProfile);
        res.render("profile", {user: userProfile});
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

//renders about page
app.get('/about', async(req, res) => {
    return res.render('about');
})
//post for submitting post form (sent from ejs)
//creates a post database entry
app.post("/submit-post-form", async (req, res) => {
    console.log("________________________________")
    console.log("submitting post form")

    try {
        const db = await Connection.open(mongoUri, wabanimals_db);
        //collect title from the form
        const post_title = req.body.title;
        console.log("title: ", post_title)

        //collect species from form
        const species = req.body.species;
        console.log("species: ", species)


        //input after suzy is done
        //const image = req.body.image;

        //collect location from form
        const location = req.body.location;
        console.log("location: ", location);

        //collect sightingTime from form
        const sightingTime = req.body.time;
        console.log("sightingTime: ", sightingTime);

        //collect sightingDate from form
        const sightingDate = req.body.date;
        console.log("sightingDate: ", sightingDate);

        //collect description from form
        const description = req.body.description;
        console.log("description: ", description);

        // get user from session - not running yet
        //const userID = req.session.username;
        const userID = null;

        //detect incomplete form
        //ADD IMAGE LATER
    if (!post_title || !species || !location || !sightingTime || !sightingDate ||!description){
        req.flash('error', 'All fields are required');

        return res.redirect('/')
    } 
        //create new db entry in the posts collection 
        //postID determined from counters
        const result = await insertNewPost(db, userID, post_title, species, description, sightingDate, sightingTime, location);
        console.log("inserting postID ", result.postID, "into POSTS: ", result)

        //insert a flash here saying your post has been uploaded?
        if (result) {
            req.flash('info', `You have successfully uploaded your post! Your postID = ${result.postID}`);
            return res.redirect('/');
        }

    } catch (error) {
        console.log("error submitting post:", error);
        req.flash('error', `Error submitting post: ${error}`);
        return res.redirect('/');
    }

});


async function incr(counters, key) {
    let result = await counters.findOneAndUpdate(
        {collection: key},
        {$inc: {counter: 1}}, 
        {returnDocument: "after"}
    );

    if(result) {
        return result.counter;
    }
}

//inserts new post entry with inputted parameters, some from back end, some from form
async function insertNewPost(db, userID, postTitle, species, description, sightingDate, sightingTime, sightingLocation) {

    const counters = db.collection("counters");

    const postID = await incr(counters, "posts")
    console.log('currentPostId: ', postID);

    const newPost = {
        //created by us based on last postid used
        postID: postID,
        //CHANGE USERID WHEN LOGIN WORKS
        userID: null,
        postTitle: postTitle,
        species: species,
        description: description,
        sightingDate: sightingDate,
        sightingTime: sightingTime,
        sightingLocation: sightingLocation,
        createdAt: new Date()
    }

    console.log("newPost: ", newPost);
    const result = await db.collection("posts").insertOne(newPost);
    //return true when result is within the database
    console.log("your postID is: ", postID)
    return {
        success: result.acknowledged,
        postID: postID
    };
}

//finds a post in the db given the postID
async function findPost(db, postID) {
    const post = await db.collection("posts")
        .findOne({ postID: postID });

    return post;
}

// updates pet by searching for postID through database -- admin only
async function updatePost(db, postID, userID, postTitle, species, description, sightingDate, sightingTime, sightingLocation) {
    const result = await db.collection("posts")
        .updateOne(
            { postID: postID },
            {
                $set: {
                    postID: postID, userID: userID,
                    postTitle: postTitle,
                    species: species,
                    description: description,
                    sightingDate: sightingDate,
                    sightingLocation: sightingLocation
                }
            },
            { upsert: false }
        )
    return result.modifiedCount === 1;
}

//deletes post by postID - only for admin
async function deletePost(db, postID) {
    const result = await db.collection("posts").deleteOne({ postID: postID });

    //return true if one object was deleted
    return result.deletedCount === 1;
}


//inserts new user entry with the inputted parameters
async function insertNewUser(db, userID, hash, numPosts, admin, numTotalComments, speciesSighted) {
    const newUser = {
        userID: userID,
        hash: hash,
        numPosts: numPosts,
        admin: admin,
        numTotalComments: numTotalComments,
        speciesSighted: speciesSighted
    }

    const result = await db.collection(USERS).insertOne(newUser);
    return {
        success: result.acknowledged,
        userID: userID
    }
}

//finds a user in the db given the userID
async function findUser(db, userID) {
    const user = await db.collection("users")
        .findOne({ userID: userID });

    return user;
}

//updates  user profile in the db given the userID
async function updateUser(db, userID, numPosts, admin, numTotalComments, speciesSighted) {
    const result = await db.collection("users")
        .updateOne({ userID: userID },
            {
                $set: {
                    userID: userID,
                    numPosts: numPosts,
                    admin: admin,
                    numTotalComments: numTotalComments,
                    speciesSighted: speciesSighted
                }
            }
        )
    return result.modifiedCount === 1;
}

//deletes user by userID - only for admin
async function deleteUser(db, userID) {
    const result = await db.collection("users").deleteOne({ userID: userID });

    //return true if one object was deleted
    return result.deletedCount === 1;
}

//upload route
app.get("/upload", (req, res) => {
    res.render("upload.ejs");
});



async function main() {
    console.log('starting function check...\n');

    //load wabanimals database
    const wabanimals_db = await Connection.open(mongoUri, 'wabanimals');

    await counters.init(wabanimals_db.collection("counters"), "posts");

    console.log("counters initialized");
    //inserting a post under ai106, postID = 1, 3 cute bunnies
    //const test_insert_post = await insertNewPost(wabanimals_db, 'ai106', 'three cute bunnies', 'rabbit', 'super cute bunnies!', '2026-03-26', '10:04 AM', 'Sev Green');
    //console.log("insertNewPost (test 3 bunnies): ", test_insert_post);

    //searching for postID = 1 (3 cute bunnies)
    //const test_find_post = await findPost(wabanimals_db, 1);
    //console.log("findPost: ", test_find_post);

    //updating bunny post to 5 cute bunnies in paramecium pond
    //const test_update_post = await updatePost(wabanimals_db, 1, 'ai106', 'five cute bunnies', 'rabbit', 'super cute bunnies!', '2026-03-26', '10:04 AM', 'Paramecium Pond' );
    //console.log("updatePost: ", test_update_post);

    //deleting postID = 1 (3 cute bunnies)
    //const test_delete_post = await deletePost(wabanimals_db, 1);
    //console.log("deletePost: ", test_delete_post);

    //inserting a user as ai106
    //const test_insert_user = await insertNewUser(wabanimals_db, 'ai106', 3, true, 2, ['rabbit', 'hawk', 'goose']);
    //console.log("insertNewUser (ai106): ", test_insert_user);

    //searching for userID = ai106
    //const test_find_user = await findUser(wabanimals_db, 'ai106');
    //console.log("findUser: ", test_find_user);

    //updating user ai106 to now sight frog as well
    //const test_update_user = await updateUser(wabanimals_db, 'ai106', 3, true, 2, ['rabbit', 'hawk', 'goose', 'frog']);
    //console.log("updateUser (ai106): ", test_update_user);

    //deleting userID = 'ai106'
    //const test_delete_user = await deleteUser(wabanimals_db, 'ai106');
    //console.log("deleteUser: ", test_delete_user);

    await Connection.close();
}
main().catch(console.error);


//--------------------------- last --------------------------------

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function () {
    console.log(`open http://localhost:${serverPort}`);
});
