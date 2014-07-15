var $TagData = {};
var $GameData = {};
var $GameList = $("#game-list");
var $TagList = $("#tag-list");
var $GamePopup = $("#game-popup");
var $GamesStats = $('#games-stats');
var $State = {};
var $Search = {
  games : {},
  resGames : { list:[], index:-1 },
  tags : {},
  resTags : { list:[], index:-1}
};

var initPage = function()
{
  $('#games-clear').click(function(e){resetFocus(); $('#games-search').val(''); e.preventDefault();});
  $('#tag-link').click(highlightGameTags);
  $('#tag-consolidate').click(function(e){consolidateTags(); e.preventDefault();});
  $('#tag-clear').click(function(e){resetFocus(); $State.filterTags = []; e.preventDefault();});

  $('#ref-lib').click(function(e){fetchLibrary(localStorage.getItem('steam-id')); e.preventDefault();});
  $('#clear-data').click(function(e) {
                localStorage.clear();
                $TagList.empty();
                $GameList.empty();
                $('#step1').show();
                $('#step2').hide();
                $('#step3').hide();
              });

  $GamePopup.hide();
  $State.expectedBatches = -1;

  $('#games-search').prop('disabled', true)
                    .blur(function(e) {resetFocus()});
  $('#tag-search').prop('disabled', true);

  $('#step1').hide();
  $('#step2').hide();
  $('#step3').hide();

  var about = $('#about');
  $('#open-about').click(function(e){
    about.minimodal({clickClose:true, fade: true, duration: 200});
    e.preventDefault();
  });

  setupSearch();

  // Load data if available
  gameString = localStorage.getItem("GameData");
  if ((gameString === null))
  {
    $('#step1').show();

    var idForm = $('#steam-id');
    if (idForm.length > 0) {
      fetchLibrary(idForm.val());
    }
    else {
      $('#welcome').minimodal({width:200,
                              height: 250,
                              fade: true,
                              opacity: 0.75,
                              duration: 2000});
    }
  }
  else
  {
    $GameData = JSON.parse(localStorage.getItem("GameData"));
    $TagData = JSON.parse(localStorage.getItem("TagData"));
    for (var appid in $GameData)
    {
      setupGameEntry(appid);
    }
    for (var tagid in $TagData)
    {
      setupTagEntry(tagid);
    }
    bindDataToSearch();
    $('#step3').show();
  }
};

var clearData = function()
{

};

var refreshData = function()
{

};

var bloodhoundHandler = function(e) {

  var navigateResults = function(keycode) {
    // Check if results navigation is valid
    if (keycode != 40 && keycode != 38)
      return false;
    if (e.data.list.length == 0)
      return false;

    // Navigate the results list
    if (keycode == 40)
      e.data.index++;
    else if (keycode == 38)
      e.data.index--;
    // Cap index to results
    if (e.data.index < 0)
      e.data.index = e.data.list.length - 1;
    else if (e.data.index >= e.data.list.length)
      e.data.index = 0;

    return true;
  }

  var resultsValue = function() {
    if (e.data.index < 0)
      return null;
    if (e.data.list.length == 0)
      return null;
    return e.data.list[e.data.index];
  }

  if (e.keyCode == 27) {
    e.data.list = [];
    e.data.index = -1;
    e.data.close(e);
    return;
  }
  if (e.keyCode == 13) {
    var res = resultsValue();
    if (res != null)
    {
      e.data.select(e, res);
      return;
    }
  }
  if (navigateResults(e.keyCode)) {
    e.data.focus(e, resultsValue());
    return;
  }

  var searchTerm = $(this).val();
  if (searchTerm !== undefined)
  {
    e.data.engine.get(searchTerm, function(suggestions){
      e.data.list = suggestions;
      e.data.index = -1;
      e.data.response(e, suggestions);
    });
  }
};

var setupSearch = function()
{
  var tokenizer = function(d){
    return Bloodhound.tokenizers.whitespace(d.label);
  }

  $Search.games = new Bloodhound({
    name : 'Game Search',
    datumTokenizer : tokenizer,
    queryTokenizer : Bloodhound.tokenizers.whitespace,
    local : [],
    limit: 0,
  });

  $Search.gameHandler =
    new Bloodhound_Handler({
      element: $('#games-search'),
      engine: $Search.games,
      close: function(e){
        e.target.value = "";
        e.target.blur();
        resetFocus();
        $('.games').removeClass('highlighted softfocus unfocused');
      },
      select: function(e, data){
        e.target.value = "";
        e.target.blur();
        resetFocus();
        e.data = data.value;
        setSelectedGame(e);
      },
      focus: function(e, data){
        e.target.value = data.label;
        $('.game.highlighted').removeClass('highlighted').addClass('softfocus');
        var focusItem = $('#appid'+data.value)
        focusItem.removeClass('unfocused softfocus').addClass('highlighted');
        $('html, body').animate({scrollTop: focusItem.offset().top - 50}, 100);
      },
      response: function(e, datums){
        if (e.target.value.length == 0){
          $('.games').removeClass('highlighted softfocus unfocused');
          $GamesStats.html("");
          return;
        }
        // Scroll to top
        $('html, body').animate({scrollTop: 0}, 100);
        $('.game').removeClass('highlighted softfocus').addClass('unfocused');
        console.log(datums.length);
        for (var i = (datums.length - 1); i > -1; i--){
          $('#appid' + datums[i].value)
            .prependTo($GameList)
            .removeClass('unfocused')
            .addClass('highlighted');
        }
        $GamesStats.html("Found " + datums.length + " titles");
      }});

  $Search.tags = new Bloodhound({
    name : 'Tag Search',
    datumTokenizer : tokenizer,
    queryTokenizer : Bloodhound.tokenizers.whitespace,
    local : [],
    limit: 0,
  });

  $('#tag-search').on('keyup', {
      engine: $Search.tags, list: [], index: -1,
      close: function(e){
        if ($State.filterTags.length == 0)
          resetFocus();
      },
      select: function(e, data){
        e.target.value = "";
        $State.filterTags = [$TagData[data.value]];
        filterByTags();
        consolidateTags();
        event.preventDefault();
      },
      focus: function(e,data){
        e.target.value = data.label;
        $('.tag.highlighted').removeClass('highlighted');
        $('#tag'+data.value).addClass('highlighted');
        $('.game').addClass('unfocused');
        var tag = $TagData[data.value];
        tag.games
            .forEach(function(appid, index, array){
              $('#appid'+appid).removeClass('unfocused').prependTo($GameList);
            });
        var str = tag.games.length + ' games in tag';
        if (tag.games.length == 1)
          str = tag.games.length + ' game in tag';
        $GamesStats.html(str);
        e.preventDefault();
      },
      response: function(e, datum){
        $State.filterTags = [];
        var tagArray = [];
        datum.forEach(function(value, index, array){
          tagArray.push(value.value);
        });
        highlightTags(tagArray);
      }
  }, bloodhoundHandler);
}

var bindDataToSearch = function()
{
  $('#games-search')
    .prop('disabled', false);
  $('#tag-search')
    .prop('disabled', false);

  var gameValues = [];
  for (var appid in $GameData)
  {
    if (!($GameData[appid] === undefined))
      gameValues.push({label:$GameData[appid].name, value:appid});
  }
  $Search.games.add(gameValues);

  var tagValues = [];
  for (var tagid in $TagData)
  {
    tagValues.push({label:$TagData[tagid].name, value:tagid});
  }
  $Search.tags.add(tagValues);
}

var setSelectedGame = function(event)
{
  var appidInt = parseInt(event.data);
  if ($State.selectedGame === appidInt)
    return;

  var game = $GameData[appidInt];

  var gameEntry = $("#appid"+game.appid);

  if (gameEntry.hasClass("unfocused"))
  {
    // If you just moused over an unfocused game, do nothing
    if (event.type == "mouseenter")
      return;
    // Clicked on an unfocused game, clear filters
    $State.filterTags = [];
    resetFocus();
  }

  $State.selectedGame = game.appid;

  $GamePopup.appendTo(gameEntry).css("bottom", "-40px").show().animate({bottom:"0px"},100);
  $("#play-link").prop("href", "steam://run/" + game.appid);
};

var tagClicked = function(event)
{
  if ($State.expectedBatches != -1)
    return;

  var tag = $TagData[parseInt(event.data)];
  var tagItem = $('#tag'+tag.tagid);

  $GamePopup.hide();

  $State.filterTags = [tag];
  filterByTags();
};

var filterByTags = function()
{
  if ($State.filterTags === undefined)
    return;

  var filterTags = [];
  var gameIdPool = [];

  $('.tag').removeClass('highlighted unfocused');

  // Loop through the filter list
  $State.filterTags.forEach(function(addTag, index, array){
    // Highlight the filter tags
    $('#tag'+addTag.tagid).addClass('highlighted');
    // Add to the list we'll use to filter by tags
    filterTags.push(addTag.tagid);
    // Loop through the game list in each tag
    addTag.games.forEach(function(appid, i, arr){
      // Add the game if not in the pool yet
      var doAdd = gameIdPool.indexOf(appid) == -1;
      if (doAdd)
        gameIdPool.push(appid);
    });
  });

  // Unfocus not highlighted tags
  $('.tag').not('.highlighted').addClass('unfocused');
  // Unfocus all games
  $('.game').addClass('unfocused').removeClass('selected');

  // Attempt at worker pooling so tag interaction won't take a hit
  $State.passGames = [];
  $State.expectedBatches = 1;
  var gameFilter = new Worker('./js/game-filter.js');

  gameFilter.addEventListener("message", recieveFilteredGames, false);
  gameFilter.postMessage({"games":$GameData,
                          "filters":filterTags,
                          "batch":gameIdPool});
};

var recieveFilteredGames = function(e) {
  $State.passGames = $State.passGames.concat(e.data);
  $State.expectedBatches--;

  if ($State.expectedBatches == 0){

    // Loop through the passed games...
    $State.passGames.forEach(function(game, index, array){
      // Game passed, move it up the selected list,
      // also get the position to scroll to
      $('#appid'+game.appid).prependTo($GameList)
                            .addClass('selected')
                            .removeClass('unfocused');
      // Refocus the tags for the games that passed the filter
      game.tags.forEach(function(tagid, index, array){
        $('#tag'+tagid).removeClass('unfocused')
            .children('div')
            .children('i')
            .addClass('fa-plus-square-o');
      });
    });

    $GamesStats.html("Found " + $State.passGames.length + " titles");

    $('html, body').animate({scrollTop: 0}, 100);
    $State.expectedBatches = -1;
  }
}

var consolidateTags = function()
{
  $('.tag').not('.unfocused').prependTo($TagList);
  $('.tag.highlighted').prependTo($TagList);
  $TagList.animate({scrollTop:0}, 200);
};

var highlightGameTags = function(event)
{
  if ($State.selectedGame === undefined)
    return;

  highlightTags($GameData[$State.selectedGame].tags);
  event.preventDefault();
};

var highlightTags = function(tagArray)
{

  // Reset all tag filters
  $State.filterTags = [];
  // Unfocus all tags
  $('.tag').addClass('unfocused');
  // Then move all of this game's tags to top and refocus them
  for (var i = tagArray.length-1; i >= 0; i--)
  {
    $TagList.prepend($('#tag'+tagArray[i]).removeClass('unfocused'));
  }
  // Scroll up the tag list, in case
  $TagList.animate({scrollTop:0}, 200);
}

var resetFocus = function()
{
  $('.game').removeClass('selected unfocused softfocus');
  $('.tag').removeClass('highlighted unfocused');
  $GamesStats.html("");
};

/* Data retrieval/population */
var fetchLibrary = function(steamid)
{
  console.log("Attempt to fetch library");

  localStorage.setItem('steam-id', steamid);

  $('#step1').hide();
  $('#step3').hide();
  $('#step2').show();

  $GameData = {};
  $TagData = {};
  $GameList.empty();
  $TagList.empty();

  var getGamesApi = "library/" + steamid;
  $.ajax({
    url: getGamesApi,
    dataType: "json",
    xhrFields: { withCredentials: true },
    success: function(data)
    {
      // Temporarily fill game list
      data.response.games.forEach(function(game, i, array){
        $GameData[game.appid] = game;
        $GameList.append('<li id="appid'+game.appid+'">App '+game.appid+'</li>');
      });
      // Start fetching tags
      fetchTags(0, data.response.games, data.response.game_count);
    }
  });
};

var fetchTags = function(start, games, gameLength)
{
  var batchSize = 20;
  console.log("Fetching from " + start + " to " + (start + batchSize));
  // Update counter
  $('#lib-counter').html(start + '/' + gameLength);
  var appList = "";
  var doSave = false;
  for (i = start; i < start+batchSize; i++)
  {
    if (games[i] === undefined)
    {
      doSave = true;
      break;
    }

    appList += games[i].appid;

    if (i < start + (batchSize-1) && i+1 < gameLength)
      appList += ",";
  }

  console.log(appList);
  var getGamesApi = "./games/" + appList;
  $.ajax({
    url: getGamesApi,
    dataType: "json",
    xhrFields: { withCredentials: true },
    success: function(data)
    {
      // Update the game names
      data.games.forEach(function(game, index, array)
      {
        $GameData[game.appid].tags = game.tags;
        $GameData[game.appid].name = game.name;
        $GameData[game.appid].header = game.header;

        // do some processing on header image to get the resized version
        var fileExtPt = game.header.lastIndexOf('.');
        var newHeader = game.header.substring(0, fileExtPt);
        newHeader += "_292x136";
        newHeader += game.header.substring(fileExtPt);
        $GameData[game.appid].header = newHeader;

        setupGameEntry(game.appid);
      });

      // Update the tags
      updateTags(data.tags);

      // Remove faulty queries
      data.remove.forEach(function(id, index, array){
        delete $GameData[id];
        $("#appid"+id).remove();
      });

      // Bind incoming data to search
      bindDataToSearch();

      if (doSave)
      {
        console.log("Saving data to local storage");
        // Save the data to local storage
        localStorage.setItem("GameData", JSON.stringify($GameData));
        localStorage.setItem("TagData", JSON.stringify($TagData));

        $('#step2').hide();
        $('#step3').show();
      }
      else
      {
        // Run for next batch of games
        fetchTags(start+batchSize, games, gameLength);
      }
    }
  });
};

var updateTags = function(tagdata)
{
  tagdata.forEach(function(tag, i, tagdata){
    if ($TagData[tag.tagid] === undefined)
    {
      $TagData[tag.tagid] = tag;
      setupTagEntry(tag.tagid);
    }
    else
    {
      console.log("Adding games to tag " + tag.name);
      $TagData[tag.tagid].games = $TagData[tag.tagid].games.concat(tag.games);
    }
  });
};

var setupGameEntry = function(appid)
{
  var game = $GameData[appid];
  if (game === undefined)
    return;
  // Check to see if there is an existing entry in the game list
  var gameEntry = $("#appid"+game.appid);
  if (gameEntry.length === 0)
  {
    $GameList.append('<li id="appid'+game.appid+'">App '+game.appid+'</li>');
    gameEntry = $("#appid"+game.appid);
  }
  var playtime = game.playtime_forever;
  if (playtime > 60)
  {
    playtime = Math.round(playtime / 60);
    if (playtime > 1)
      playtime = "Played " + playtime + " hours";
    else
      playtime = "Played " + playtime + " hour";
  }
  else
  {
    playtime = "Played " + playtime + " minutes";
  }

  var displayDiv = $('<div/>').html("<p>"+game.name+"</p>")
            .prepend('<img src="'+game.header+'"/><span class="playtime">'+playtime+'</span>')
            .click(game.appid, setSelectedGame)
            .mouseenter(game.appid, setSelectedGame);
  gameEntry.empty().addClass('game').append(displayDiv);
            // .mouseleave(function(){$GamePopup.hide(); $State.selectedGame = -1;});
};

var setupTagEntry = function(tagid)
{
  var tag = $TagData[tagid];
  if (tag === undefined)
    return;
  var tagItem = $('<li>').click(tag.tagid, tagClicked)
                        .prop('id', 'tag'+tag.tagid)
                        .addClass('tag');
  var tagToggle = $('<div>').addClass('tag-modify')
                            .append($('<i>').addClass('fa fa-lg'))
  tagItem.append($('<p>').html(tag.name))
          .append(tagToggle);
  $TagList.append(tagItem);
};
/* End data retrieval/population */

$(document).ready(initPage);
