// --= SERVER SETUP =--

// socket connection
var http = require('http');
var socket = require('socket.io');
var fs = require('fs');
var port = 3000;

// express setup
var express = require('express');
var app = express();
var server  = require('http').Server(app);
var io = require('socket.io')(server);

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

// schema and model
// NEEDS IMPLEMENTING

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log("Connection established");
});	

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


// begin listening with the server
app.use('/api', router);
server.listen(port, () =>  {
	console.log('Server running on port: '+port);
});
