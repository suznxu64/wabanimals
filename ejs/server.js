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

//setting view engine to ejs
app.set("view engine", "ejs");

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

app.use(serveStatic('public'));

// ================================================================
// custom routes here

var visitCounter = 0;

// This is our simple Hello World example, this time, rendering a template
app.get('/', (req, res) => {
    let now = new Date();
    let time = now.toLocaleTimeString();
    visitCounter ++;
    return res.render('index.ejs', {visits: visitCounter, time: time});
});

function randomElt(array) {
    let index = Math.floor(array.length * Math.random());
    return array[index];
}

const ourHeroes = ['Harry', 'Ron', 'Hermione', 'Fred', 'George'];

function getUserId() {
    if( Math.random() > 0.5 ) {
        return null;
    } else {
        return randomElt(ourHeroes);
    }
}

app.get('/home', (req, res) => {
    let userId = getUserId();
    return res.render('home.ejs', {userId})
});

app.get('/heroes', (req, res) => {
    return res.render('list.ejs', {listDescription: 'Our Heroes',
                                   list: ourHeroes});
});

const ourHeroes2 = [{nm: 1, name: 'Harry'},
                    {nm: 2, name: 'Ron'},
                    {nm: 3, name: 'Hermione'},
                    {nm: 6, name: 'Fred'}, 
                    {nm: 7, name: 'George'}];
                    
var formData = {
                customer: "Hermione",
                phone: "3249",
                email: "hgranger@hogwarts.ac.uk",
                size: "small",
                crust: "thin",
                due: "20:00",
                instructions: "deliver by owl"
                };

app.get('/hermione', (req, res) => {
    return res.render('hermione.ejs', {customerInfo: 'Hermione',
                                        list: formData});
});

app.get('/heroes2', (req, res) => {
    return res.render('list2.ejs', {listDescription: 'Our Heroes',
                                   list: ourHeroes2});
});

app.get('/main', (req, res) => {
    return res.render('main.ejs', {title: 'MyApp: Main Page'})
});

app.get('/contact', (req, res) => {
    return res.render('contact.ejs', {title: 'MyApp: Contact Us'})
});

// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`listening on ${serverPort}`);
    console.log(`visit http://cs.wellesley.edu:${serverPort}/`);
    console.log(`or http://localhost:8080`);
    console.log('^C to exit');
});
