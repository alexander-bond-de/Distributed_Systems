(function() {

	//========================
	// Variables

	// mongoDB and mongoose connection
	var mongoose = require('mongoose');
	mongoose.Promise = global.Promise;

	// connect to the database
	try { mongoose.connect('mongodb://songManager:pass@ds251807.mlab.com:51807/twitterfeedradio')}
	catch(e) { console.log("connection to mLab unsuccessful!"); }

	// schema and model
	var Schema = mongoose.Schema;
	var songSchema = new Schema({
		uri: String,
		name: String,
		artist: String,
		album: String,
		cover_url: String,
		duration_ms: String,
		votes: String,
		queue: String,
		currentlyPlaying : String
	});
	var songModel = mongoose.model('currentSongs', songSchema);

	// connect to the database
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function() {
		console.log("Database connection established");
	});	

	// clock information
	var universalClock = setInterval(tickClock, 1000);
	var clockRunning = false;
	var currentSongLength;
	var currentTime = 0;

	// Useful current information
	var currentSongsInList = 0;
	var queueIndex = 0;

	//========================
	// Functions

	// Inital load of database information for songManager
 	module.exports.load = function() {
 		songModel.find().exec(function (err, result) {
 		 	if (err) throw err;

 		 	currentSongsInList = result.length;
 		 	console.log("currentSongsInList from load:"+currentSongsInList);
		});
 	};

	// Adds a song to the database
    module.exports.addSong = function(song) {

    	// confirm song doesn't already exisit
    	songModel.find({'uri' : song.uri}).exec(function (err, result) {

    		// if song doesn't exist
    		if (result.length == 0) {

		    	currentSongsInList++;
		    	// create the model
		       	var newSong = new songModel({
		       		uri: song.uri,
		       		name: song.name,
		       		artist: song.artist,
		       		album: song.album,
					cover_url: song.cover_url,
					duration_ms: song.duration_ms,
					votes: 1,
					queue: ++queueIndex,
					currentlyPlaying: (currentSongsInList == 1?true:false)
		       	})

		       	// save the model to the database
		       	newSong.save(function(err) {
					if (err) return console.err(err);
					else console.log("__Pushed : "+song.name+" - "+song.artist);
		       	});

		       	// if there is only one song, play it
		       	setTimeout(function() {
			       	if (currentSongsInList == 1)
			    		playNextSong();
			    }, 500);
			}
		});
	};

    // gets top 10 current songs to be played
    module.exports.getcurrentSongList = function getcurrentSongList(_callback) {

    	// get the next 10 songs, sort by votes first then order second
    	songModel.find({}).sort({'currentlyPlaying' : 'desc', 'votes' : 'desc', 'queue' : 'asc'})
	    	.limit(10).exec(function (err, result) {
	 		 	if (err) throw err;

	 		 	currentSongsInList = result.length;
				_callback(result);
			});
    };

    // get the current song playing, and data associated with it for clients
    module.exports.getCurrentSong = function(_callback) { 

		// if no song is playing right now, begin playing
    	if (currentSongsInList == 0)
    		playNextSong();

    	setTimeout(function() {
	    	songModel.find({currentlyPlaying : true}).exec(function (err, result) {
	    		if (result.length != 0)
	    			_callback(result[0].uri, result[0].duration_ms, currentTime); 
	    		else
	    			_callback(null, null, null);
	    	});
	    }, 500);			
    };

    // runs every second to simulate time passing
    function tickClock() {

    	// if the clock is currently active
		if (clockRunning) {
	    	// after song length, reset clock (with a 2 second buffer to smooth song transitions)
			if (currentTime + 2000 >= currentSongLength) {
				// load tweets
				currentTime = -1000;

				// remove the most recently played song
	    		songModel.find({currentlyPlaying : true}).remove().exec();
	    		currentSongsInList--;
				
				// play the next song
				playNextSong();
			}
			else {
				// pass time
	    		currentTime += 1000;
	    		
	    		if (currentTime % 30000 < 1000) 
	    			console.log("- "+((currentSongLength - currentTime) / 1000)+" seconds left");
			}
		}
    };

    // apply vote onto a song
    module.exports.voteForSong = function(songID, vote) { 
    	// get the next song
    	songModel.find({'uri' : songID}).exec(function (err, result) {
 		 	if (err) throw err;

 		 	// apply vote to song
 		 	var votes = parseInt(result[0].votes);
			result[0].votes = (vote == "up"?votes+1:votes-1);
			result[0].save(function (err, update) {
			    if (err) return handleError(err);
			});

		});	
    };

    // changes which song is 'live' in the database
    function playNextSong() {

    	// get the next song
    	songModel.find({}).sort({'currentlyPlaying' : 'desc', 'votes' : 'desc', 'queue' : 'asc'})
    		.limit(1).exec(function (err, result) {
	 		 	if (err) throw err;

	 		 	// if there is a song to play
	 		 	if (currentSongsInList > 0) {

		 		 	// set song to currently playing song
					result[0].currentlyPlaying = true;
					result[0].save(function (err, update) {
					    if (err) return handleError(err);
					});

		 		 	//get song data
		 		 	currentSongLength = result[0].duration_ms;

		 		 	// start the clock
		 		 	console.log("__Now Playing: "+result[0].name+" - "+result[0].artist);
		 		 	clockRunning = true;
		 		 	
	 		 	} else {
	 		 		// stop the clock
					clockRunning = false;
					console.log("__Playback ended");
	 		 	}
			});	
    };

    // allow server to begin by playing next song
    module.exports.playNextSong = function() { playNextSong(); };

    // return current timer
    module.exports.getClock = function(_callback) { _callback(currentTime); };


}());
