var fetch = require('./fetch_handler');
var request = require('request');
var fs = require('fs');
var scrape_conf = require('../config/scrape')

var scrapeGameData = function(params, appid, api_obj, callback){

  var gameData = {
    appid : api_obj[appid].data.steam_appid,
    name : api_obj[appid].data.name,
    header : api_obj[appid].data.header_image
  }

  var newFetch = false;

  var jsonPath = scrape_conf.DataPath + appid + '.json';

  if (fs.existsSync(jsonPath)){
    fs.stat(jsonPath, function(err, stats){
      if (err){
        newFetch = true;
      }
      else{
        // Check if expired
        var lastModified = new Date(stats.mtime) - Date.now();
        var expireCheck = new Date(0);
        if (scrape_conf.ExpireDays !== undefined)
          expireCheck.setDate(scrape_conf.ExpireDays + 1);
        if (scrape_conf.ExpireHours !== undefined)
          expireCheck.setHours(scrape_conf.ExpireHours);

        // Expired, please fetch new copy
        if (lastModified > expireCheck)
          newFetch = true;
      }
    });
  }
  else{
    newFetch = true;
  }

  if (newFetch){
    // This function calls the callback...
    runPageScrape(appid, gameData, callback);
  } else {
    // Use data from file cache, read file
    fs.readFile(jsonPath, function(err, data){
      if (err) // Any error, send back error
        callback({appid: appid, error: true});
      else {
        // Send tag data back using file data
        var tagArray = JSON.parse(data);
        gameData.tags = parseGameTags(tagArray);
        callback({
          appid: appid,
          gamedata: gameData,
          tags: tagArray
        });
      }
    });
  }
};

var runPageScrape = function(appid, gameData, callback){
  console.log("Starting scrape for " + appid);
  if (fs.existsSync(scrape_conf.DataPath) == false)
    fs.mkdirSync(scrape_conf.DataPath);

  var url = 'http://store.steampowered.com/app/' + appid;

  // Construct a new cookie jar for the scraper to get around age verification
  var cookieJar = request.jar();
  var cookieBirth = request.cookie('birthtime=0');
  cookieJar.setCookie(cookieBirth, url);

  request({
    url : url,
    headers : {'Accept-language' : 'en'},
    jar : cookieJar
  },
    function(error, response, body){
      if (error || response.statusCode >= 400)
        callback({appid: appid, error: true}); // any errors, give up
      else{
        // Now we can do a dumb scrape of the HTML for the tags on this game
        body = body.substring(body.indexOf('InitAppTagModal('));
        var open = body.indexOf('[');
        var close = body.indexOf(']');
        var gameTags = body.substring(open, close + 1);

        // This would scrape the user's added tags except I need a login hash
        // thing and I cannot get that. Going to have to wait for a proper API
        // I guess.

        // body = body.substring(close+1);
        // open = body.indexOf('[');
        // close = body.indexOf(']');
        // var userTags = body.substring(open, close + 1);

        var tagArray = JSON.parse(gameTags);
        gameData.tags = parseGameTags(tagArray);

        var tagPath = scrape_conf.DataPath + appid + '.json';
        fs.writeFile(tagPath, gameTags, function(err){
          if (err)
            console.log(err);
        });

        callback({
          appid: appid,
          gamedata: gameData,
          tags: tagArray
        });
      }
  });
}


var parseGameTags = function(tagArray){
  var tags = [];
  for (var i = 0; i < tagArray.length; i++) {
    tags.push(tagArray[i].tagid);
  }
  return tags;
};

var processTagList = function(allTags, gameTags, appid){

  // Loop through the tag list from one game...
  for (var i = 0; i < gameTags.length; i++) {
    var checkTag = gameTags[i];

    // Try to find it in the all tags list
    var matchTag = null;
    for (var y = 0; y < allTags.length; y++){
      if (allTags[y].tagid == checkTag.tagid){
        matchTag = allTags[y];
        break;
      }
    }

    // Couldn't find, add it to all tags list
    if (matchTag === null){
      matchTag = checkTag;
      matchTag.games = [];
      allTags.push(matchTag);
    }

    // And then add the game to the tag
    matchTag.games.push(appid)
  }

  return allTags;
}

var requestHandler = function(req, res){
  console.log("Fetching data for " + req.params.appids);
  // First hit the app API for details on the game
  fetch(req, res, {
    url: 'http://store.steampowered.com/api/appdetails',
    qs: { appids: req.params.appids }
  }, function(response, body){

      // store the result from the app API...
      var api_obj = JSON.parse(body);

      // Get the array of ids being scraped
      var id_list = req.params.appids.split(',');

      // Data handleAppScrapred will manipulate, closures are weird
      var tag_array = [];
      var games_array = [];
      var remove_array = [];
      var scrapes_returned = id_list.length;

      // Setup the closure that will recieve the scraped data
      var handleScrapeComplete = function(scrapeResponse){
        // Countdown on data scraped
        scrapes_returned--;

        // There was an error in scraping, throw app id into remove array
        if (scrapeResponse.error !== undefined){
          remove_array.push(scrapeResponse.appid);
        }
        else{
          games_array.push(scrapeResponse.gamedata);
          tag_array = processTagList(tag_array,
                                    scrapeResponse.tags,
                                    scrapeResponse.appid);
        }

        // All data recieved, finally return the data
        if (scrapes_returned == 0)
        {
          res.json({
            games: games_array,
            tags: tag_array,
            remove: remove_array
          })
        }
      }

      // Loop through the app ids and run the scraper function
      for (var i = 0; i < id_list.length; i++) {
        var appid = id_list[i].trim();
        var doRemove = true; // assume the worst, you pessimist

        // Check the API said it was a success
        if (api_obj[appid].success) {
          // Only run scrapeGameData if the appid and the API appid is the same
          if (appid == api_obj[appid].data.steam_appid) {
            scrapeGameData(req.params, appid, api_obj, handleScrapeComplete);
            doRemove = false;
          }

          // If not same, the app has multiple entries in steam and canonical
          // appid is the one in the API data. Skip scraping this appid, canonical
          // data will likely be retrieved by user in a later pass through library
        }

        if (doRemove)
        {
          remove_array.push(appid);
          scrapes_returned--; // Remove one from scrape counter
        }
      } // End id loop
  });
}

module.exports = requestHandler;
