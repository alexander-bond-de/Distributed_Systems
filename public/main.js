
// local spotify tokens
var access_token, refresh_token;

// local variables
setInterval(tickClock, 1000);
var clockRunning = false;
var currentSongLength;
var currentTimer = 0;
var displayMenu = false;
var currentSearchedSongs;
var currentDisplayedSongs;

function mainScript() {

	// spotify stuff
	function getHashParams() {
		var hashParams = {};
		var e, 
			r = /([^&;=]+)=?([^&;]*)/g,
			q = window.location.hash.substring(1);
		while ( e = r.exec(q)) { hashParams[e[1]] = decodeURIComponent(e[2]); }
		return hashParams;
	};

	// use the handlebars node library to fill in user data
	var userDetailsSource = document.getElementById('userDetails-template').innerHTML,
		userDetailsTemplate = Handlebars.compile(userDetailsSource),
		userDetailsPlaceholder = document.getElementById('userDetails');

	var params = getHashParams();

	// assign tokens
	access_token = params.access_token;
	refresh_token = params.refresh_token;
	var	error = params.error;

	// set current timer (almost redundant at this point)
	currentTime = params.currentTimer;

	// apply changes after attempted login
	if (error) alert('There was an error during the authentication');
	else {
		if (access_token) {

			$.ajax({
				url: 'https://api.spotify.com/v1/me',
				headers: {
					'Authorization': 'Bearer ' + access_token
				},
				success: function(response) {
					userDetailsPlaceholder.innerHTML = userDetailsTemplate(response);
					$('#login').hide();
					$('#searchBar').show();
					$('#userDetails').show();
				}
			});
		} else {
			// render initial screen
			$('#login').show();
			$('#searchBar').hide();
			$('#userDetails').hide();
		}

		// update instance data
		updateLiveSong();

		setTimeout(function() {
	    	refreshSongList();
	    }, 1000);
	}
};

// spotify function for refresh token
function getRefreshToken() {
	$.ajax({
		url: 'http://localhost:3000/refresh_token',
		data: {
			'refresh_token': refresh_token
		}
	}).done(function(data) {
		access_token = data.access_token;
		currentTimer = data.currentTimer;	
		console.log(data);
	});
};

// get current song list, and put into the song bar
function refreshSongList(){

	// load in current songs to the player
	$.ajax({
		type: "GET",
		url: 'http://localhost:3000/get_song_list',
		dataType: 'json',
		success: function(res) {
			currentDisplayedSongs = res;

			// empty previous list
			$("#song_list").empty();

			// if there are songs to display
			if (res.length > 0) {

				// display current playing song
				var image = new Image();
		        if (res[0].cover_url != null) image.src = res[0].cover_url;
		        
		        // insert image
		        var html = "<li class=\"li_live\"><img class=\"song_album_art_live\" src=\""+image.src+"\" />";

		        // insert track info
		        html += "<div class=\"song_group_live\" >";
		        html += "<div class=\"song_name_live\" >"+res[0].name+"</div>";
		        html += "<div class=\"song_artist_live\" > "+res[0].artist+"</div>";
		        html += "<div class=\"song_album_live\">"+res[0].album+"</div></div></li><br>";
		        // add song to list
		        $('#song_list').append(html);


				// fill the other songs in
				for (var x = 1; x < res.length; x++)
				{
					image = new Image();
			        if (res[x].cover_url != null) image.src = res[x].cover_url;
			        
			        // insert image
			        var html = "<li><img class=\"song_album_art\" src=\""+image.src+"\" />";

			        // insert track info
			        html += "<div class=\"song_group\" >";
			        html += "<div class=\"song_name\" >"+res[x].name+"</div>";
			        html += "<div class=\"song_artist\" > "+res[x].artist+"</div>";
			        html += "<div class=\"song_album\">"+res[x].album+"</div></div>";

			        // insert voting box
			        html +=	"<div class=\"song_voteBox\">";
			        html += "<button class=\"song_voteUp\" id=\"up-"+x+"\"> /\\ </button>"
			        html += "<button class=\"song_voteDwn\" id=\"dwn-"+x+"\"> \\/ </button>"
			        html += "</div><div class=\"song_voteNum\">"+res[x].votes+"</div>"
					html += "</li><br>";

			        // add song to list
			        $('#song_list').append(html);

			        // apply listener to song_voteUp buton
					$('#up-'+x).click(function() {

						// get song id 
						var tokens = $(this).attr('id').split("-");
  						var songID = tokens[1];

						// post song vote
						$.ajax({
							type: "POST",
							url: 'http://localhost:3000/vote_for_song',
							data: {
								'song': currentDisplayedSongs[songID].uri,
								'vote': 'up'
							},
							dataType: 'json'
						});	
					});

					// apply listener to song_voteDwn buton
					$('#dwn-'+x).click(function() {

						// get song id 
						var tokens = $(this).attr('id').split("-");
  						var songID = tokens[1];

						// post song vote
						$.ajax({
							type: "POST",
							url: 'http://localhost:3000/vote_for_song',
							data: {
								'song': currentDisplayedSongs[songID].uri,
								'vote': 'dwn'
							},
							dataType: 'json'
						});
					});
			    }
			}
		}
	});
}

// find a song, using twitterFeedRadio API for connection
function findSong() {

	var search = $('#tbx_search').val();

	// send request
	$.ajax({
			type: "GET",
			url: 'http://localhost:3000/find_song',
			data: {
				srch: search,
				'access_token': access_token
			},
			dataType: 'json',
			success: function(found){

				// on receiving songs, add them to the search list

				// empty previous search and populate new search
				$("#search_list").empty();
				currentSearchedSongs = found;

				for (var x = 0; x < found.tracks.length; x++)
				{
					var image = new Image();
			        if (found.tracks[x].cover_url != null) image.src = found.tracks[x].cover_url;
			        
			        // insert image
			        var html = "<li><img class=\"song_album_art\" id=\"link-"+x+"\" src=\""+image.src+"\" />";

			        // insert track info
			        html += "<div class=\"song_group\" >";
			        html += "<div class=\"song_name\" >"+found.tracks[x].name+"</div>";
			        html += "<div class=\"song_artist\" > "+found.tracks[x].artist+"</div>";
			        html += "<div class=\"song_album\">"+found.tracks[x].album+"</div></div></li><br>";

			        // add song to list
			        $('#search_list').append(html);

			        // apply listener to image
					$('#link-'+x).click(function() {

						// get song id 
						var tokens = $(this).attr('id').split("-");
  						var songID = tokens[1];

						// post song to be added
						$.ajax({
							type: "POST",
							url: 'http://localhost:3000/choose_song',
							data: {
								'song': currentSearchedSongs.tracks[songID]
							},
							dataType: 'json'
						});

						setTimeout(function() {
					    	refreshSongList();
					    	updateLiveSong();
					    }, 1000);
					});
			    }
			},
		});
}

// get information about the current live song 
function updateLiveSong() {
	$.ajax({
			type: "GET",
			url: 'http://localhost:3000/update_live_song',
			data: {
				'access_token': access_token
			},
			dataType: 'json',
			success: function(responce){
				if (responce.songPlaying == true) {

					// update clock data
					currentSongLength = responce.songLength;
					currentTimer = responce.currentTimer;

					// run the clock
					clockRunning = true;
				}
				else {

					// stop the clock
					currentSongLength = 0;
					currentTimer = 0;
					clockRunning = false;
				}
			}
		});
}

// animate the menu
function toggleMenu() {
	displayMenu = !displayMenu;
      if (displayMenu) {
        $("#userPanel").animate({width: "500px"});
        $("#userPanel").promise().done(function(){
        	$("#userPanel-content").show();
        });
      } else {
      	$("#userPanel-content").hide();
        $("#userPanel").animate({width: "80px"});
      }
}

//count the clock along the slider
function tickClock() {

	// if the clock is running
	if (clockRunning) {
		if (currentTimer >= currentSongLength) {

			// after song finishes, reset clock
			currentTimer = 0;
	    	$("#loadFill").animate({width:'0%'});
	    	$("#loadProgress").text("");
	    	refreshSongList();
			updateLiveSong();
	    }
	    else {
	    	// pass time
			$("#loadFill").animate({width:(currentTimer/currentSongLength*100)+'%'});
			$("#loadProgress").text(msToTime(currentTimer));
			currentTimer += 1000;
	    }
	}
}

// convert milliseconds to min:seconds
function msToTime(milliseconds) {
    var seconds = parseInt((milliseconds/1000)%60),
        minutes = parseInt((milliseconds/(1000*60))%60)

    minutes = (minutes < 10 ? "0" + minutes : minutes);
    seconds = (seconds < 10 ? "0" + seconds : seconds);

    return minutes + ":" + seconds;
}
    
