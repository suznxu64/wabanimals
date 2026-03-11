"use strict";

// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');
const mongoUri = cs304.getMongoUri();

// ================================================================

/** returns titles of movies containing a substring. This is
 * asynchronous because it searches the database. It returns a promise
 * and the caller must use `await` or otherwise manage the promise.
 */

async function titleIncludesSubstring(db, substring) {
  const re = new RegExp(substring, "i");
  return db                 // identify database (in this case, a stored variable)
    .collection("movie")    // movie collection
    .find({title: re})      // find titles containing "og" substring
    .project({title: 1})    // only return "title" field in final array
    .sort({title: 1})       // sort title in ascending alphabetical order
    .toArray();             // convert data to array to work with it in nodejs
}

/** returns titles of movies containing a substring where the genres
 * also includes the given substring.  This is also asynchronous.
 */

async function searchTitleAndGenre(db, titleSubstring, genreSubstring) {
  const re1 = new RegExp(titleSubstring, "i");
  const re2 = new RegExp(genreSubstring, "i");
  return db                           // identify database (in this case, an argument)
    .collection("movie")              // use movie collection
    .find({title: re1, genres: re2})  // match titles and genres
    .project({title: 1, genres: 1})   // only return title and genre fields
    .sort({title: 1})                 // sort by title in ascending alphabetical order
    .toArray();                       // convert data to array to work with it in nodejs
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
      youngest = person; // if person is younger than the current best, replace the value
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
    .limit(1)                         // only return the "top field" 
    .toArray();                       // convert data to array to work with it in nodejs
    // data is returned in an array, so return the first (and only) element
  return youngest[0]; 
}

async function mostCredits(db) {
  // find person with most credits in wmdb
  const people = await db           // identify db (in this case, a stored variable)
    .collection("people")           // use people collection
    .find()                         // find all entries
    .project({name: 1, movies: 1})  // only return name and movies fields
    .toArray();                     // convert data to array to work with it in nodejs

  let longest = {name: "", movies_length: 0}; // starting value
  people.forEach(person => {                  // iterate over each found person
    if (person.movies !== undefined) {
      if (person.movies.length > longest.movies_length) { // if they're in more movies
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
    .toArray();                       // 

  const dateObj = new Date(dateString);
  const youngins = people.filter((person) => {
    return Date.parse(person.birthdate) > dateObj; // remove any people born before 2000
  });

  return youngins;
}

/** find all people in wmdb with NM >= given value. Asynchronous; returns a promise
 */

async function peopleMinId(db, minId) {
  return db                                       // define db (in this case, a stored variable)
    .collection("people")                         // use people collection
    .find({nm: {$gte: minId}})                    // find all people with nm >= minId
    .project({nm: 1, name: 1, birthdate: 1})      // only return nm, name and birthdate fields
    .toArray();                                   // 
}


/** find all movies with TT <= given value. Asynchronous; returns a promise.
 */

async function moviesMaxId(db, maxId) {
  return db                       // define db (in this case, a stored variable)
    .collection("movies")          // use movies collection
    .find({tt: {$lte: maxId}})      // find all entries with TT < maxId
    .project({title: 1, tt: 1})   // only return title and tt fields
    .toArray();                   // convert data to array to work with it in nodejs
}

async function bestMovies(db){
  return db
    .collection("movies")
    .find({release: 1995, })
    .project({})
}
async function main() {

    console.log('starting function check...\n');

    const movie_lens_db = await Connection.open(mongoUri, 'movie_lens_db');
    const q1 = await titleIncludesSubstring(movie_lens_db, "harry");
    console.log("titleIncludesSubstring:",
                q1.length, "harry movies found, such as", q1[0]);
    const q2 = await searchTitleAndGenre(movie_lens_db, "harry", "adventure");
    console.log("searchTitleAndGenre:",
                q2.length, "harry adventure movies found, such as", q2[0]);
    await Connection.close();

    console.log("\n");

    const wmdb = await Connection.open(mongoUri, 'wmdb');
    const q6 = await youngestPerson(wmdb);
    console.log("youngestPerson",
                "the youngest person in wmdb is " + q6.name + ", born on " + q6.birthdate);
    const q6mongo = await youngestPersonMongo(wmdb);
    console.log("youngestPersonMongo",
                "the youngest person is " + q6mongo.name + ", born on " + q6mongo.birthdate);
    const q7 = await mostCredits(wmdb);
    console.log("mostCredits ",
                q7.name + " has the longest credit list of " + q7.movies_length + " movies");
    const q8 = await peopleOlderThanDate(wmdb, '2000-01-01');
    console.log("peopleOlderThanDate:",
                q8.length, "people found with birthdates after 2000, such as", q8[0]);
    const q9greater = await peopleMinId(wmdb, 10000);  
    console.log("peopleMinId:",
                q9greater.length, "people found with nm > 10000, such as", q9greater[0]);
    const q9less = await moviesMaxId(wmdb, 5000);  
    console.log("maxId:",
                q9less.length, "movies found with tt < 5000, such as", q9less[0]);

  await Connection.close();

  console.log("\n");
  
}

main().catch(console.error);
