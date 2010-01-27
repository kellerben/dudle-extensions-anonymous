/****************************************************************************
 * Copyright 2009,2010 Benjamin Kellermann                                  *
 *                                                                          *
 * This file is part of dudle.                                              *
 *                                                                          *
 * Dudle is free software: you can redistribute it and*or modify it under   *
 * the terms of the GNU Affero General Public License as published by       *
 * the Free Software Foundation, either version 3 of the License, or        *
 * (at your option) any later version.                                      *
 *                                                                          *
 * Dudle is distributed in the hope that it will be useful, but WITHOUT ANY *
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or        *
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public     *
 * License for more details.                                                *
 *                                                                          *
 * You should have received a copy of the GNU Affero General Public License *
 * along with dudle.  If not, see <http:**www.gnu.org*licenses*>.           *
 ***************************************************************************/

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
				participanttable += "<tr><td title='" + participant + "' id='" + participant + "'>fetching user name for "+ participant +" ...</td></tr>";
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
						addParticipantsSelect += "<option value='" + user + "' id='" + user + "' title='" + user + "'>fetching user name for " + user + " ...</option>";
					}
				});
				
				addParticipantsSelect += "</select><input type='button' value='Invite' onclick='addParticipant();' /></div>";

				$("addUsers").update(addParticipantsSelect);

				allusers.each(function(user){updateName(user)});

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

