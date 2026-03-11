// todo: replace myDBName with your username string ("og102", for example) in line 14
// todo: complete all query functions (1-11)
// todo: fill in the rest of the "main" function with calls to each respective query function and console.logs of their results
// todo: run this file to check your output with "node (filename.js)", replacing (filename.js) with your own file name

const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');

const mongoUri = cs304.getMongoUri();

// REPLACE WITH YOUR OWN USERNAME ("og102", for example)
const myDBName = "og102";

/* list the titles of all movies released in 2010 (sort by title)
  returns an array
*/
function find2010Movies(db) {
  return [];
}

async function main() {
  console.log('starting function check...\n');

  const movie_lens_db = await Connection.open(mongoUri, 'movie_lens_db');
  q1 = await find2010Movies(movie_lens_db);
  console.log("find2010Movies:", q1.length, "movies found");

  // fill in the rest of this main() function with calls to each respective query function
  // and appropriate console.logs of their results
  
  await Connection.close();
}

main().catch(console.error);
