// --= SERVER SETUP =--

// A lot of the spotify code is sourced from the spotify tutorial right now for initaial setup
// most other code is placeholder and/or broken sorry ¯\_(ツ)_/¯ 

// server files
var songManager = require('./songManager');

// express setup
var port    = 3000;
var http    = require('http');
var express = require('express');
var app 	  = express();
var server  = require('http').Server(app);

// API router setup
var bodyParser = require('body-parser');			// obtain bodyParser
app.use(bodyParser.urlencoded({extended:true}));	// use URL encoder
app.use(bodyParser.json());	

// Spotify connection
var querystring 	= require('querystring');
var cookieParser 	= require('cookie-parser');
var request 		  = require('request');

var client_id 		  = '4e7e6fbe03fe45dab500285194818254';  	// TwitterFeedRadio client ID
var client_secret 	= 'c282a6595e30474b904448ffcd2b250c';  	// Your secret
var redirect_uri 	  = 'http://localhost:'+port+"/callback"; // Your redirect uri
var stateKey 		   = 'spotify_auth_state';

// setup Public file area
app.use(express.static("Public")).use(cookieParser());

// possable security addition
var helmet = require('helmet');
app.use(helmet());

function requireHTTPS(req, res, next) {
  if (req.headers && req.headers.$wssp === "80") {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
}
app.use(requireHTTPS);

// define router, although not used yet 
var router = express.Router();

//============================================
// --= SPOTIFY API SETUP =--

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// base api route
app.get('/', function(req, res) {          
  console.log("API routing...");
}); 


// create neccessary states and attempt login into spotify api
app.get('/login', function(req, res) {
  console.log("requested login...");

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-modify-playback-state user-read-playback-state';
  
   res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

// route for spotify to take when requesting callback
app.get('/callback', function(req, res) {
  console.log("requested callback...");

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token;
        var refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body.id+" - connected");
          userID = body.id;
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token,
            'currentTimer': songManager.getClock()
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

// user requested refresh token
app.get('/refresh_token', function(req, res) {
  console.log("requested token...");

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;

  // send request
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  // on request received
  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token,
        'currentTimer': songManager.getClock()
      });
    }
  });
});


// search for song on spotify with a keyword
// WARN - this will not be used with the final code, just for testing!
app.get('/find_song', function(req, res) {

  var search = req.query.srch;
  var access_token = req.query.access_token;
  var songs_received = 5; // can get multiple songs

  console.log('search for '+search+"...");

  var options = {
          url: "https://api.spotify.com/v1/search?type=track&limit="+
                songs_received+"&q="+
                encodeURIComponent('track:"'+search+'"'),
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

  // use the access token to access the Spotify Web API
  request.get(options, function(error, response, body) {
    console.log(1);

    var songs = body.tracks.items
      .map(function(item) {

        // setup return object
        var ret = {
          name: item.name,
          artist: 'Unknown',
          artist_uri: '',
          album: item.album.name,
          album_uri: item.album.uri,
          cover_url: '',
          uri: item.uri
        }

        // remove any error values
        if (item.artists.length > 0) {
          ret.artist = item.artists[0].name;
          ret.artist_uri = item.artists[0].uri;
        }
        if (item.album.images.length > 0) {
          ret.cover_url = item.album.images[item.album.images.length - 1].url;
        }
        console.log(2);

        // get songID from the song.uri
        var uri = ret.uri;
        var tokens = uri.split(":");
        var songID = tokens[2];

        // define song to be searched and include access_token
        var options = {
          url: 'https://api.spotify.com/v1/audio-features/'+songID,
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        console.log(3);
        // on responce get information out and send song to be added to database
        request.get(options, function(error, response, body) {

          console.log(4);
          ret["duration_ms"] = body.duration_ms;
          console.log(ret);
          //songManager.addSong(song);
          
        });
         
        return ret;
      });

    // wait for server to return all queries
    setTimeout(function() {
      console.log(5);
      res.json({
        word: search,
        tracks: songs
      });
      console.log(songs);
    }, 1000);
   
  });
});

// get more data about a song, including song length
function gotSongData(song, access_token)
{
  // get songID from the song.uri
  var uri = song.uri;
  var tokens = uri.split(":");
  var songID = tokens[2];

  // define song to be searched and include access_token
  var options = {
    url: 'https://api.spotify.com/v1/audio-features/'+songID,
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  // on responce get information out and send song to be added to database
  request.get(options, function(error, response, body) {
    song["duration_ms"] = body.duration_ms;
    //songManager.addSong(song);
  });
}

// use access_token to change playback settings of user
// WARN - this will not be used with the final code, just for testing!
app.get('/pause_song', function(req, res) {

  var search = req.query.srch;
  console.log("attempting pause...");
  var access_token = req.query.access_token;

  var options = {
          url: "https://api.spotify.com/v1/me/player/pause",
          headers: { 'Authorization': 'Bearer ' + access_token }
        };

  // use the access token to access the Spotify Web API
  request.put(options, function(error, response, body) {
      console.log(response.body);
  });
});

//============================================
// --= REST API SETUP =--

// base api route
app.get('/', function(req, res) {					
	res.json({message:"Rest API Connected"});
}); 

// GET call
app.get('/test', function(req,res){
	res.json({mesage:"GET call"});
});

// POST call
app.post('/test', function(req,res){
	res.json({mesage:"POST call"});
});

// PUT call
app.put('/test', function(req,res){
	res.json({mesage:"PUT call"});
});

// DELETE call
app.delete('/test', function(req,res){
	res.json({mesage:"DELETE call"});
});


// begin listening with the server
app.use('/api', router).use(cookieParser());
server.listen(port, () =>  {
	console.log('Server running on port: '+port);
});



