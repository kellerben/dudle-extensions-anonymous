var extensiondir='../extensions/dc-net/'
var pollID = (location.href).split("/");
pollID = pollID[pollID.length-2];

$("wizzard_navigation").insert({
	after: "<h2 id='privacy_enhanced'>Invite Participants to Privacy-Enhanced Poll</h2><div id='currentUsers'></div><div id='addUsers'></div>"
});

new Ajax.Request(extensiondir + 'webservices.cgi?service=getParticipants&pollID=' + pollID,{
	method: "get",
	onFailure: function(){ alert('Failed to fetch participant list.') },
	onSuccess: function(transport){
		var participants = transport.responseText.split("\n");

		participanttable = "<table><tr><th>Name</th></tr>";
		participants.each(function(participant){
			participanttable += "<tr><td id='" + participant + "'>fetching user name ...</td></tr>";
		});
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
						addParticipantsSelect += "<option value='" + user + "' id='" + user + "'>fetching user name ...</option>";
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

