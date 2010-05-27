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
/*global gt, gsExtensiondir, gsPollID, gfUpdateName, gfUserTd, gfCancelButton, gfReload, gfRemoveParticipant */
var gsKeyId, gsCheckedName;

var _oParticipants;
var gsSaveButtonLabel = $("savebutton").value;
var gaAllUsers;

$("add_participant").insert({after: "<tr><td colspan='3' class='warning' id='registerederror'></td></tr>"});
function checkcheckbox(successfunction) {
	var ar, curname = $F("add_participant_input");
	$("registerederror").update("");
	if ($F("add_participant_check_privacy_enhanced")) {
		$("savebutton").disable();
		$("savebutton").value = gt.gettext("Checking Username");
		ar = new Ajax.Request(gsExtensiondir + 'keyserver.cgi', {
			method: "get",
			parameters: { service: 'searchId', name: $F("add_participant_input")},
			onSuccess: function (transport) {
				gsCheckedName = curname;
				gsKeyId = transport.responseText;
				$("savebutton").enable();
				$("savebutton").value = gsSaveButtonLabel;
				if (typeof(successfunction) !== 'undefined') {
					successfunction();
				}
			},
			onFailure: function (transport) {
				$("savebutton").value = gsSaveButtonLabel;
				$("add_participant_input").focus();
				$("registerederror").update(gt.gettext("Only registered users can participate privacy-enhanced."));
			}
		});
	} else {
		$("savebutton").enable();
	}
}

var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
	method: "get",
	parameters: { service: 'getParticipants', pollID: gsPollID},
	onFailure: function () {
		alert(gt.gettext('Failed to fetch participant list.'));
	},
	onSuccess: function (transport) {
		var ar, usedKeys;
		/* FIXME evalJSON() is evil, as others may inject some code*/
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

		$("participanttable").select("td.name").each(function (td) {
			td.insert({after: "<td><input type='checkbox' disabled='disabled' /></td>"});
		});
		
		$H(_oParticipants).keys().each(function (_p) {
			var _tr = "<tr class='participantrow' id='" + _p + "_tr' title='" + _p + "'>";
			_tr += gfUserTd(_p, !usedKeys.include(_p));
			_tr += "<td style='text-align:center'><input type='checkbox' disabled='disabled' checked='checked' /></td>";
			_tr += "</tr>";
			$("participanttable").select("tr")[0].insert({after: _tr});
			gfUpdateName(_p);
		});

		
		if ($("add_participant_input")) {
			// Modify participation form
			$("add_participant_input").writeAttribute("onchange", "checkcheckbox();");
			$("add_participant_input").insert({after: "<div id='autocomplete' class='autocomplete' style='display: none; position:absolute;'></div>"});
			ar = new Ajax.Request(gsExtensiondir + 'keyserver.cgi', {
				parameters: {service: 'listAllNames'},
				method: 'get',
				onSuccess: function (transport) {
					gaAllUsers = transport.responseText.split("\n");
					var ac = new Autocompleter.Local('add_participant_input', 'autocomplete', gaAllUsers);
				}
			});

		}

		$("add_participant_input_td").insert({
			after: "<td style='text-align:center' onclick=\"$('add_participant_check_privacy_enhanced').click()\" >" + 
			"<input id='add_participant_check_privacy_enhanced' type='checkbox' onclick='checkcheckbox();event.cancelBubble = true' /></td>"
		});

		$("invite_participants_form").writeAttribute("onsubmit", "return addParticipantCheckOldUser();");
		$("cancelbutton").writeAttribute("type", "button");
		$("cancelbutton").writeAttribute("onclick", "gfReload()");
	}
});

function deleteUser(_userid) {
	gfRemoveParticipant(_userid, gfReload);
}

/* 
 * display edit user form
 * save previous content in
 * gsOldUserTr and gsOldUser
 */
var gsOldUserTr, gsOldUser;
function editUser(_user) {
	var _inputTr, _savebutton, ac,
		_username = $(_user).innerHTML;

	gsSaveButtonLabel = gt.gettext("Save Changes");

	/* if something was saved, restore it */
	if (gsOldUser) {
		_inputTr = $(gsOldUser + "_tr").innerHTML;
		$(gsOldUser + "_tr").update(gsOldUserTr);
	} else {
		if (location.href.include("?edituser=")) {
			location.assign(location.href.gsub(/\?edituser=.*/, ""));
			// FIXME 
			// editUser(_user); 
			// should be run after reload
			return;
		}
		_inputTr = $("add_participant").innerHTML;
		$("add_participant").remove();
	}
	gsOldUser = _user;
	gsOldUserTr = $(_user + "_tr").innerHTML;


	$(_user + "_tr").update(_inputTr);

	_savebutton = '<input type="submit" value="';
	_savebutton += gsSaveButtonLabel;
	_savebutton += '" id="savebutton" />';
	_savebutton += gfCancelButton();
	$("savebutton").parentNode.update(_savebutton);

	$("add_participant_input").value = _username;
	$("add_participant_check_privacy_enhanced").checked = true;
	ac = new Autocompleter.Local('add_participant_input', 'autocomplete', gaAllUsers);
}

function addPEParticipant() {
	var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		parameters: { service: 'addParticipant', pollID: gsPollID, gpgID: gsKeyId},
		onSuccess: function () {
			if (location.href.include("?edituser=")) {
				$("savebutton").insert({
					after: "<input type='hidden' name='deleteuser' value='true' /><input type='hidden' name='edituser' value='" + $$("input[name=olduser]")[0].value + "' />"
				});
				$("invite_participants_form").submit();
			} else {
				gfReload();
			}
		},
		onFailure: function (transport) {
			alert("Failed to add participant!\n" + transport.responseText);
		}
	});
}
function addParticipant() {
	if ($F("add_participant_check_privacy_enhanced")) {
		if (gsCheckedName !== $F("add_participant_input")) {
			checkcheckbox(addPEParticipant);
		} else {
			addPEParticipant();
		}
	} else {
		$("invite_participants_form").submit();
	}
}

function addParticipantCheckOldUser() {
	if (gsOldUser) {
		gfRemoveParticipant(gsOldUser, addParticipant);
	}	else {
		addParticipant();
	}
	return false;
}


