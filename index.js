// --= SERVER SETUP =--

// A lot of the spotify code is sourced from the spotify tutorial right now for initaial setup
// most other code is placeholder and/or broken sorry ¯\_(ツ)_/¯ 

// socket connection
var http 	= require('http');
var socket 	= require('socket.io');
var fs 		= require('fs');
var port 	= 3000;

// express setup
var express = require('express');
var app 	= express();
var server  = require('http').Server(app);
var io 		= require('socket.io')(server);

// API router setup
var bodyParser = require('body-parser');			// obtain bodyParser
app.use(bodyParser.urlencoded({extended:true}));	// use URL encoder
app.use(bodyParser.json());	
var router = express.Router();

// setup Public file area
app.use(express.static("Public"));	

// mongoDB and mongoose connection
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
try { mongoose.connect('EXAMPLE MONGODB LINK', { useMongoClient: true }); } // <-- Needs implementing
catch(e) { console.log("connection to mLab unsuccessful!"); }
var Schema = mongoose.Schema;

// Spotify connection
var querystring 	= require('querystring');
var cookieParser 	= require('cookie-parser');
var request 		= require('request');

var client_id 		= '4e7e6fbe03fe45dab500285194818254';  	// TwitterFeedRadio client ID
var client_secret 	= 'c282a6595e30474b904448ffcd2b250c';  	// Your secret
var redirect_uri 	= 'http://localhost:'+socket; 			// Your redirect uri
var stateKey 		= 'spotify_auth_state';

// schema and model
// NEEDS IMPLEMENTING

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log("Connection established");
});	


// --= SPOTIFY API SETUP =--

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// spotify login 
app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

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

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
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

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

/*

// --= REST API SETUP =--

// base api route
router.get('/', function(req, res) {					
	res.json({message:"Rest API Connected"});
}); 

// GET call
router.get('/test', function(req,res){
	res.json({mesage:"GET call"});
});

// POST call
router.post('/test', function(req,res){
	res.json({mesage:"POST call"});
});

// PUT call
router.put('/test', function(req,res){
	res.json({mesage:"PUT call"});
});

// DELETE call
router.delete('/test', function(req,res){
	res.json({mesage:"DELETE call"});
});
*/

// begin listening with the server
app.use('/api', router).use(cookieParser());
server.listen(port, () =>  {
	console.log('Server running on port: '+port);
});

