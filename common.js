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

/*global gsDCExtensiondir, gsDCEdit, gsDCDelete, gsDCPollID, gaDCColumnsLen, Gettext */
"use strict";

var gt = new Gettext({ 'domain' : 'dudle' });
function _(msgid) { 
	return gt.gettext(msgid); 
}
function printf(msg, replaceary) {
	return Gettext.strargs(msg, replaceary); 
}

var goDCRealUserNames = {};

function gfDCUpdateName(gpgID) {
	var ar = new Ajax.Updater(gpgID, gsDCExtensiondir + 'keyserver.cgi', {
		parameters: { service: "getName", gpgID: gpgID },
		method: 'get',
		onSuccess: function (transport) {
			goDCRealUserNames[gpgID] = transport.responseText;
		},
		onFailure: function () {
			$(gpgID).update(printf(_("Failed to fetch name for %1."), [gpgID]));
		}
	});
}

function gfDCRemoveParticipant(_user, _successfunc) {
	var ar = new Ajax.Request(gsDCExtensiondir + 'webservices.cgi', {
		method: "get",
		parameters: { service: 'removeParticipant', pollID: gsDCPollID, gpgID: _user },
		onFailure: function (error) {
			alert(error.responseText);
		},
		onSuccess: _successfunc
	});
}

function gfDCReload() {
	location.assign(location.href.gsub(/\?.*/, ''));
}

function gfDCUserTd(userid, editable) {
	var _ret = "";
	if (editable) {
		_ret += "<td><span class='edituser'><a href='javascript:editUser(\"" + userid + "\")'";
		_ret += "title='" + printf(_("Vote for user %1&hellip;"), [userid]) + "'>";
		_ret += gsDCEdit + "</a>";
		_ret += "&nbsp;|&nbsp;<a href='javascript:deleteUser(\"" + userid + "\")'";
		_ret += "title='" + printf(_("Delete user %1&hellip;"), [userid]) + "'>";
		_ret += gsDCDelete + "</a></span></td>";
		_ret += "<td class='name' title='ID: " + userid + "'>";
	} else {
		_ret += "<td class='name' title='ID: " + userid + "' colspan='2'>";
	}
	_ret += "<span id='" + userid + "'>" + printf(_("fetching user name for %1 &hellip;"), [userid]) + "</span>";
	_ret += "</td>";
	return _ret;
}

function gfDCCancelButton() {
	var _ret = '<br />';
	_ret += '<input type="button" id="cancelbutton" value="';
	_ret += _("Cancel");
	_ret += '" onClick="gfDCReload()" style="margin-top: 1ex;" />';
	return _ret;
}

function gfDCKeyTd() {
	return "<td id='key_td' colspan='" + gaDCColumnsLen + "'><textarea id='key' cols='70' rows='3'></textarea></td>";
}

/* returns firefox, ie, opera, safari, chrome, unknown */
function gfBrowserName() {
	var agent, i, browsers;
	agent = navigator.userAgent.toLowerCase();
	browsers =  ["chrome", "epiphany", "opera", "safari", "firefox", "ie"];
	for	(i = 0; i < browsers.length; i++) {
		if (agent.indexOf(browsers[i]) > -1) {
			return browsers[i];
		}
	}
	return "unknown";
}
