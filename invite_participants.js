new Ajax.Request('../extensions/dc-net/keyserver.cgi?service=listAllKeys',
  {
    method:'get',
    onSuccess: function(transport){
      var response = transport.responseText.split("\n");

			var privacy_enhanced = "<h2>Invite Participants to Privacy enhanced Poll</h2>";
			privacy_enhanced += "<div><select name='invite_delete'>";
			for (var line = 0; line < response.length;line++){
				privacy_enhanced += "<option value='" + response[line] + "' id='" + response[line] + "'>fetching user name ...</option>";
			}
			
			privacy_enhanced += "</select><input type='button' value='Invite' /></div>";

			$("wizzard_navigation").insert({ after: privacy_enhanced});
			for (var line = 0; line < response.length;line++){
				new Ajax.Updater(response[line],'../extensions/dc-net/keyserver.cgi?service=getName&gpgID=' + response[line] ,{ method:'get'});
			}

    },
    onFailure: function(){ alert('Could not fetch keys.') }
  });

