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

var gsExtensiondir='../extensions/dc-net/';
var gsPollID = (location.href).split("/");
gsPollID = gsPollID[gsPollID.length-2];

function updateName(gpgID){ 
	new Ajax.Updater(gpgID,gsExtensiondir + 'keyserver.cgi',{
		parameters: { service: "getName", gpgID: gpgID },
		method:'get',
		onFailure: function(){$(gpgID).update("Failed to fetch name for " + gpgID)}
	});
}
