self.addEventListener('message', function(e) {
  var data = e.data;

  var passGames = [];
  data.batch.forEach(function(appid, index, array){
    var checkGame = data.games[appid];
    var gamePass = true;
    // Check that the filter tags are inside this game's tags
    data.filters.forEach(function(filterTag, i, arr){
      gamePass = gamePass && checkGame.tags.indexOf(filterTag) > -1;
    });
    if (gamePass)
      passGames.push(checkGame);
  });
  self.postMessage(passGames);

}, false);
