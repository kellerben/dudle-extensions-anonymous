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
/*global gsDCExtensiondir, gsDCPollID, gfDCUpdateName, gfDCUserTd, gfDCCancelButton, gfDCReload, gfDCRemoveParticipant */
var gsDCKeyId, gsDCCheckedName;

var _oParticipants;
var gsDCSaveButtonLabel = $("savebutton").value;
var gaAllUsers;

$("add_participant").insert({after: "<tr><td colspan='4' class='warning' id='registerederror'></td></tr>"});
function checkcheckbox(successfunction) {
	var ar, curname = $F("add_participant_input");
	$("registerederror").update("");
	if ($F("add_participant_check_privacy_enhanced")) {
		$("savebutton").disable();
		$("savebutton").value = _("Checking Username");
		ar = new Ajax.Request(gsDCExtensiondir + 'keyserver.cgi', {
			method: "get",
			parameters: { service: 'searchId', name: $F("add_participant_input")},
			onSuccess: function (transport) {
				gsDCCheckedName = curname;
				gsDCKeyId = transport.responseText;
				$("savebutton").enable();
				$("savebutton").value = gsDCSaveButtonLabel;
				if (typeof(successfunction) !== 'undefined') {
					successfunction();
				}
			},
			onFailure: function (transport) {
				$("savebutton").value = gsDCSaveButtonLabel;
				$("add_participant_input").focus();
				$("registerederror").update(_("Only registered users can vote anonymously."));
			}
		});
	} else {
		$("savebutton").enable();
	}
}

var ar = new Ajax.Request(gsDCExtensiondir + 'webservices.cgi', {
	method: "get",
	parameters: { service: 'getParticipants', pollID: gsDCPollID},
	onFailure: function () {
		alert(_('Failed to fetch participant list.'));
	},
	onSuccess: function (transport) {
		var ar, usedKeys;
		/* FIXME evalJSON() is evil, as others may inject some code*/
		_oParticipants = transport.responseText.evalJSON();
		// Add existing participants

		$("participanttable").select("th").each(function (th) {
			th.insert({after: "<th>" + _("Vote Anonymously") + "</th>"});
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
			_tr += gfDCUserTd(_p, !usedKeys.include(_p));
			_tr += "<td style='text-align:center'><input type='checkbox' disabled='disabled' checked='checked' /></td>";
			_tr += "</tr>";
			$("participanttable").select("tr")[0].insert({after: _tr});
			gfDCUpdateName(_p);
		});

		
		if ($("add_participant_input")) {
			// Modify participation form
			$("add_participant_input").writeAttribute("onchange", "checkcheckbox();");
			$("add_participant_input").insert({after: "<div id='autocomplete' class='autocomplete' style='display: none; position:absolute;'></div>"});
			ar = new Ajax.Request(gsDCExtensiondir + 'keyserver.cgi', {
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
		$("cancelbutton").writeAttribute("onclick", "gfDCReload()");
	}
});

function deleteUser(_userid) {
	gfDCRemoveParticipant(_userid, gfDCReload);
}

/* 
 * display edit user form
 * save previous content in
 * gsDCOldUserTr and gsDCOldUser
 */
var gsDCOldUserTr, gsDCOldUser;
function editUser(_user) {
	var _inputTr, _savebutton, ac,
		_username = $(_user).innerHTML;

	gsDCSaveButtonLabel = _("Save Changes");

	/* if something was saved, restore it */
	if (gsDCOldUser) {
		_inputTr = $(gsDCOldUser + "_tr").innerHTML;
		$(gsDCOldUser + "_tr").update(gsDCOldUserTr);
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
	gsDCOldUser = _user;
	gsDCOldUserTr = $(_user + "_tr").innerHTML;


	$(_user + "_tr").update(_inputTr);

	_savebutton = '<input type="submit" value="';
	_savebutton += gsDCSaveButtonLabel;
	_savebutton += '" id="savebutton" />';
	_savebutton += gfDCCancelButton();
	$("savebutton").parentNode.update(_savebutton);

	$("add_participant_input").value = _username;
	$("add_participant_check_privacy_enhanced").checked = true;
	ac = new Autocompleter.Local('add_participant_input', 'autocomplete', gaAllUsers);
}

function addPEParticipant() {
	var ar = new Ajax.Request(gsDCExtensiondir + 'webservices.cgi', {
		parameters: { service: 'addParticipant', pollID: gsDCPollID, gpgID: gsDCKeyId},
		onSuccess: function () {
			if (location.href.include("?edituser=")) {
				$("savebutton").insert({
					after: "<input type='hidden' name='deleteuser' value='true' /><input type='hidden' name='edituser' value='" + $$("input[name=olduser]")[0].value + "' />"
				});
				$("invite_participants_form").submit();
			} else {
				gfDCReload();
			}
		},
		onFailure: function (transport) {
			alert("Failed to add participant!\n" + transport.responseText);
		}
	});
}
function addParticipant() {
	if ($F("add_participant_check_privacy_enhanced")) {
		if (gsDCCheckedName !== $F("add_participant_input")) {
			checkcheckbox(addPEParticipant);
		} else {
			addPEParticipant();
		}
	} else {
		$("invite_participants_form").submit();
	}
}

function addParticipantCheckOldUser() {
	if (gsDCOldUser) {
		gfDCRemoveParticipant(gsDCOldUser, addParticipant);
	}	else {
		addParticipant();
	}
	return false;
}


