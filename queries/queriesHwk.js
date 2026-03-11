// todo: replace myDBName with your username string ("og102", for example) in line 14
// todo: complete all query functions (1-11)
// todo: fill in the rest of the "main" function with calls to each respective query function and console.logs of their results
// todo: run this file to check your output with "node (filename.js)", replacing (filename.js) with your own file name

const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');
const { CHAR_0 } = require('picomatch/lib/constants');
const { ConnectionCheckOutStartedEvent } = require('mongodb');

const mongoUri = cs304.getMongoUri();

// REPLACE WITH YOUR OWN USERNAME ("og102", for example)
const myDBName = "sx106";

/* list the titles of all movies released in 2010 (sort by title)
  returns an array
*/
function find2010Movies(db) {
  let results = db.collection('movie').find({title: /\(2010\)$/}).sort({ title: 1 }).toArray();
  return results;
}

/* list the titles of all comedy movies released in 2010 (sort by title)
  returns an array
*/
function find2010Comedies(db){
  let results = db.collection('movie').find({title: /\(2010\)$/, genres: /Comedy/}).sort({ title: 1 }).toArray();
  return results;
}

/* list all the movies rated by user with id 610 (sorted by rating in descending order, then by movie title in ascending order alphabetically)
  returns an array
*/
function find610Ratings(db){
  let results = db.collection('ratings').find({userId: 610}).sort({rating: -1, title: 1}).toArray();
  return results;
}

/* computes and returns the average rating of The Princess Bride
*/
async function findAverageRating(db){
  let results = await db.collection('ratings').aggregate([
   { $match: { movieId: 1197 } },
   {
    $group: {
      _id: '$title',
      avgRating: { $avg: '$rating' }
    }
  }
  ]).toArray();
  return results[0].avgRating;
}

/* Returns the number of distinct movies rated
*/
async function countDistinctMovies(db){
  let results = await db.collection('ratings').distinct('title');
  return results.length;
}

/* Returns oldest person in the WMDB database.
*/
async function findOldestPerson(db){
  let results = await db.collection('people').find({birthdate: {$exists: true, $nin: [null, "0000-00-00"]}}).sort({ birthdate: 1 }).limit(1).toArray();
  return results[0];
}

/* Returns the movie with the longest cast.
*/
async function findLongestCast(db){
  let results = await db.collection('movies').aggregate([
    {
      $match: {
        cast: { $exists: true, $type: "array" }
      }
    },
    {
      $project: {
          title: 1,
          castLength: { $size: "$cast" } 
      }
    }, { $sort: { castLength: -1 } }, { $limit: 1 }    
  ]).toArray();
  return results[0];
}

/* Returns an array of movies that was released before 1990 (sorted by release year ascending, 
*  then by title ascending)
*/
async function findMoviesBefore1990(db){
  let results = await db.collection('movies').aggregate([
  {
    $match: {
      release: { 
        $ne: "0000",
        $exists: true
      }
    }
  },
  {
    $addFields: {
      releaseNum: { $convert: 
        {input: "$release", to: "int", onError: null, onNull: null}
      }
    }
  },
  {
    $match: {
      //the $gt: 1895 is there because that was when the first motion pictures were created
      releaseNum: { $ne: null, $ne: 0, $gt: 1895, $lt: 1990 }
    }
  },
  {
    $sort: {release: 1, title: 1}
  },
  {
    $project: {_id: 1, title: 1, release: "$releaseNum"}
  }
    
  ]).toArray();
  return results;
}

/* Inserts a pet (Yuzu) into the pets collections in my personal database.
* returns true when the request finished processing
*/
async function insertPet(db){
  const newPet = {
    name: "Yuzu",
    species: "cat",
    breed: "tuxedo",
    weight: 9,
    favToy: "tinsel ball"
  }
  const result = await db.collection("pets").insertOne(newPet);
  return result.acknowledged;
}

/* Searches the pets collections by name
* returns the document
*/
async function findPet(db, petName){
  const result = await db.collection("pets").findOne({name: petName});
  return result;
}

/* Updates the weight of a pet given by name.
* returns true when the request finished processing
*/
async function updatePet(db, petName, weightLb){
  const result = await db.collection("pets").updateOne({name: petName}, {$set: {weight: weightLb}});
  return result.acknowledged;
}

/* Deletes a pet from the document.
* returns true if the request is finished processing
*/
async function deletePet(db, petName){
  const result = await db.collection("pets").deleteOne({name: petName});
  return result.acknowledged;
}

/* Helper function that clears all of the pets in the pets document.
*/
async function clearPets(db) {
  await db.collection('pets').deleteMany({});
}

async function main() {
  console.log('starting function check...\n');

  //opens each database that is used
  const movie_lens_db = await Connection.open(mongoUri, 'movie_lens_db');
  const wmdb_db = await Connection.open(mongoUri, 'wmdb');
  const sx106_db = await Connection.open(mongoUri, 'sx106');
  //prints number of movies and the first one for q1
  q1 = await find2010Movies(movie_lens_db);
  console.log("find2010Movies:", q1.length, "movies found");
  console.log(q1[0])

  // fill in the rest of this main() function with calls to each respective query function
  // and appropriate console.logs of their results
  
  //print the number of movies and the first one for q2
  q2 = await find2010Comedies(movie_lens_db);
  console.log("find2010Comedies:", q2.length, "movies found");
  console.log(q2[0])

  //prints the number of movies and the first one for q3
  q3 = await find610Ratings(movie_lens_db);
  console.log("find610Ratings", q3.length, "movies found");
  console.log(q3[0])
  
  //prints the average rating that is found in q4
  q4 = await findAverageRating(movie_lens_db);
  console.log("findAverageRating: avg rating of The Princess Bride = ", q4);

  //prints the count that is found in q5
  q5 = await countDistinctMovies(movie_lens_db);
  console.log("countDistinctMovies:", q5, "distinct movies rated in the movie_lens_db" );

  //prints the oldest person (name and birthdate) in WMDB
  q6 = await findOldestPerson(wmdb_db);
  console.log("findOldestPerson: the oldest person in wmdb is", q6.name, ",born on", q6.birthdate);

  //prints the title of the movie with the longest cast and the length of the cast
  q7 = await findLongestCast(wmdb_db);
  console.log("findLongestCast:", q7.title, "has the longest cast of", q7.castLength, "people");

  //prints the number of movies and the first one (_id, title, release) found by q8
  q8 = await findMoviesBefore1990(wmdb_db);
  console.log("findMoviesBefore1990:", q8.length, "movies found with the release dates before 1990", q8[0]);

  //remove all from sx106_db function call
  await clearPets(sx106_db);
  
  //adds the pet
  q9 = await insertPet(sx106_db);
  console.log("insertPet:", q9);

  //prints the document
  q10 = await findPet(sx106_db, "Yuzu");
  console.log("findPet:", q10);

  //prints whether updatePet works and the updated pet
  q11 = await updatePet(sx106_db, "Yuzu", 12); 
  console.log("updatePet:", q11);
  var pet = await findPet(sx106_db, "Yuzu");
  console.log("find updated pet:", pet);

  //prints whether deletePet works and the document after the deletion
  q12 = await deletePet(sx106_db, "Yuzu");
  console.log("deletePet:", q12)
  pet = await findPet(sx106_db, "Yuzu");
  console.log("after delete:", pet);
  await Connection.close();
}

main().catch(console.error);
