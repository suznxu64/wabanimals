"use strict";

const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');

const mongoUri = cs304.getMongoUri();


//db = wabanimals, collections = posts/users/animals(?)
const myDBName = "wabanimals";

const samplePost = {
    postID: "7276",
    userID: "ai106@wellesley.edu",
    image: "bunny.jpeg",
    title: "Cute Bunny",
    species: "bunny",
    numComments: 3,
    numLikes: 19,
    datePosted: 3/12/2026,
    timePosted: "21:31",
    location: "Sev Green"
}