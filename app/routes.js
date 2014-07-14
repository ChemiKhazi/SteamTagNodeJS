var fetch_library = require('./fetch_library');
var fetch_games = require('./fetch_games');

module.exports = function(app, passport) {

  // Home page
  app.get('/', function(req, res){
    res.render('browser.ejs', {user:req.user});
  });

  app.get('/library/:steamid', fetch_library);
  app.get('/games/:appids/:steamid?', fetch_games);

  // "Login"
  app.post('/login', passport.authenticate('local'), function(req, res){
    res.redirect('/library/' + req.user.steamid);
  });

  // Steam authentication link
  app.get('/login/steam', passport.authenticate('steam'),
    function(req, res){
      res.redirect('/');
  });

  app.get('/steam', passport.authenticate('steam', { failureRedirect: '/' }),
  function(req, res) {
    console.log(req.user.steamid);
    res.redirect('/');
  });

  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });
};

var isLoggedIn = function(req, res, next) {
  if (req.isAuthenticated())
    return next();
  res.redirect('/');
}
