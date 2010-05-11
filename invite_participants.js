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
		var ar, usedKeys;
		_oParticipants = transport.responseText.evalJSON();
		// Add existing participants

		$("participanttable").select("th").each(function (th) {
			th.insert({after: "<th>" + gt.gettext("Privacy Enhanced") + "</th>"});
		});

		usedKeys = $H(_oParticipants).collect(function (_elem) {
			if (_elem[1].voted) {
				// participant has voted so he and every of his usedKeys cannot be removed easily
				return [_elem[0], _elem[1].voted.collect(function (singlevote) {
					return singlevote[1];
				})];
			} else {
				return null; 
			}
		}).compact().flatten();

		$H(_oParticipants).keys().each(function (_p) {
			var _tr = "<tr class='participantrow' id='" + _p + "_tr'><td title='" + _p + "'>";
			if (!usedKeys.include(_p)) {
				_tr += "<a href='javascript:editUser(\"" + _p + "\")'>";
			}
			_tr += "<span id='" + _p + "'>" + Gettext.strargs(gt.gettext("fetching user name for %1 ..."), [_p]) + "</span>";
			if (!usedKeys.include(_p)) {
				_tr += " <span class='edituser'><sup>" + gsEdit + "</sup></span></a>";
			}
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

function editUser(_user) {
	var _inputTr, _savebutton,
		_username = $(_user).innerHTML;

	_inputTr = $("add_participant_row").innerHTML;

	gsSaveButtonLabel = gt.gettext("Save Changes");;

	$("add_participant_row").remove();
	$(_user + "_tr").update(_inputTr);
	_savebutton = '<input type="button" value="';
	_savebutton += gsSaveButtonLabel;
	_savebutton += '" id="savebutton" onclick="addParticipant();" />';
	_savebutton += '<br />';
	_savebutton += '<input type="button" value="';
	_savebutton += gt.gettext("Delete User");
	_savebutton += '" onClick="removeParticipant(\'' + _user + '\')" style="margin-top: 1ex;" />';
	$("savebutton").replace(_savebutton);

	$("add_participant_input").value = _username;
	$("add_participant_check_privacy_enhanced").checked = true;
}

function removeParticipant(_user) {
	var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		method: "get",
		parameters: { service: 'removeParticipant', pollID: gsPollID, gpgID: _user },
		onFailure: function (error) {
			alert(error.responseText);
		},
		onSuccess: function (transport) {
			location.assign(location.href);
		}
	});
}

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
