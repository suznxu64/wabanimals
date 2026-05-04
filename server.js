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
const multer = require('multer');

const counters = require('./counters');
const { CHAR_0 } = require('picomatch/lib/constants');

const ROUNDS = 15;

// Create and configure the app

const app = express();

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads')); //multer for file upload

app.use(cs304.logRequestData);  // tell the user about any request data

app.use(serveStatic('public'));
app.set('view engine', 'ejs');
app.use(express.static('public'));
//inserting flash
app.use(flash());

//automatic cookiesession
app.use(cookieSession({
    name: 'session',
    keys: [cs304.randomString(20)],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))


app.use(async (req, res, next) => {
    res.locals.session = req.session;
    res.locals.isAdmin = false;
    if (req.session.logged_in) {
        try {
            const db = await Connection.open(mongoUri, wabanimals_db);
            const user = await findUser(db, req.session.username);
            res.locals.isAdmin = user?.admin ?? false;
        } catch (error) {
            console.log('error fetching admin status:', error);
        }
    }
    next();
});



function timeString(dateObj) {
    if (!dateObj) {
        dateObj = new Date();
    }
    // convert val to two-digit string
    d2 = (val) => val < 10 ? '0' + val : '' + val;
    let hh = d2(dateObj.getHours())
    let mm = d2(dateObj.getMinutes())
    let ss = d2(dateObj.getSeconds())
    return hh + mm + ss
}

//configures storage property of Milter
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        let parts = file.originalname.split('.');
        let ext = parts[parts.length - 1];
        let hhmmss = timeString();
        cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
    }
})

//creates a middleware function using the milter model
var upload = multer({
    storage: storage, limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const ext = file.originalname.toLowerCase().split('.').pop();
        if (ext === 'heic') {
            req.fileValidationError = 'HEIC images are not supported. Please convert to JPEG before uploading.';
            return cb(null, false);
        }
        cb(null, true);
    }
});

const mongoUri = cs304.getMongoUri();

//declaring wabanimals our db for all functions/queries
const wabanimals_db = "wabanimals";
const USERS = "users";
const POSTS = "posts";


/*
* This function makes sure certain pages can only be seen when a user in logged in. 
*/
function requiresLogin(req, res, next) {
    if (!req.session.username) {
      req.flash('error', 'This page requires you to be logged in - please do so.');
      return res.redirect("/login");
    }
    next();
  }
  
/*
* This / endpoint is a GET route that redirects to the register page. 
*/
app.get('/', async (req, res) => {
    return res.redirect('/register');
});

//home page
app.get('/home', requiresLogin, async (req, res) => {
    try {

        const db = await Connection.open(mongoUri, wabanimals_db);

        // get all posts from the posts collection
        // Sort by postID descending so newest posts appear first
        const posts = await db.collection(POSTS)
            .find({})
            .sort({ createdAt: -1 }) //sort in order of most recently created
            .toArray();

    

        const totalPosts = await db.collection(POSTS).countDocuments();
        const totalUsers = await db.collection(USERS).countDocuments();
        const totalSpecies = await db.collection(POSTS).distinct('species');
        // Render home.ejs and pass posts into the template
        res.render('home', {
            posts: posts,
            totalPosts,
            totalUsers,
            totalSpecies: totalSpecies.length,
        });

    } catch (error) {
        //prints to the console if there is an error
        console.error("Error loading homepage feed:", error);

        // if there is error, also renders a page with no posts and flashes a message
        req.flash('error', 'Unable to load posts at this time.');
        res.render('home', { posts: [] });
    }
});

/*
* This /search endpoint is a GET 
*/
app.get('/search', requiresLogin, async (req, res) => {

    try {
        const term = req.query.term;
        const kind = req.query.kind;

        // if there has not been a search yet, render empty page
        if (!term || !kind) {
            return res.render('search', {
                results: null,
                term: "",
                kind: ""
            });
        }
        const db = await Connection.open(mongoUri, wabanimals_db); //open database

        let query = {}; //initialize query 


        if (term && kind) {
            //if the user searches by species, search the database by species using regular expression
            if (kind === "species") {
                query.species = { $regex: term, $options: "i" };
                //if the user searches by location, search the database by location using regular expression
            } else if (kind === "location") {
                query.sightingLocation = { $regex: term, $options: "i" };
            }
        }

        const results = await db.collection("posts").find(query).toArray();

        //flash errors if there are no matches to the search term 
        if (results.length === 0) {
            req.flash('info', `No results found for "${term}" in ${kind}.`);
        }

        //render results to search ejs page
        res.render("search", {
            results: results,
            term: term,
            kind: kind
        });

        //print to console error and flash error and redirect to search page if there is another type of error
    } catch (err) {
        console.error("Search error:", err);
        req.flash('error', "Search failed: " + err.message);
        res.redirect('/search');
    }


});

/*
* This endpoint renders the register.ejs.
*/
app.get('/register', (req, res) => {
    res.render('register');
});

/*
* This endpoint takes in the information from the form, creating a new user if the user does not exist in the
* USERS document. If the user already exists, then flashes an error on screen, indicating to user that they should login.
*/
app.post('/register', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, wabanimals_db);
        var existingUser = await db.collection(USERS).findOne({ username: username });
        //flashes an error if user exists
        if (existingUser) {
            req.flash('error', "Login already exists - please try logging in instead.");
            return res.redirect('/')
        }
        const hash = await bcrypt.hash(password, ROUNDS);
        //inserts new user
        const result = await insertNewUser(db, username, hash, 0, false, 0, [])

        if (result) {
            console.log('successfully joined', username, password, hash);
            req.flash('info', 'successfully joined and logged in as ' + username);
        }


        req.session.username = username;
        req.session.logged_in = true;
        return res.redirect('/home');
    } catch (error) {
        console.log(error);
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/home')
    }
});

/*
* This endpoint renders the login.ejs.
*/
app.get('/login', (req, res) => {
    res.render('login');
});

/*
* This endpoint takes in the information from the form, logging the user into their account if it exists in the USERS document.
* If user does not exist or information is incorrect, then flashes an error indicating said issue to user. Redirects user to
* home page.
*/
app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const db = await Connection.open(mongoUri, wabanimals_db);
        var existingUser = await db.collection(USERS).findOne({ userID: username });
        console.log('user', existingUser);
        if (!existingUser) {
            req.flash('error', "Username does not exist - try again.");
            return res.redirect('/login')
        }
        //finds account in USERS document; if match exists logs in, if not, flashes an error and redirects
        const match = await bcrypt.compare(password, existingUser.hash);
        console.log('match', match);
        if (!match) {
            req.flash('error', "Username or password incorrect - try again.");
            return res.redirect('/login')
        }
        req.flash('info', 'successfully logged in as ' + username);
        req.session.username = username;
        req.session.logged_in = true;
        console.log('login as', username);
        return res.redirect('/home');
    } catch (error) {
        req.flash('error', `Form submission error: ${error}`);
        return res.redirect('/login')
    }
});

/*
* This endpoint sends to the logout post.
*/
app.get('/logout', (req, res) => {
    res.render('logout');
});

/*
* This endpoint logs the user out of their account and flashes an error if the user attempts to log out but is not logged in.
*/
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

//this endpoint takes users to their individual profile page which is linked
//to their user account and they can see their data 
app.get('/profile', requiresLogin, async (req, res) => {
    try {

        //open wabanimals
        const db = await Connection.open(mongoUri, wabanimals_db);

        //get userid from session info
        const userID = req.session.username;

        //find user information from the collection
        const userProfile = await db.collection(USERS).findOne({ userID: userID });

        const userPosts = await db.collection(POSTS)
            .find({ userID: userID })
            .sort({ createdAt: -1 })
            .toArray();

        console.log("profile data: ", userProfile);
        res.render("profile", { user: userProfile, posts:userPosts });
    } catch (error) {
        console.log(error);
        res.redirect('/home');
    }
});


app.get('/admin', requiresLogin, async(req, res) => {
    //find user information from the collection

    const db = await Connection.open(mongoUri, wabanimals_db)
    const currentUser = await findUser(db, req.session.username);
    const isAdmin = currentUser?.admin ?? false;

    if (!isAdmin) {
        req.flash('error', 'You cannot view this page.');
        res.redirect('/home');
    }

    const users = await db.collection(USERS).find({}).toArray();

    return res.render('admin.ejs', {users})

})

app.post("/admin/ban/:username", requiresLogin, async(req,res) => {
    const db = await Connection.open(mongoUri, wabanimals_db)

    const currentUser = await findUser(db, req.session.username);
    const isAdmin = currentUser?.admin ?? false;

    if (!isAdmin) {
        req.flash('error', 'You cannot view this page.');
        res.redirect('/home');
    }

    await db.collection('users').deleteOne(
        {userID: req.params.username}
    )

    req.flash('info', `User ${req.params.username} deleted.`);
    return res.redirect('/admin');  
})

//renders about page through a GET route with basic exposition information
app.get('/about', requiresLogin, async (req, res) => {
    return res.render('about');
})

//post for submitting post form (sent from ejs)
//creates a post database entry
app.post("/submit-post-form", upload.single('image'), async (req, res) => {
    console.log("________________________________")
    console.log("submitting post form")

    //makes sure that the file submitted is a JPEG file
    if (req.fileValidationError) {
        req.flash('error', req.fileValidationError);
        return res.redirect('/home');
    }

    try {
        const db = await Connection.open(mongoUri, wabanimals_db);
        //collect title from the form
        const post_title = req.body.title;
        console.log("title: ", post_title)



        //collect species from form
        const species = req.body.species;
        console.log("species: ", species)


        //collect image from form
        const image = req.file;
        console.log("image: ", image);

        //collects the image's file name from form
        const imageName = req.file.filename;
        console.log("imageName: ", imageName);

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
        const userID = req.session.username;

        if (req.fileValidationError) {
            req.flash('error', req.fileValidationError);
            return res.redirect('/home');
        }

        //detect incomplete form
        if (!post_title || !species || !image || !imageName || !location || !sightingTime || !sightingDate || !description) {
            req.flash('error', 'All fields are required');

            return res.redirect('/home')
        }

        //create new db entry in the posts collection 
        //postID determined from counters
        const result = await insertNewPost(db, userID, post_title, species, image, imageName, description, sightingDate, sightingTime, location);
        console.log("inserting postID ", result.postID, "into POSTS: ", result)

        //insert a flash here saying your post has been uploaded?
        if (result) {
            req.flash('info', `You have successfully uploaded your post! Your postID = ${result.postID}`);
            return res.redirect('/home');
        }

    } catch (error) {
        console.log("error submitting post:", error);
        req.flash('error', `Error submitting post: ${error}`);
        return res.redirect('/home');
    }

});

//increment function from scott's code for use in postID
async function incr(counters, key) {
    let result = await counters.findOneAndUpdate(
        { collection: key },
        //increment the counter
        { $inc: { counter: 1 } },
        { returnDocument: "after" }
    );

    //return new counter number
    if (result) {
        return result.counter;
    }
}

//inserts new post entry with inputted parameters, some from back end, some from form
async function insertNewPost(db, userID, postTitle, species, image, imageName, description, sightingDate, sightingTime, sightingLocation) {

    const counters = db.collection("counters");

    const postID = await incr(counters, "posts")
    console.log('currentPostId: ', postID);

    const newPost = {
        //all information from the parameters
        postID: postID,
        userID: userID,
        postTitle: postTitle,
        species: species,
        image: image,
        imageName: imageName,
        description: description,
        sightingDate: sightingDate,
        sightingTime: sightingTime,
        sightingLocation: sightingLocation,
        likes: 0,
        likedBy: [],
        comments: [],
        createdAt: new Date()
    }

    console.log("newPost: ", newPost);
    const result = await db.collection("posts").insertOne(newPost);
    //return true when result is within the database and returns postid to find later
    console.log("your postID is: ", postID)

    //connect to user database to add userid to the post
    const user = await findUser(db, userID);
    //collect data about the user from the user database
    let old_num_posts = user.numPosts;
    const old_admin = user.admin;
    const old_num_comments = user.numTotalComments;
    const old_species_sighted = user.speciesSighted ?? [];


    //update species with the new species in the post
    const existingPostWithSpecies = await db.collection("posts").countDocuments({
        userID: userID,
        species: species,
        postID: { $ne: postID }  // exclude the post we just inserted
    });

// only add species to list if this is the first post with this species
    if (existingPostWithSpecies === 0) {
        old_species_sighted.push(species);
    }    
    const new_species = old_species_sighted;

    //update user with the new information (adding one post and one species)
    const user_result = await updateUser(db, userID, old_num_posts + 1, old_admin, old_num_comments, new_species);
    console.log("new_user_result =", user_result)

    return {
        postSuccess: result.acknowledged,
        userSuccess: user_result.acknowledged,
        postID: postID
    };
}

//finds a post in the db given the postID
async function findPost(db, postID) {
    const post = await db.collection("posts")
        .findOne({ postID: postID });

    return post;
}

// updates post by searching for postID through database -- admin only
async function updatePost(db, postID, userID, postTitle, species, description, sightingDate, sightingTime, sightingLocation) {
     // get old post to compare species before updating
    const oldPost = await db.collection("posts").findOne({ postID: postID });
    const oldSpecies = oldPost.species;
    
    const result = await db.collection("posts")
        .updateOne(
            //update based on postID
            { postID: postID },
            {
                $set: {
                    //all information from parameters
                    postID: postID,
                    userID: userID,
                    postTitle: postTitle,
                    species: species,
                    description: description,
                    sightingDate: sightingDate,
                    sightingTime: sightingTime,
                    sightingLocation: sightingLocation
                }
            },
            //do not insert new post, they are in the wrong section!
            { upsert: false }
        )
        // only update species list if species changed
    if (oldSpecies !== species) {
        const user = await findUser(db, userID);
        let speciesSighted = user.speciesSighted ?? [];

        // add new species if not already in list
        if (!speciesSighted.includes(species)) {
            speciesSighted.push(species);
        }

        // remove old species if no other posts use it
        const otherPostsWithOldSpecies = await db.collection("posts").countDocuments({
            userID: userID,
            species: oldSpecies,
            postID: { $ne: postID }
        });

        if (otherPostsWithOldSpecies === 0) {
            speciesSighted = speciesSighted.filter(s => s !== oldSpecies);
        }

        await updateUser(db, userID, user.numPosts, user.admin, user.numTotalComments, speciesSighted);
    }

    return result.modifiedCount === 1;
}

//this endpoint is linked to a button on the post that is only visible if you are logged
//in as the post creator
//user can update post information based on postid
app.get('/update-post/:postID', requiresLogin, async (req, res) => {
    const db = await Connection.open(mongoUri, wabanimals_db);
    const postID = parseInt(req.params.postID);
    //find post to update in the posts collection
    const post = await db.collection(POSTS).findOne({ postID: postID });

    if (!post) {
        req.flash('error', 'Post not found');
        return res.redirect('/home');
    }

    const currentUser = await findUser(db, req.session.username);
    const isAdmin = currentUser?.admin ?? false;

    //ensure that the logged in user is the same as the user id on the post
    //only post authors (and admin) can edit posts
    if (post.userID !== req.session.username && !isAdmin) {
        req.flash('error', 'You can only delete your own posts if you are not admin.');
        return res.redirect('/home;')
    }

    //render to update-post.ejs with updated information
    res.render('update-post', { post: post })
})


//this end point updates the post based on the form data
app.post('/update-post/:postID', requiresLogin, async (req, res) => {
    const db = await Connection.open(mongoUri, wabanimals_db);
    const postID = parseInt(req.params.postID);
    //find the post to update from the collection
    const post = await db.collection(POSTS).findOne({ postID: postID });
    //always use original author
    const originalUserID = post.userID;

    if (!post) {
        req.flash('error', 'Post not found');
        return res.redirect('/home');
    }

    const currentUser = await findUser(db, req.session.username);
    const isAdmin = currentUser?.admin ?? false;

    //make sure the logged in user is the same user who created the post
    if (post.userID !== req.session.username && !isAdmin) {
        req.flash('error', 'You can only update your own posts if you are not admin.');
        return res.redirect('/home;')
    }

    //collect info from the form
    const { title, species, location, time, date, description } = req.body;

    //make sure that all information is re-filledo ut
    if (!title || !species || !location || !time || !date || !description) {
        req.flash('error', 'All fields are required.');
        return res.redirect(`/update-post/${postID}`);
    }

    //update post with the new information
    const result = await updatePost(db, postID, originalUserID, title, species, description, date, time, location);

    if (result) {
        req.flash('info', 'Post updated successfully!');
    } else {
        req.flash('error', 'Could not update post.');
    }
    return res.redirect('/home');

})



//deletes post by postID and updates profile for the author - only for admin or post author
async function deletePost(db, postID) {
    //find the post to delete and store it
    const result = await db.collection("posts").findOne({ postID: postID });


    //delete the post
    const delete_result = await db.collection("posts").deleteOne({ postID: postID });


    //collect informaiton about author
    const userID = result.userID;
    const user = await findUser(db, userID);
    let old_num_posts = user.numPosts;
    const old_admin = user.admin;
    const old_num_comments = user.numTotalComments;
    const old_species_sighted = user.speciesSighted ?? [];

    // check if user has other posts with this species
    const otherPostsWithSpecies = await db.collection("posts").countDocuments({ 
        userID: userID, 
        species: result.species,
        postID: { $ne: postID }
    });

    //take away the species of the deleted post
    const new_species = otherPostsWithSpecies > 0 
        ? old_species_sighted 
        : old_species_sighted.filter(s => s !== result.species);
    
        //update the user profile, take away one post and one species
    const user_result = await updateUser(db, result.userID, Math.max(old_num_posts - 1,0), old_admin, old_num_comments, new_species);
    console.log("new_user_result =", user_result)

    //return true if one object was deleted
    return delete_result.deletedCount === 1;
}

//this end point deletes the post on the backend (only fo admin or post author)
app.post('/delete-post', requiresLogin, async (req, res) => {

    //make sure user is logged in
    if (!req.session.logged_in) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/home');
    }
    const db = await Connection.open(mongoUri, wabanimals_db);
    const postID = parseInt(req.body.postID);

    //find the post to delete based on the postid
    const post = await db.collection(POSTS).findOne({ postID: postID });

    const currentUser = await findUser(db, req.session.username);
    const isAdmin = currentUser?.admin ?? false;

    //only author can delete the post
    if (post.userID !== req.session.username && !isAdmin) {

        req.flash('error', 'You can only delete your own posts if you are not admin.');
        return res.redirect('/home');
    }
    //delete the post 
    const result = await deletePost(db, postID);
    if (result !== null) {
        req.flash('info', `Post number ${postID} deleted successfully.`);
    } else {
        req.flash('error', 'Could not delete post.');
    }
    return res.redirect('/home');
})


//inserts new user entry with the inputted parameters
async function insertNewUser(db, userID, hash, numPosts, admin, numTotalComments, speciesSighted) {
    const newUser = {
        //all info from parameters - posts and comments and species initialized to 0
        userID: userID,
        hash: hash,
        numPosts: numPosts,
        admin: admin,
        numTotalComments: numTotalComments,
        speciesSighted: speciesSighted
    }

    const result = await db.collection(USERS).insertOne(newUser);
    //return true and userid to make it easier to find later
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
        //search based on userid
        .updateOne({ userID: userID },
            {
                $set: {
                    //all information from the parameters 
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
    //search by userID
    const result = await db.collection("users").deleteOne({ userID: userID });

    //return true if one object was deleted
    return result.deletedCount === 1;
}

//upload form route
app.get("/upload", requiresLogin, (req, res) => {
    res.render("upload.ejs");
});


// increments the "likes" for a post and returns the entire updated post document
// This iversion uses findOneAndUpdate, updating and returning
// the update document in one operation.
async function likePost(postID, userID) {
    const db = await Connection.open(mongoUri, wabanimals_db);
    //check first if there is a post with the post ID 
    const post = await db.collection(POSTS).findOne({ postID });
    //returns null if there is no post
    if (!post) return null;
    //returns null if the post has already been liked by the user
    if (post.likedBy && post.likedBy.includes(userID)) {
        return null;
    }

    const result = await db.collection(POSTS).findOneAndUpdate(
        {
            postID: postID,
            likedBy: { $ne: userID }
        },
        {
            $inc: { likes: 1 }, //increment the number of likes shown on the post
            $addToSet: { likedBy: userID } //add to the likedBy array
        },
        
        {
            returnDocument: 'after'
        }
    );

    return result; 
}

//Ajax likes for posts, a POST route that calls the likePost helper function
// defined above in order to show post likes on the home page
app.post('/likeAjax/:postID', requiresLogin, async (req, res) => {
    if (!req.session.logged_in) {
        return res.json({ error: true, message: "Login required" });
    }

    const userID = req.session.username;
    const postID = Number(req.params.postID);

    const updated = await likePost(postID, userID);

    //post an error message if one of the two error cases is true (post already liked by user, or post does not exist)
    if (updated == null ) {
        return res.json({ error: true, message: "Already liked or post not found" });
    }

    return res.json({
        error: false,
        likes: updated.likes,
        postID: postID
    });
});

//COMMENTING
async function addComment(postID, userID, text) {
    const db = await Connection.open(mongoUri, wabanimals_db);
    const post = await db.collection(POSTS).findOne({ postID });
    //returns null if there is no post
    if (!post) return null;


    const comment = {
        userID: userID,
        text: text,
        createdAt: new Date()
    };

    const result = await db.collection(POSTS).findOneAndUpdate(
        { postID: postID },
        { $push: { comments: comment } },
        { returnDocument: 'after' }
    );

    return result;
}

//AJAX ENDPOINT COMMENTING 
app.post('/commentAjax/:postID', async (req, res) => {
    if (!req.session.logged_in) {
        return res.json({ error: true, message: "Login required" });
    }

    const userID = req.session.username;
    const postID = Number(req.params.postID);
    const text = req.body.text;

    const updated = await addComment(postID, userID, text);

    if (updated == null ) {
        return res.json({ error: true, message: "Comment failed" });
    }

    return res.json({
        error: false,
        comments: updated.comments,
        postID: postID
    });
});



//used for testing
async function main() {
    console.log('starting function check...\n');

    //load wabanimals database
    const wabanimals_db = await Connection.open(mongoUri, 'wabanimals');

    await counters.init(wabanimals_db.collection("counters"), "posts");

    console.log("counters initialized");

    await Connection.close();
}
main().catch(console.error);


//--------------------------- last --------------------------------

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function () {
    console.log(`open http://localhost:${serverPort}`);
});
