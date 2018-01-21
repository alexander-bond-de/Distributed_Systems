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

// load important info into songManager
songManager.load();

// begin playing next song
songManager.playNextSong();


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


// create neccessary states and attempt login into spotify api
router.get('/login', function(req, res) {
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
        var currentTime 
        songManager.getClock(function(res) {currentTime = res});

        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token,
            'currentTimer': currentTime
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
  var currentTime 
  songManager.getClock(function(res) {currentTime = res});

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token,
        'currentTimer': currentTime
      });
    }
  });
});


//============================================
// --= SPOTIFYRADIO API SETUP =--


// base api route
router.get('/', function(req, res) {          
  console.log("API routing...");
  res.json({"responce":"API Connected"});
}); 

// search for song on spotify with a keyword
router.get('/find_song', function(req, res) {

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

        // get songID from the song.uri
        var uri = ret.uri;
        var tokens = uri.split(":");
        var songID = tokens[2];

        // get more data about a song, including song length
        // define song to be searched and include access_token
        var options = {
          url: 'https://api.spotify.com/v1/audio-features/'+songID,
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // on responce get information out and add to the song object
        request.get(options, function(error, response, body) {
          ret["duration_ms"] = body.duration_ms;
        });
         
        return ret;
      });

    // wait for server to return all queries
    setTimeout(function() {
      res.json({
        word: search,
        tracks: songs
      });
    }, 1000);
   
  });
});

// put a chosen song into the list of upcoming songs
router.post('/choose_song', function(req, res) {
  songManager.addSong(req.body.song);
});

// return the current song lost sorted by highest voted
router.get('/get_song_list', function(req, res) {

  // get top 10 current songs
  var currentSongList
  songManager.getcurrentSongList(function(res) {currentSongList = res;});

  // wait for server to return all queries
  setTimeout(function() {
      res.json(currentSongList);
    }, 1000);
});

// set a user's spotify instance to the current song, and return details.
router.get('/update_live_song', function(req, res) {

  // get the current song information
  console.log("User requested song refresh"); 
  songManager.getCurrentSong(function(song, length, time) {

    if (song != null) {
      setTimeout(function() {  
        var access_token = req.query.access_token;
        var uri = [song];

        // set the URL for setting playback of a song on a user's instance
        var optionsPlay = {
                url: "https://api.spotify.com/v1/me/player/play",
                json: true,
                headers: { 
                  'Authorization': 'Bearer ' + access_token 
                },
                body: { 'uris' : uri }
              };

        // use the access token to access the Spotify Web API
        request.put(optionsPlay, function(error, response, body) {
            
            // set the time of the playback
            var optionsSeek = {
              url: "https://api.spotify.com/v1/me/player/seek?position_ms="+time,
              json: true,
              headers: { 
                'Authorization': 'Bearer ' + access_token 
              },
            };

            // send request to change playback time
            request.put(optionsSeek, function(error, response, body) {
              //console.log();
            });

            // return song data for client
            res.send({
              'songPlaying': true,
              'songLength': length,
              'currentTimer': time
            });
        });
      }, 500);
    }
    else {
      // no song is live right now
      res.send({ 'songPlaying': false });
    }

  });
});

// apply a vote onto a song
router.post('/vote_for_song', function(req, res) {
  console.log("User voting");
  songManager.voteForSong(req.body.song, req.body.vote);
});


// begin listening with the server
app.use('/api', router).use(cookieParser());
server.listen(port, () =>  {
	console.log('Server running on port: '+port);
});



