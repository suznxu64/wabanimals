const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(flash());
app.set('view engine', 'ejs');

const { Connection } = require('./connection.js');
const cs304 = require('./cs304');

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

const mongoUri = cs304.getMongoUri();
const DBNAME = "og102";
const STAFF = "staff";

app.use(cookieSession({
  name: 'session',
  keys: [cs304.randomString(20)],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

app.get("/", (req, res) => {
    // use these defaults if cart isn't in the session
    let cart = req.session.cart || {'beer': 0, 'wine': 0, 'soda': 0};
    let showCart = req.session.showCart || 'yes';
    console.log('showCart', showCart);
    console.log('cart', JSON.stringify(cart));
    return res.render("cart.ejs", {cart, showCart}); 
});

const RESTRICTED = ['beer', 'wine'];

app.post('/add', (req, res) => {
    let item = req.body.item;
    let ofAge = req.session.ofAge || 'no';
    let cart = req.session.cart || {'beer': 0, 'wine': 0, 'soda': 0};
    if(ofAge == 'no' && RESTRICTED.indexOf(item) != -1 ) {
        console.log('refused');
        req.flash('error', 'Sorry, you are not of age');
    } else {
        console.log('ordering', item);
        cart[item] += 1;
        req.session.cart = cart; // store back into session
        req.flash('info', `Thank you for buying a glass of ${item}`)
    }
    // Use POST-REDIRECT-GET to avoid double-ordering
    return res.redirect('/');
});

app.post('/hideCart', (req, res) => {
    req.session.showCart = 'no';
    req.flash('info', 'hiding cart');
    return res.redirect('/');
})
    
app.post('/showCart', (req, res) => {
    req.session.showCart = 'yes';
    req.flash('info', 'showing cart');
    return res.redirect('/');
})
    
app.post('/clearCart', (req, res) => {
    req.session.cart = {'beer': 0, 'wine': 0, 'soda': 0};
    req.session.ofAge = 'no';
    req.flash('info', 'cleared cart');
    return res.redirect('/');
})

app.post('/ofAge', (req, res) => {
    req.session.ofAge = 'yes';
    req.flash('info', 'you are of age');
    return res.redirect('/');
})

const serverPort = cs304.getPort(8080);

app.listen(serverPort, function () {
    console.log(`http://localhost:${serverPort}/`);
});
