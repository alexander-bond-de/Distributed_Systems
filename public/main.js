// socket.io functionality

// declares vegetable object

/*
function Vegetable(name, type, duration, plantDate, bio)
{
	this.name = name;
	this.type = type;
	this.duration = duration;
	this.plantDate = plantDate;
	this.bio = bio;
}
*/

/*
// announces user to server
function announceUser()
{
	socket.emit('user connected');
}
*/

/*
// socket.io handelling
$(function () 
{
	// send vegetable information to server
	$('#vegSubmit').submit(function(e){
		e.preventDefault();
		console.log("sending vegetable...");

		var date = new Date($('#plantDate').val());
		var vegetable = new Vegetable(
			$('#name').val(),
			$('#type').val(),
			$('#duration').val(),
			date.toLocaleDateString(),
			$('#bioProduct').is(':checked'),
		);
		//socket.emit('new vegetable', vegetable);
		
		$.ajax({
			type: "POST",
			url: 'http://localhost:3000/api/vegetable',
			success: function(veg){
				//console.log("vegetable sent "+date.toLocaleDateString());
				console.log("received vegetable "+veg);

				var table = document.getElementById("vegDisplayTable");
				var row = table.insertRow(-1);
				row.id = ("vegRow"+(table.rows.length - 1));

				var cell1 = row.insertCell(0);
				var cell2 = row.insertCell(1);
				var cell3 = row.insertCell(2);
				var cell4 = row.insertCell(3);
				var cell5 = row.insertCell(4);

				cell1.innerHTML = veg.name;
				cell2.innerHTML = veg.type;
				cell3.innerHTML = veg.duration;
				cell4.innerHTML = veg.plantDate;
				cell5.innerHTML = veg.bio;
			},
			dataType: 'JSON',
			data: vegetable
		});
	});

	// add the new vegetable to the list of vegetables
	socket.on('add vegetable', function(veg){

	});

	// search for vegetable 
	$('#vegSearch').submit(function(e){
		console.log("searching vegetable...");
		e.preventDefault();
		//socket.emit('search vegetable', $('#vegToSearch').val());
		var search = $('#vegToSearch').val();
		console.log(search);

		$.ajax({
			type: "GET",
			url: 'http://localhost:3000/api/vegetable',
			data: {srch: search},
			dataType: 'json',
			success: function(found){
				// return seach function
				if (found)
					$('#searchAnswer').text($('#vegToSearch').val() + " exists!");
				else
					$('#searchAnswer').text($('#vegToSearch').val() + " does not exist!");
			},
		});
	});

	
	// return seach function
	socket.on('index of vegetable', function(found){
		if (found)
			$('#searchAnswer').text($('#vegToSearch').val() + " exists!");
		else
			$('#searchAnswer').text($('#vegToSearch').val() + " does not exist!");
			
	});
	
});
*/
