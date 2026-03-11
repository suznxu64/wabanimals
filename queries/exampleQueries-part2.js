"use strict";

// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');
const mongoUri = cs304.getMongoUri();

// ================================================================

/* Return the rating by give user of given movie.
 */

function ratingByUser(db, uid, title) {
  return db                           // identify database (in this case, a stored variable)
    .collection("ratings")            // use ratings collection
    .find({userId: uid, title: title}) // find all entries with given userId and title
    .project({rating: 1})            // only return rating field
    .toArray();                       // convert data to array to work with it in nodejs
}

/** return title and rating of all movies rated by given uid. Descending order by rating.
 */

function titleAndRatingByUser(db, uid) {
  return db                           // identify database (in this case, a stored variable)
    .collection("ratings")            // use ratings collection
    .find({userId: uid})              // find all entries with give userId
    .project({title: 1, rating: 1})   // only return title and rating fields
    .sort({rating: -1})               // sort by rating field desc (highest to lowest)
    .toArray();                       // convert data to array to work with it in nodejs
}

/** return the average rating of an array of movies. Returns null for empty array. Synchronous. 
 */

// I created this helper and re-coded.

function averageRating(movieArray) {
    let len = movieArray.length;
    if(len === 0) return null;
    let sum = 0;
    movieArray.forEach(m => sum += m.rating);
    return sum/len;
}

/** Return average rating for given movie title. Fetches all data and computes average locally.
 */

async function getAverageRating(db, movieTitle) {
  const ratings = await db     // identify database (in this case, a stored variable)
    .collection("ratings")     // use ratings collection
    .find({title: movieTitle}) // find movie with title === "Godfather, The (1972)"
    .project({rating: 1})      // only return rating field
    .toArray();                // convert data to array to work with it in nodejs
  
    let val = averageRating(ratings);
    console.log('val', val); // a number here
    return val; // return val is a promise; caller must use await
}

/** Return average rating for given movie title. Computes average in the database server.
 */

async function getAverageRatingMongo(db, movieTitle) {
  const avgRating = await db.collection("ratings").aggregate([
    {
      $group: {
        _id: '$title',
        avgRating: { $avg: '$rating' },
      },
    },
    { $match: { _id: movieTitle } },
  ]).toArray(); // convert data to array to work with it in nodejs
  return avgRating[0].avgRating;
}

/** return the number of different (distinct) users who rated movies
 * in the movie_lens_db
 */

async function countDistinctRaters(db) {
  const result = await db   // identify db to work with (in this case, a stored variable)
    .collection("ratings")  // use ratings collection
    .distinct("userId");  // select only unique values of userId field
  return result.length; // return count of unique userIds
}

/** return the number of ratings for a particular movie title. 
 */

async function countRatingsOfMovie(db, movieTitle) {
  // find the count of ratings (NOT DISTINCT) of a certain movie in the movie_lens_db 
  const result = await db                 // identify db to work with (in this case, a stored variable)
    .collection("ratings")                // use ratings collection
    .countDocuments({title: movieTitle}); // select only values with specified title

  return result; // return count of how many times this movie has been rated
}

/** Finds the youngest person in the WMDB collection. Computes locally in Node.js 
 */

async function youngestPerson(db) {
  // find the youngest actor in the wmdb database's people collection
  const people = await db               // identify db (in this case, a stored variable)
    .collection("people")               // use people collection
    .find()                             // find all entries
    .project({name: 1, birthdate: 1})   // only return name and birthdate fields
    .toArray();                         // convert data to array to work with it in nodejs
  let youngest = {name: "", birthdate: '01-01-1800'}; // set arbitrary "oldest" birthdate

  people.forEach(person => {
    // iterate over each person in found people
    if (Date.parse(person.birthdate) > Date.parse(youngest.birthdate)) {
      youngest = person; // if person is younger than the current "youngest" birthdate, replace the value
    }
  }) 

  return youngest;
}

/** Finds the youngest person in the WMDB collection. Computes in
 * Mongo and just gets one.
 */



async function youngestPersonMongo(db) {
  // find the youngest person in the wmdb database's people collection
  const youngest = await db           // identify db (in this case, a stored variable)
    .collection("people")             // use people collection
    .find()                           // find all entries
    .project({name: 1, birthdate: 1}) // only return name and birthdate fields
    .sort({birthdate: -1})            // sort by birthdate descending (most to least recent)
    .limit(1)                         // only return the "top field" (in this case, the most recent birthdate/youngest person)
    .toArray();                       // convert data to array to work with it in nodejs
  return youngest[0]; // data is returned in an array, so return the first (and only) element
}

async function mostCredits(db) {
  // find person with most credits in wmdb
  const people = await db           // identify db (in this case, a stored variable)
    .collection("people")           // use people collection
    .find()                         // find all entries
    .project({name: 1, movies: 1})  // only return name and movies fields
    .toArray();                     // convert data to array to work with it in nodejs

  let longest = {name: "", movies_length: 0}; // select arbitrary "longest" cast length (smallest possible number -> 0)
  people.forEach(person => {                  // iterate over each found person
    if (person.movies !== undefined) {
      if (person.movies.length > longest.movies_length) { // if they're in more movies than the current stored "longest" casting list
        longest.name = person.name;                       // replace longest
        longest.movies_length = person.movies.length;
      }
    }
  }) 

  return longest;
}

async function peopleOlderThanDate(db, dateString) {
  // find all people in wmdb born after dateString 
  const people = await db             // define db (in this case, a stored variable)
    .collection("people")             // use people collection
    .find()                           // find all entries
    .project({name: 1, birthdate: 1}) // only return name and birthdate fields
    .toArray();                       // convert data to array to work with it in nodejs

  dateObj = new Date(dateString);
  let youngins = people.filter((person) => {
    return Date.parse(person.birthdate) > dateObj; // remove any people born before 2000
  });

  return youngins;
}

/** find all people in wmdb with NM >= given value
 */

function peopleMinId(db, minId) {
  return db                                       // define db (in this case, a stored variable)
    .collection("people")                         // use people collection
    .find({nm: {$gte: minId}})                    // find all people with nm >= minId
    .project({nm: 1, name: 1, birthdate: 1})      // only return nm, name and birthdate fields
    .toArray();                                   // convert data to array to work with it in nodejs
}

/** find all movies with TT <= given value
 */

function moviesMaxId(db, maxId) {
  // find all movies in wmdb with tt less than maxId
  return db                       // define db (in this case, a stored variable)
    .collection("movie")          // use movie collection
    .find({tt: {$lt: num}})      // find all entries with TT < maxId
    .project({title: 1, tt: 1})   // only return title and tt fields
    .toArray();                   // convert data to array to work with it in nodejs
}

async function insertEntry(db) {
  // insert a family member into your own collection

  // insert one into stored db value (from parameter) and family collection
  const result = await db.collection("family").insertOne( 
    {
      name: "Joseph Giandrea", 
      birthday: new Date("2003-09-26"),
      favoriteColor: "Black",
      relation: "Little Brother",
      height: 180
    }
  );
  return result.acknowledged; // return whether insertion was successful (boolean)
}

async function updateEntry(db) {
  // your baby brother has grown since you last saw him! :')
  // update the object in your own collection by increasing his height

  // update entry with name === "Joseph Giandrea" into stored db value (from parameter) and family collection
  const result = await db.collection("family").updateOne( 
    { name : "Joseph Giandrea" },
    { $set: { height : 190 } }
  );
  return result.acknowledged; // return whether updating was successful (boolean)
}

async function deleteEntry(db) {
  // your little brother is shy, and doesn't want his info out on the internet.
  // delete your brother's object from your own collection
  
  // delete entry with name === "Joseph Giandrea" from stored db value (from parameter) and family collection
  const result = await db.collection("family").deleteOne({ name : "Joseph Giandrea" }); 
  return result.acknowledged; // return whether deletion was successful (boolean)
}


async function main() {

    console.log('starting function check...\n');

    const movie_lens_db = await Connection.open(mongoUri, 'movie_lens_db');
    const movie1 = "Toy Story (1995)";
    const movie2 = "Godfather, The (1972)";
    const rater1 = 44;

    const q1 = await ratingByUser(movie_lens_db, rater1, movie1)
    console.log(`User ${rater1} rated ${movie1}:`, q1[0]);
    const q2 = await ratingByUser(movie_lens_db, rater1, movie2)
    console.log(`User ${rater1} rated ${movie2}:`, q2[0]);
    const q3 = await titleAndRatingByUser(movie_lens_db, 44);
    console.log("titleAndRatingByUser:", q3.length, "movies found", q3[0]);
    const q4 = await getAverageRating(movie_lens_db, movie2);
    console.log(`getAverageRating: avg rating of ${movie2}`, q4);
    const q4mongo = await getAverageRatingMongo(movie_lens_db, movie1)
    console.log(`getAverageRatingMongo: avg rating of ${movie2}`, q4mongo);
    const q5 = await countDistinctRaters(movie_lens_db);
    console.log("countDistinct:", q5, "distinct users found");
    const q5extra = await countRatingsOfMovie(movie_lens_db, movie2);
    console.log("countRatings:", q5extra, `ratings for ${movie2} found`);
    await Connection.close();

    console.log("\n");

    const my_db = await Connection.open(mongoUri, 'og102');
    const q10 = await insertEntry(my_db);
    console.log("insertEntry:", q10);
    const q11 = await updateEntry(my_db);
    console.log("updateEntry:", q11);
    const q12 = await deleteEntry(my_db);
    console.log("deleteEntry:", q12);
    console.log("deleting family collection...");
    await my_db.collection("family").drop();
    await Connection.close();

}

main().catch(console.error);
