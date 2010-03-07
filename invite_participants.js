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

new Ajax.Request(gsExtensiondir + 'webservices.cgi',{
	method: "get",
	parameters: { service: 'getParticipants', pollID: gsPollID},
	onFailure: function(){ alert('Failed to fetch participant list.') },
	onSuccess: function(transport){
		// Add existing participants

		$("participanttable").select("th").each(function(th){
			th.insert({after:"<th>Privacy Enhanced</th>"});
		});

		var participants = transport.responseText.split("\n");
		if (participants.length > 0 && participants[0] != ""){
			var privparticipantrows = "";
			participants.each(function(participant){
				privparticipantrows += "<tr class='participantrow'><td title='" + participant + "' id='" + participant + "'>fetching user name for "+ participant +" ...</td>";
				privparticipantrows += "<td style='text-align:center'><input type='checkbox' disabled='disabled' checked='checked' /></td>"
				privparticipantrows += "</tr>";
			});

			$("participanttable").select("tr")[0].insert({after:privparticipantrows});
		}
		participants.each(function(user){updateName(user)});
		
		// Modify participation form
		$("add_participant_input").writeAttribute("onchange", "checkcheckbox();");
		$("add_participant_input").insert({after:"<div id='autocomplete' class='autocomplete' style='display: none; position:absolute;'></div>"});
		new Ajax.Request(gsExtensiondir + 'keyserver.cgi', {
			parameters: {service: 'listAllNames'},
			method:'get',
			onSuccess: function(transport){
				new Autocompleter.Local('add_participant_input','autocomplete',transport.responseText.split("\n"));
		}});


		$("participanttable").select("td.name").each(function(td){
			td.insert({after:"<td style='text-align:center'><input type='checkbox' disabled='disabled' /></td>"});
		});
		
		$("add_participant_input_td").insert({after:"<td style='text-align:center'><input id='add_participant_check_privacy_enhanced' type='checkbox' onclick='checkcheckbox()' /></td>"});

		$("savebutton").writeAttribute("onclick", "addParticipant();");
		$("savebutton").writeAttribute("type", "button");
	}
});

function addParticipant(){
	if ($F("add_participant_check_privacy_enhanced")){
		new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
			parameters: { service: 'addParticipant', pollID: gsPollID, gpgID: gsKeyId},
			onSuccess: function(){location.assign(location.href);}
		});
	} else {
		$("invite_participants_form").submit();
	}
}

$("add_participant_row").insert({after:"<tr id='registerederror' />"});
var gsKeyId;
function checkcheckbox(){
	$("registerederror").update("");
	if ($F("add_participant_check_privacy_enhanced")){
		$("savebutton").disable();
		$("savebutton").value = "Checking username";
		new Ajax.Request(gsExtensiondir + 'keyserver.cgi', {
			method:"get",
			parameters: { service: 'searchId', name: $F("add_participant_input")},
			onSuccess: function(transport){
				gsKeyId = transport.responseText;
				$("savebutton").enable();
				$("savebutton").value = "Invite";
			},
			onFailure: function(transport){
				$("savebutton").value = "Invite";
				$("registerederror").update("<td colspan='3' class='warning'>Only registered users can participate privacy-enhanced.</td>");
			}
		});
	} else {
		$("savebutton").enable();
	}
}

showContent = function(){
	location.assign(location.href);
}
