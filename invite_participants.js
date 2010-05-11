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

"use strict";
/*global gt, gsExtensiondir, gsPollID, gfUpdateName, gsEdit */
var gsKeyId;

var _oParticipants;
var gsSaveButtonLabel = $("savebutton").value;
var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
	method: "get",
	parameters: { service: 'getTotalParticipants', pollID: gsPollID},
	onFailure: function () {
		alert(gt.gettext('Failed to fetch participant list.'));
	},
	onSuccess: function (transport) {
		var ar;
		_oParticipants = transport.responseText.evalJSON();
		// Add existing participants

		$("participanttable").select("th").each(function (th) {
			th.insert({after: "<th>" + gt.gettext("Privacy Enhanced") + "</th>"});
		});

		$H(_oParticipants).keys().each(function (_p) {
			var _tr = "<tr class='participantrow'><td title='" + _p + "'>";
//			_tr += "<a href='javascript:TODO()'>"; 
			_tr += "<span id='" + _p + "'>" + Gettext.strargs(gt.gettext("fetching user name for %1 ..."), [_p]) + "</span>";
//			_tr += " <span class='edituser'><sup>" + gsEdit + "</sup></span></a>";
			_tr += "</td>";
			_tr += "<td style='text-align:center'><input type='checkbox' disabled='disabled' checked='checked' /></td>";
			_tr += "</tr>";
			$("participanttable").select("tr")[0].insert({after: _tr});
			gfUpdateName(_p);
		});

		
		// Modify participation form
		$("add_participant_input").writeAttribute("onchange", "checkcheckbox();");
		$("add_participant_input").insert({after: "<div id='autocomplete' class='autocomplete' style='display: none; position:absolute;'></div>"});
		ar = new Ajax.Request(gsExtensiondir + 'keyserver.cgi', {
			parameters: {service: 'listAllNames'},
			method: 'get',
			onSuccess: function (transport) {
				var ac = new Autocompleter.Local('add_participant_input', 'autocomplete', transport.responseText.split("\n"));
			}
		});


		$("participanttable").select("td.name").each(function (td) {
			td.insert({after: "<td style='text-align:center'><input type='checkbox' disabled='disabled' /></td>"});
		});
		
		$("add_participant_input_td").insert({after: "<td style='text-align:center'><input id='add_participant_check_privacy_enhanced' type='checkbox' onclick='checkcheckbox()' /></td>"});

		$("savebutton").writeAttribute("onclick", "addParticipant();");
		$("savebutton").writeAttribute("type", "button");
	}
});

function addParticipant() {
	if ($F("add_participant_check_privacy_enhanced")) {
		var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
			parameters: { service: 'addParticipant', pollID: gsPollID, gpgID: gsKeyId},
			onSuccess: function () {
				if (location.href.include("?edituser=")) {
					$("savebutton").insert({
						after: "<input type='hidden' name='delete_participant' value='true' />"
					});
					$("invite_participants_form").submit();
				} else {
					location.assign(location.href);
				}
			}
		});
	} else {
		$("invite_participants_form").submit();
	}
}

$("add_participant_row").insert({after: "<tr id='registerederror' />"});
function checkcheckbox() {
	$("registerederror").update("");
	if ($F("add_participant_check_privacy_enhanced")) {
		$("savebutton").disable();
		$("savebutton").value = gt.gettext("Checking Username");
		var ar = new Ajax.Request(gsExtensiondir + 'keyserver.cgi', {
			method: "get",
			parameters: { service: 'searchId', name: $F("add_participant_input")},
			onSuccess: function (transport) {
				gsKeyId = transport.responseText;
				$("savebutton").enable();
				$("savebutton").value = gsSaveButtonLabel;
			},
			onFailure: function (transport) {
				$("savebutton").value = gsSaveButtonLabel;
				$("add_participant_input").focus();
				$("registerederror").update("<td colspan='3' class='warning'>" + gt.gettext("Only registered users can participate privacy-enhanced.") + "</td>");
			}
		});
	} else {
		$("savebutton").enable();
	}
}

function showContent() {
	location.assign(location.href);
}
