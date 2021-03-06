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
/*global goDCVoteVector, giDCDHLENGTH, gsDCExtensiondir, gfBrowserName */

function showRegisterTab() {
	$('registerTab').update("<a href='javascript:showRegister(\"\");'>&nbsp;" + _("Register") + "&nbsp;</a></li>");
}

$("tablist").insert({ bottom: "<li id='registerTab' class='nonactive_tab'/>" });
showRegisterTab();

var gDCActiveTabInnerHTML = $('active_tab').innerHTML;
var gDCContent = $('content').innerHTML;

// return to last visible tab
function showContent() {
	$('content').update(gDCContent);
	$('active_tab').removeClassName("nonactive_tab");
	$('active_tab').addClassName("active_tab");
	$('registerTab').addClassName("nonactive_tab");
	$('registerTab').removeClassName("active_tab");
	showRegisterTab();
	$('active_tab').update(gDCActiveTabInnerHTML);
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
	$('active_tab').update('<a href="javascript:showContent()">' + gDCActiveTabInnerHTML + '</a>');

	if (!goDCVoteVector.sec) {
		$('next').disable();
		$('next').value = _("Please wait while calculating a secret key ...");
		goDCVoteVector.setSecKey(new BigInteger(giDCDHLENGTH - 1, new SecureRandom()), function () {
			$('next').enable();
			$('next').value = _('Next');
		});
	}
}

var gsDCUserName;

var gscreateBookmark = _("Create a bookmark of the following link:");
var gsenterkeyhint = _("If you created a bookmark in the previous step, click on it to enter the key.");
var gsbookmarkhint = _("To create a bookmark, you have to right-click on the insert-dudle-key-link and choose the appropriate option from the context menu.");

switch (gfBrowserName()) {
case "ie":
	gscreateBookmark = _("Create a Favorite of the following link:");
	gsenterkeyhint = _("If you created a Favorite in the previous step, click on it to enter the key.");
	gsbookmarkhint = _('To create a Favorite, you have to right-click on the insert-dudle-key-link and click on &ldquo;Add to Favorites&hellip;&rdquo;.');
	break;

case "firefox":
	gsbookmarkhint = _('To create a bookmark, you have to right-click on the insert-dudle-key-link and click on &ldquo;Bookmark This Link&rdquo;.');
	break;

case "safari":
	gsbookmarkhint = _('To create a bookmark, you have to drag-and-drop the link into your bookmark bar.');
	break;

case 'opera':
	gsbookmarkhint = _('To create a bookmark, you have to right-click on the insert-dudle-key-link and click on &ldquo;Bookmark Link&hellip;&rdquo;.');
	break;

case "chrome":
	gsbookmarkhint = _('To create a bookmark, you have to drag-and-drop the link into your bookmark manager.');
	break;
}

function gfHowtoCreateBookmark() {
	$("bookmarkhint").update(gsbookmarkhint);
}

// returns all information about the storage of the secret key within a <tr></tr>
function keyTr() {
	var _r = "<tr>";
	_r += "<td />";
	_r += "<td class='textcolumn'>" + _("You have to store a secret key (like a password) somewhere at your computer. There are two possibilities to do this, please choose one:");
	_r += "<ul><li>";
	_r += gscreateBookmark;

	_r += "<br /><span onclick='gfHowtoCreateBookmark()'><a href=\"javascript:void(";
	_r += "document.getElementById('key').value='";
	_r += goDCVoteVector.sec.toString(16);
	_r += "')\">";
	_r += printf(_('insert dudle key (%1)'), [escapeHtml(gsDCUserName)]) + '</a></span>';

	_r += "<div id='bookmarkhint' class='hint'></div>";


	_r += "</li><li>";

	_r += _("Copy the following key into a textfile:");
	_r += "<br /><textarea readonly='readonly' id='key' type='text' cols='70' rows='3'>";
	_r += goDCVoteVector.sec.toString(16) + "</textarea>";

	_r += "</li></ul></tr>";

	return _r;
}


// the second step (asks to store the key)
function secondRegisterStep() {
	var _r;
	_r = keyTr();
	_r += "<tr>";
	_r += "<td></td>";
	_r += "<td><input type='button' value='" + _("Previous") + "' onclick='showRegister(\"" + escapeJS(escapeHtml(gsDCUserName)) + "\");' /> ";
	_r += "<input type='button' id='next' value='" + _("Next") + "' onclick='thirdRegisterStep()'/></td>";
	_r += "</tr>";
	$('register').update(_r);
}

function gfHowtoEnterKey() {
	$("enterkeyhint").update(gsenterkeyhint);
}

// the third and last step (asks to repeat the key)
function thirdRegisterStep() {
	var _r;
	_r = "<tr><td colspan='3'>";
	_r += _("To validate the correct storage of your key, please enter your secret key:");
	_r += "</td></tr>";
	_r += "<tr><td><label for='key'>" + printf(_("Secret Key for %1:"), [escapeHtml(gsDCUserName)]) + "</label></td>";
	_r += "<td colspan='2'><textarea id='key' type='text' cols='70' rows='3'></textarea></td></tr>";
	_r += "<tr>";
	_r += "<td></td>";
	_r += "<td><input type='button' value='" + _("Previous") + "' onclick='secondRegisterStep()' /> ";
	_r += "<input type='button' value='" + _("Finish") + "' onclick='checkCorrectness()'/>";
	_r += "</td><td style='text-align:right'>";
	_r += "<input type='button' value='" + _("Help") + "' onclick='gfHowtoEnterKey()'/>";
	_r += "</td></tr><tr><td /><td colspan='2' id='enterkeyhint' class='hint' style='max-width:20em' /></tr>";
	_r += "</td></tr><tr><td /><td colspan='2' id='keyValidationError' class='warning' /></tr>";
	$('register').update(_r);
}

// summary
function showFinish() {
	var _r = "<tr>";
	_r += "<td colspan='2' class='textcolumn'>" + _("You registered an account successfully. With your secret key, you are able to participate in anonymous polls. Make sure, that you do not loose your secret key. Without the key, nobody is able to vote for the username.") + "</td>";
	_r += "</tr><tr>";
	_r += "<td colspan='2'><ul>";
	_r += "<li><a href='javascript:showKeyAgain()'>" + _('Click here in order to view and backup your secret key (last chance)') + "</a></li>";
	_r += "<li><a href='javascript:gfDCReload()'>" + _('Return to dudle home and schedule a new poll') + "</a></li>";
	_r += "</ul></td>";
	_r += "</tr><tr id='keyplaceholder'></tr>";
	$('register').update(_r);

}

// send the key to the server
function register() {
	var _pubkey, _ar;

	_pubkey = "NAME " + gsDCUserName + "\n";
	_pubkey += "DHPUB " + goDCVoteVector.pub.toString(16);
	_ar = new Ajax.Request(gsDCExtensiondir + "keyserver.cgi", {
		parameters: {service: 'setKey', gpgKey: _pubkey},
		onFailure: function (transport) {
			alert(_("Failed to store key, the server said:") + " " + transport.responseText);
		},
		onSuccess: function (transport) {
			showFinish();
		}
	});
}

function checkCorrectness() {
	if (goDCVoteVector.sec.toString(16) === $("key").value) {
		register();
	} else {
		$("keyValidationError").update(_("The entered key is wrong!"));
	}
}

// avoid double registration
function checkUserExistance() {
	var label, ar;
	$("registererror").update("");
	if ($F("name")) {
		$("next").disable();
		label = $F("next");
		$("next").value = _("Checking Username");
		ar = new Ajax.Request(gsDCExtensiondir + 'keyserver.cgi', {
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
				gsDCUserName = $F('name');
				secondRegisterStep();
			}
		});
	}
}


var gbDCKeyVisible = false;
function showKeyAgain() {
	if (!gbDCKeyVisible) {
		gbDCKeyVisible = true;
		Element.replace($('keyplaceholder'), "<tr><td class='separator_top' colspan='2'></td></tr>" + keyTr());
	}
}


