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

/*global gsExtensiondir, gsEdit, gsDelete */
"use strict";

var gt = new Gettext({ 'domain' : 'dudle_dc-net' });
var gsPollID = (window.location.href).split("/");
gsPollID = gsPollID[gsPollID.length - 2];
var goRealUserNames = {};

function gfUpdateName(gpgID) {
	var ar = new Ajax.Updater(gpgID, gsExtensiondir + 'keyserver.cgi', {
		parameters: { service: "getName", gpgID: gpgID },
		method: 'get',
		onSuccess: function (transport) {
			goRealUserNames[gpgID] = transport.responseText;
		},
		onFailure: function () {
			$(gpgID).update(Gettext.strargs(gt.gettext("Failed to fetch name for %1."), [gpgID]));
		}
	});
}

function gfRemoveParticipant(_user, _successfunc) {
	var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		method: "get",
		parameters: { service: 'removeParticipant', pollID: gsPollID, gpgID: _user },
		onFailure: function (error) {
			alert(error.responseText);
		},
		onSuccess: _successfunc
	});
}

function gfReload() {
	location.assign(location.href.gsub(/\?.*/, ''));
}

function gfUserTd(userid, editable) {
	var _ret = "";
	if (editable) {
		_ret += "<td><span class='edituser'><a href='javascript:editUser(\"" + userid + "\")'";
		_ret += "title='" + Gettext.strargs(gt.gettext("Edit user %1..."), [userid]) + "'>";
		_ret += gsEdit + "</a>";
		_ret += " | <a href='javascript:deleteUser(\"" + userid + "\")'";
		_ret += "title='" + Gettext.strargs(gt.gettext("Delete user %1..."), [userid]) + "'>";
		_ret += gsDelete + "</a></span></td>";
		_ret += "<td class='name'>";
	} else {
		_ret += "<td class='name' colspan='2'>";
	}
	_ret += "<span id='" + userid + "'>" + Gettext.strargs(gt.gettext("fetching user name for %1 ..."), [userid]) + "</span>";
	_ret += "</td>";
	return _ret;
}

function gfCancelButton() {
	var _ret = '<br />';
	_ret += '<input type="button" id="cancelbutton" value="';
	_ret += gt.gettext("Cancel");
	_ret += '" onClick="gfReload()" style="margin-top: 1ex;" />';
	return _ret;
}
