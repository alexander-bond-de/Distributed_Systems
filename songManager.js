(function() {

	//========================
	// Variables

	// mongoDB and mongoose connection
	var mongoose = require('mongoose');
	mongoose.Promise = global.Promise;

	// connect to the database
	try { mongoose.connect('mongodb://songManager:pass@ds251807.mlab.com:51807/twitterfeedradio', { useMongoClient: true }); } // <-- Needs implementing
	catch(e) { console.log("connection to mLab unsuccessful!"); }

	// schema and model
	var Schema = mongoose.Schema;
	var songSchema = new Schema({
		name: String,
		artist: String,
		album: String,
		cover_url: String,
		duration_ms: String,
		votes: String,
		queue: String
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
	var currentTime = 0;

	var currentSongsInList;

	//========================
	// Functions

	// Adds a song to the database
    module.exports.addSong = function(song) {

    	currentSongsInList++;
    	// create the model
       	var newSong = new songModel({
       		name: song.name,
       		artist: song.artist,
       		album: song.album,
			cover_url: song.cover_url,
			duration_ms: song.duration_ms,
			votes: 1,
			queue: currentSongsInList
       	})

       	// save the model to the database
       	newSong.save(function(err) {
			if (err) return console.err(err);
			else console.log("Pushed : "+song.name+" - "+song.artist);
       	});
    
    };

    // gets top 10 current songs to be played
    module.exports.getcurrentSongList = function getcurrentSongList(_callback) {

    	songModel.find({}).sort({'votes' : 'desc', 'queue' : 'asc'}).limit(10).exec(function (err, result) {
 		 	if (err) throw err;
 		 	currentSongsInList = result.length;
 		 	console.log("currentSongsInList :"+currentSongsInList);
			_callback(result);
		});
    };

    // runs every second to simulate time passing
    function tickClock() {

    	// after 1.4 min, reset clock
		if (currentTime == 100) {
			// load tweets
			currentTime = 0;
		}
		else {
			// pass time
    		currentTime++;
		}
    };

    module.exports.getClock = function(_callback) { _callback(currentTime); };


}());
