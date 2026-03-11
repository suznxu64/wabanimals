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

// ====== Section: routes

app.get('/', (req, res) => {
  res.render('page.ejs', { activePage: 'home' });
});

app.get('/about', (req, res) => {
  res.render('page.ejs', { activePage: 'about' });
});

app.get('/contact', (req, res) => {
  res.render('page.ejs', { activePage: 'contact' });
});


//  ========= Section: postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`listening on ${serverPort}`);
    console.log(`visit http://cs.wellesley.edu:${serverPort}/`);
    console.log(`or http://localhost:8080`);
    console.log('^C to exit');
});
