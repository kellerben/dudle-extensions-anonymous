/****************************************************************************
 * Copyright 2009,2010 Benjamin Kellermann                                  *
 *                                                                          *
 * This file is part of dudle.                                              *
 *                                                                          *
 * Dudle is free software: you can redistribute it and/or modify it under   *
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
 * along with dudle.  If not, see <http://www.gnu.org/licenses/>.           *
 ***************************************************************************/

new Ajax.Request(gsExtensiondir + 'webservices.cgi?service=getParticipants&pollID=' + gsPollID,{
	method: "get",
	onFailure: function(){ alert('Failed to fetch participant list.') },
	onSuccess: function(transport){

		$("add_participant_input").insert({after:"<div id='autocomplete' class='autocomplete' style='display: none; position:relative;'></div>"});
		new Ajax.Autocompleter('add_participant_input','autocomplete',gsExtensiondir + 'keyserver.cgi',{paramName:"search",parameters:"service=searchName"} );

		$("participanttable").select("th").each(function(th){
			th.insert({after:"<th>Privacy Enhanced</th>"});
		});

		$("participanttable").select("td.name").each(function(td){
			td.insert({after:"<td><input type='checkbox' disabled='disabled' checked='checked' /></td>"});
		});
		
		$("add_participant_input_td").insert({after:"<td><input id='add_participant_check_privacy_enhanced' type='checkbox' /></td>"});

		$("savebutton").writeAttribute("onclick", "addParticipant();");
		$("savebutton").writeAttribute("type", "button");

/*		$("wizzard_navigation").insert({
			after: "<h2 id='privacy_enhanced'>Invite Participants to Privacy-Enhanced Poll</h2><div id='currentUsers'></div><div id='addUsers'></div>"
		});

		var participants = transport.responseText.split("\n");

		if (participants.length > 0 && participants[0] != ""){
			var participanttable = "<table><tr><th>Name</th></tr>";
			participants.each(function(participant){
				participanttable += "<tr><td title='" + participant + "' id='" + participant + "'>fetching user name for "+ participant +" ...</td></tr>";
			});

			participanttable += "</table>";
			$("currentUsers").update(participanttable);
		}

		new Ajax.Request(gsExtensiondir + 'webservices.cgi?service=getPollState&pollID=' + gsPollID,{
			method: "get",
			onSuccess: function(pollstate){
				if (pollstate.responseText == "open"){
					// Add Participants
					new Ajax.Request(gsExtensiondir + 'keyserver.cgi?service=listAllKeys', {
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
				} else {
					$("privacy_enhanced").update("Participants of Privacy-Enhanced Poll");
					participants.each(function(user){updateName(user)});
				}

		}});*/
	}
});

function addParticipant(){
	if ($F("add_participant_check_privacy_enhanced")){
		new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
			method:"get",
			parameters: { service: 'addParticipant', pollID: gsPollID, gpgID: $F("add_participant_input")},
			onSuccess: function(){location.reload();}
		});
	} else {
		$("invite_participants_form").submit();
	}
}
