var LocalStrategy = require('passport-local').Strategy;
var SteamStrategy = require('passport-steam').Strategy;
var Auth          = require('../config/auth');

module.exports = function(passport){

  passport.serializeUser(function(user, done){
    done(null, user.steamid);
  });

  passport.deserializeUser(function(id, done){
    done(null, {steamid:id});
  });

  // This really is just a pass through for local sign in,
  // I only care about the steam id
  passport.use('local', new LocalStrategy(Auth.Local,
    function(steamid, ignoreThePassword, done){
      return done(null, {steamid:steamid});
    })
  );

  // Steam login gets extra data passed back from the Steam servers, yay
  passport.use('steam', new SteamStrategy(Auth.Steam,
    function(identifier, profile, done){
      var user = {
        steamid : identifier.substring(identifier.lastIndexOf('/') + 1)
      }
      return done(null, user);
    })
  );
};
