var extensiondir='../extensions/dc-net/'
var pollID = (location.href).split("/");
pollID = pollID[pollID.length-2];


new Ajax.Request(extensiondir + 'webservices.cgi?service=getParticipants&pollID=' + pollID,{
	method: "get",
	onFailure: function(){ alert('Failed to fetch participant list.') },
	onSuccess: function(transport){

		$("wizzard_navigation").insert({
			after: "<h2 id='privacy_enhanced'>Invite Participants to Privacy-Enhanced Poll</h2><div id='currentUsers'></div><div id='addUsers'></div>"
		});

		var participants = transport.responseText.split("\n");

		if (participants.length > 0){
			participanttable = "<table><tr><th>Name</th></tr>";
			participants.each(function(participant){
				participanttable += "<tr><td id='" + participant + "'>fetching user name for "+ participant +" ...</td></tr>";
			});
		}
		participanttable += "</table>";
		$("currentUsers").update(participanttable);

		// Add Participants
		new Ajax.Request(extensiondir + 'keyserver.cgi?service=listAllKeys', {
			method:'get',
			onSuccess: function(transport){
				var allusers = transport.responseText.split("\n");

				var addParticipantsSelect = "<div><select id='addParticipant'>";
				allusers.each(function(user){
					if (!participants.include(user)){
						addParticipantsSelect += "<option value='" + user + "' id='" + user + "'>fetching user name for " + user + " ...</option>";
					}
				});
				
				addParticipantsSelect += "</select><input type='button' value='Invite' onclick='addParticipant();' /></div>";

				$("addUsers").update(addParticipantsSelect);

				allusers.each(function(user){
					new Ajax.Updater(user,extensiondir + 'keyserver.cgi?service=getName&gpgID=' + user,{ method:'get'});
				});

			},
			onFailure: function(){ alert('Failed to fetch keys from keyserver.') }
		});
	}
});


function addParticipant(){
	new Ajax.Request(extensiondir + 'webservices.cgi', {
		method:"get",
		parameters: { service: 'addParticipant', pollID: pollID, gpgID: $F("addParticipant")},
		onSuccess: function(){location.reload();}
	});
}

