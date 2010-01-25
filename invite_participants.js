var extensiondir='../extensions/dc-net/'
var pollID = (location.href).split("/");
pollID = pollID[pollID.length-2];

new Ajax.Request(extensiondir + 'keyserver.cgi?service=listAllKeys',
  {
    method:'get',
    onSuccess: function(transport){
      var response = transport.responseText.split("\n");

			var privacy_enhanced = "<h2>Invite Participants to Privacy-Enhanced Poll</h2>";
			privacy_enhanced += "<div><select id='addParticipant'>";
			for (var line = 0; line < response.length;line++){
				privacy_enhanced += "<option value='" + response[line] + "' id='" + response[line] + "'>fetching user name ...</option>";
			}
			
			privacy_enhanced += "</select><input type='button' value='Invite' onclick='addParticipant();' /></div>";

			$("wizzard_navigation").insert({ after: privacy_enhanced});
			for (var line = 0; line < response.length;line++){
				new Ajax.Updater(response[line],extensiondir + 'keyserver.cgi?service=getName&gpgID=' + response[line] ,{ method:'get'});
			}

    },
    onFailure: function(){ alert('Failed to fetch keys from keyserver.') }
  });

function addParticipant(){
	new Ajax.Request(extensiondir + 'webservices.cgi', {
		method:"get",
		parameters: { service: 'addParticipant', pollID: pollID, gpgID: $F("addParticipant")},
		onSuccess: function(){location.reload();}
	});
}

