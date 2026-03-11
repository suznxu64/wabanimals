// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');
const mongoUri = cs304.getMongoUri();

async function getAverageRatingMongo(db, movieTitle) {
  const averageRating = await db.collection("ratings").aggregate([
      { $match: { 'title': movieTitle } },
      {
          $group: {
              _id: '$title',
              avgRating: { $avg: '$rating' },
          },
      },
  ]).toArray(); // convert data to array to work with it in nodejs
    console.log('result', averageRating);
  return averageRating[0].avgRating;
}

async function main() {

    console.log('starting function check...\n');
    
    const db = await Connection.open(mongoUri, 'movie_lens_db');

    let avg = await getAverageRatingMongo(db, "Toy Story (1995)");
    console.log('avg', avg);
  await Connection.close();

}

main().catch(console.error);

