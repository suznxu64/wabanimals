"use strict";

const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');

const mongoUri = cs304.getMongoUri();

//db = wabanimals, collections = posts/users/animals(?)
const myDBName = "wabanimals";

const sampleUser = {
    userID: "ai106@wellesley.edu",
    numPosts: 6,
    admin: true,
    numTotalComments: 7,
    speciesSighted: ["bunny", "hawk"]
}