
// local spotify tokens
var access_token, refresh_token;

// local variables
setInterval(tickClock, 1000);
var currentTime = 0;
var displayMenu = false;
var currentSearchedSongs;

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

	// fancy way of inputing data to the html, must figure out what this is doing soon

	var userDetailsSource = document.getElementById('userDetails-template').innerHTML,
		userDetailsTemplate = Handlebars.compile(userDetailsSource),
		userDetailsPlaceholder = document.getElementById('userDetails');


	var params = getHashParams();

	// assign tokens
	access_token = params.access_token;
	refresh_token = params.refresh_token;
	var	error = params.error;
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

		// spotify-given code to generate new refresh token
		$('#obtain-new-token').click(function() {
			$.ajax({
				url: '/refresh_token',
				data: {
					'refresh_token': refresh_token
				}
			}).done(function(data) {
				access_token = data.access_token;
				currentTime = data.currentTimer;
				oauthPlaceholder.innerHTML = oauthTemplate({
					access_token: access_token,
					refresh_token: refresh_token
				});
			});
		}, false);

		// load in current songs to the player
		$.ajax({
			type: "GET",
			url: 'http://localhost:3000/get_song_list',
			dataType: 'json',
			success: function(res) {

				// display current playing song
				var image = new Image();
		        if (res[0].image != null) image.src = res[0].image;
		        
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
			        if (res[x].image != null) image.src = res[x].image;
			        
			        // insert image
			        var html = "<li><img class=\"song_album_art\" src=\""+image.src+"\" />";

			        // insert track info
			        html += "<div class=\"song_group\" >";
			        html += "<div class=\"song_name\" >"+res[x].name+"</div>";
			        html += "<div class=\"song_artist\" > "+res[x].artist+"</div>";
			        html += "<div class=\"song_album\">"+res[x].album+"</div></div></li><br>";
			        // add song to list
			        $('#song_list').append(html);
			    }
			}
		});
	}
};

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
  						console.log(songID);

						// post song to be added
						/*
						$.ajax({
							type: "PUT",
							url: 'http://localhost:3000/pause_song',
							data: {
								'uri': currentSearchedSongs.tracks[songID];
							},
							dataType: 'json'
						});
						*/
					});
			    }
			},
		});
}

// pause current spotify playback
// WARN - this will not be used with the final code, just for testing!
function pauseSong() {
	$.ajax({
			type: "GET",
			url: 'http://localhost:3000/pause_song',
			data: {
				'access_token': access_token
			},
			dataType: 'json'
		});
}

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

function tickClock() {

	// after 1.4 min, reset clock
	if (currentTime == 100) {
		currentTime = 0;
    	$("#loadFill").animate({width:'0%'});
    }
    else {
    	// pass time
		$("#loadFill").animate({width:currentTime+'%'});
		currentTime++;
    }
}
    
