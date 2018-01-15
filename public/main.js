
// local spotify tokens
var access_token, refresh_token;

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
	var userProfileSource = document.getElementById('user-profile-template').innerHTML,
		userProfileTemplate = Handlebars.compile(userProfileSource),
		userProfilePlaceholder = document.getElementById('user-profile');
	var oauthSource = document.getElementById('oauth-template').innerHTML,
		oauthTemplate = Handlebars.compile(oauthSource),
		oauthPlaceholder = document.getElementById('oauth');
	var params = getHashParams();

	// assign tokens
	access_token = params.access_token;
	refresh_token = params.refresh_token;
	var	error = params.error;

	// apply changes after attempted login
	if (error) alert('There was an error during the authentication');
	else {
		if (access_token) {

			// render oauth info
			oauthPlaceholder.innerHTML = oauthTemplate({
				access_token: access_token,
				refresh_token: refresh_token
			});

			$.ajax({
				url: 'https://api.spotify.com/v1/me',
				headers: {
					'Authorization': 'Bearer ' + access_token
				},
				success: function(response) {
				userProfilePlaceholder.innerHTML = userProfileTemplate(response);
				$('#login').hide();
				$('#loggedin').show();
				}
			});
		} else {
			// render initial screen
			$('#login').show();
			$('#loggedin').hide();
		}

		// spotify-given code to generate new refresh token
		document.getElementById('obtain-new-token').addEventListener('click', function() {
			$.ajax({
				url: '/refresh_token',
				data: {
					'refresh_token': refresh_token
				}
			}).done(function(data) {
				access_token = data.access_token;
				oauthPlaceholder.innerHTML = oauthTemplate({
					access_token: access_token,
					refresh_token: refresh_token
				});
			});
		}, false);
	}
};

// find a song, using twitterFeedRadio API for connection
function findSong() {

	var search = $('#tbx_search').val();
	console.log(search);

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

				// on receiving songs, add them to the list
				// WARN - this will have to be changed when the ordering is introduced
				for (var x = 0; x < found.tracks.length; x++)
				{
					var image = new Image();
			        if (found.tracks[x].cover_url != null) image.src = found.tracks[x].cover_url;
			        
			        var html = "<li><img class=\"song_album_art\" src=\""+image.src+"\" />";
			        html += "<div class=\"song_group\" ><div class=\"song_name\" >"+found.tracks[x].name+"</div>"
			        html += "<div class=\"song_album\" > "+found.tracks[x].album+"</div></div>";
			        //html += "<div class=\"messageTime\" style=\"float:right;\">"+time+"</div></li><br>";

			        $('#song_list').append(html);
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
