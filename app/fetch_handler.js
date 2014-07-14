var request = require('request');

module.exports = function(req, res, requestParams, callback) {
  request(requestParams, function(error, response, body) {
      // Don't continue if recieved error
      if (error || response.statusCode != 200) {
          if (error)
            res.status(500);
          else
            res.status(response.statusCode)
          // Send blank message when error encountered
          res.send();
      } else {
        callback(response, body);
      }
  });
}
