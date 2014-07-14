var express = require('express');
var app = express();
var path = require('path');
var port = process.env.PORT || 8080;
var passport = require('passport');
var flash = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');

require('./config/passport')(passport); // pass passport for configuration

// Setup the express app
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());

app.set('view engine', 'ejs'); // Templating

// Passport setup over this
app.use(session({ secret: 'derpaderpa' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// Setup the routes, yo
var routes = require('./app/routes.js')(app, passport); // Pass the app to the routes, I guess?

// Setup
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port);
console.log('Server listening on port ' + port);
