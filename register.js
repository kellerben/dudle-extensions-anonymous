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
/*global goVoteVector, giDHLENGTH, gsExtensiondir */

function showRegisterTab() {
	$('registerTab').update("<a href='javascript:showRegister(\"\");'>&nbsp;" + _("Register") + "&nbsp;</a></li>");
}

$("tablist").insert({ bottom: "<li id='registerTab' class='nonactive_tab'/>" });
showRegisterTab();

var gActiveTabInnerHTML = $('active_tab').innerHTML;
var gContent = $('content').innerHTML;

// return to last visible tab
function showContent() {
	$('content').update(gContent);
	$('active_tab').removeClassName("nonactive_tab");
	$('active_tab').addClassName("active_tab");
	$('registerTab').addClassName("nonactive_tab");
	$('registerTab').removeClassName("active_tab");
	showRegisterTab();
	$('active_tab').update(gActiveTabInnerHTML);
}

// the first step
function showRegister(name) {
	var _r = "<h1>dudle</h1>";
	_r += "<h2>" + _("Register new Account") + "</h2>";
	_r += "<table id='register' class='settingstable'><tr>";
	_r += "<td class='label'><label for='name'>" + _("Name:") + "</label></td>";
	_r += "<td><input id='name' type='text' value='" + name + "' /></td>";
	_r += "</tr><tr>";
	_r += "</td><td>";
	_r += "<td><input type='button' value='" + _("Cancel") + "' onClick='showContent()'/> ";
	_r += "<input type='button' id='next' value='" + _("Next") + "' onclick='checkUserExistance()'/></td>";
	_r += "</tr><tr id='registererror' /></table>";
	$('content').update(_r);

	$('active_tab').removeClassName("active_tab");
	$('active_tab').addClassName("nonactive_tab");
	$('registerTab').addClassName("active_tab");
	$('registerTab').removeClassName("nonactive_tab");

	$('registerTab').update('&nbsp;' + _("Register") + '&nbsp;');
	$('active_tab').update('<a href="javascript:showContent()">' + gActiveTabInnerHTML + '</a>');

	if (!goVoteVector.sec) {
		$('next').disable();
		$('next').value = _("Please wait while calculating a secret key ...");
		goVoteVector.setSecKey(new BigInteger(giDHLENGTH - 1, new SecureRandom()), function () {
			$('next').enable();
			$('next').value = _('Next');
		});
	} 
}

var gsUserName;

// returns all information about the storage of the secret key within a <tr></tr>
function keyTr() {
	var _r = "<tr>";
	_r += "<td></td>";
	_r += "<td class='textcolumn'>" + _("Please store the secret key somewhere at your computer (e.&thinsp;g., by copying it to a textfile).") + "</td>";
	_r += "</tr><tr>";
	_r += "<td class='label'><label for='key'>" + _("Secret Key:") + "</label></td>";
	_r += "<td><textarea readonly='readonly' id='key' type='text' cols='100' rows='3'>";
	_r += goVoteVector.sec.toString(16) + "</textarea></td>";
	_r += "</tr><tr>";
	_r += "<td></td>";
	_r += "<td class='textcolumn'>" + _("Alternatively, you may bookmark this link, which inserts the key into the login field:");
	_r += " <a href=\"javascript:void(";
	_r += "document.getElementById('key').value='";
	_r += goVoteVector.sec.toString(16);
	_r += "')\">";
	_r += printf(_('insert dudle key (%1)'), [gsUserName]) + '</a>.';
	_r += "</td>";
	_r += "</tr>";
	return _r;
}

// the second and last step (asks to store the key)
function secondRegisterStep() {
	var _r;
	gsUserName = $F('name');
	_r = keyTr();
	_r += "<tr>";
	_r += "<td></td>";
	_r += "<td><input type='button' value='" + _("Previous") + "' onclick='showRegister(\"" + gsUserName + "\");' /> ";
	_r += "<input type='button' value='" + _("Finish") + "' onclick='register()'/></td>";
	_r += "</tr>";
	$('register').update(_r);
}

// avoid double registration
function checkUserExistance() {
	var label, ar;
	$("registererror").update("");
	if ($F("name")) {
		$("next").disable();
		label = $F("next");
		$("next").value = _("Checking Username");
		ar = new Ajax.Request(gsExtensiondir + 'keyserver.cgi', {
			method: "get",
			parameters: { service: 'searchId', name: $F("name")},
			onSuccess: function (transport) {
				$("next").value = label;
				$("name").focus();
				$("registererror").update("<td colspan='2' class='warning'>" + _("A user with the same name already exists.") + "</td>");
				$("next").enable();
			},
			onFailure: function (transport) {
				$("next").value = label;
				$("next").enable();
				secondRegisterStep();
			}
		});
	}
}


var gbKeyVisible = false;
function showKeyAgain() {
	if (!gbKeyVisible) {
		gbKeyVisible = true;
		Element.replace($('keyplaceholder'), "<tr><td class='separator_top' colspan='2'></td></tr>" + keyTr());
	}
}

// summary
function showFinish() {
	var _r = "<tr>";
	_r += "<td colspan='2' class='textcolumn'>" + _("You successfully registered an Account. With your secret key, you are able to participate in anonymous polls. Make sure, that you do not loose your secret key. Without the key, nobody is able to vote for the username.") + "</td>";
	_r += "</tr><tr>";
	_r += "<td colspan='2'><ul>";
	_r += "<li><a href='javascript:showKeyAgain()'>" + _('Click here in order to view and backup your secret key (last chance)') + "</a></li>";
	_r += "<li><a href='javascript:gfReload()'>" + _('Return to dudle home and Schedule a new Poll') + "</a></li>";
	_r += "</ul></td>";
	_r += "</tr><tr id='keyplaceholder'></tr>";
	$('register').update(_r);

}

// send the key to the server
function register() {
	var _pubkey, _ar;

	_pubkey = "NAME " + gsUserName + "\n";
	_pubkey += "DHPUB " + goVoteVector.pub.toString(16);
	_ar = new Ajax.Request(gsExtensiondir + "keyserver.cgi", {
		parameters: {service: 'setKey', gpgKey: _pubkey},
		onFailure: function (transport) {
			alert(_("Failed to store key, the server said:") + " " + transport.responseText);
		},
		onSuccess: function (transport) {
			showFinish();
		}
	});
}

