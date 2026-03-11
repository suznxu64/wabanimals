const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');

// our modules loaded from cwd

const { Connection } = require('./connection');
const cs304 = require('./cs304');

// Create and configure the app

const app = express();

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

app.use(serveStatic('public'));

// ===== Section: custom routes here

app.get('/', (req, res) => {
    return res.send('App to Look up World Capitals');
});

// Here's a tiny database of countries and their capitals

capitals = {Canada: 'Ottowa',
            China: 'Beijing',
            France: 'Paris',
            India: 'New Delhi',
            Nigeria: 'Abuja',
            US: 'Washington, D. C.',
            Japan: 'Tokyo',
            Peru: 'Lima'};


app.get('/all', (req, res) => {
    let page = '<h1>All Capitals</h1>';
    Object.keys(capitals).forEach( country => {
        let city = capitals[country];
        page += `<p>${city} is the capital of ${country}</p>`;
    });
    res.send(page);
});

app.get('/capital/:country', (req, res) => {
    let country = req.params.country;
    let page = '<h1>Capital</h1>';
    if (!(country in capitals)){
        page += `<p>This country is not in our database</p>`;
    }
    else{
        let city = capitals[country];
        page += `<p>${city} is the capital of ${country}</p>`;
    }
    res.send(page);
    
});    

app.get('/sqrt/4', (req, res) =>{
    let input = parseFloat(req.params.num);
    let page = '<h1>What is the square root of 4?</h1>';
    if(input < 0){
        return res.json({
            error: "Cannot take square root of a negative number"
        });
    } else{
        let root = Math.sqrt(4);
        page += `<p>It is ${root}!</p>`;
    }
    res.send(page);

});

app.get('/capitals/capitalize', (req, res) =>{
    let page = '<h1>CAPITALS</h1>';
    Object.keys(capitals).forEach( country => {
        let cityCap = capitals[country].toUpperCase();
        page += `<p>${cityCap} is the capital of ${country}</p>`;
    });
    res.send(page);

}
)

// ===== Section: postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`listening on ${serverPort}`);
    console.log(`visit http://cs.wellesley.edu:${serverPort}/`);
    console.log('^C to exit');
});
