var auth = require('../config/auth');
var fetch = require('./fetch_handler');

module.exports = function(req, res){
  console.log("Processing library request for steamid " + req.params.steamid)
  // Proxy API
  fetch(req, res, {
    url: 'http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/',
    qs : {
      key: auth.Steam.apiKey,
      steamid: req.params.steamid,
      include_played_free_games: true,
      include_appinfo: true,
      format: 'json'
    }
  }, function(response, body) {
      res.type('application/json');
      res.send(body);
  });
}
