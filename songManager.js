(function() {

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
		image: String,
		length: String
	});
	var songModel = mongoose.model('currentSongs', songSchema);

	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function() {
		console.log("Database connection established");
	});	

	// Adds a song to the database
    module.exports.addSong = function(song) {

    	// create the model
       	var newSong = new songModel({
       		name: song.name,
       		artist: song.artist,
       		album: song.album,
			image: song.cover_url,
			length: song.duration_ms
       	})

       	// save the model to the database
       	newSong.save(function(err) {
			if (err) return console.err(err);
			else console.log("Pushed : "+song.name+" - "+song.artist);
       	});
    
    };

}());
