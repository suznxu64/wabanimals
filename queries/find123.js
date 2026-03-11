// File to find the person with nm 123
// Scott D. Anderson and Olivia Giandrea

const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');

const mongoUri = cs304.getMongoUri();

async function main() {
    let db = await Connection.open(mongoUri, 'wmdb');
    // here's the one line that does the query
    let results = await db.collection('people').find({nm: 123}).toArray();
    console.log('found', results.length, 'results');
    results.forEach((r) => console.log(r));
    await Connection.close();
    console.log('done');
}

main();
