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


function showRegisterTab(){
	$('registerTab').update("<a href='javascript:showRegister();'>&nbsp;"+gt.gettext("Register") + "&nbsp;</a></li>");
}

$("tablist").insert({ bottom: "<li id='registerTab' class='nonactive_tab'/>" });
showRegisterTab();

var gActiveTabInnerHTML = $('active_tab').innerHTML
var gContent = $('content').innerHTML;

function showContent(){
	$('content').update(gContent);
	$('active_tab').removeClassName("nonactive_tab");
	$('active_tab').addClassName("active_tab");
	$('registerTab').addClassName("nonactive_tab");
	$('registerTab').removeClassName("active_tab");
	showRegisterTab();
	$('active_tab').update(gActiveTabInnerHTML);
}

function showRegister(){
	var _r = "<h1>dudle</h1>";
	_r += "<h2>" + gt.gettext("Register new Account") + "</h2>";
	_r += "<table id='register' class='settingstable'><tr>";
	_r += "<td class='label'><label for='name'>" + gt.gettext("Name:") + "</label></td>";
	_r += "<td><input id='name' type='text' value='"+ "" +"' /></td>";
	_r += "</tr><tr>";
	_r += "</td><td>";
	_r += "<td><input type='button' value='" + gt.gettext("Cancel")+"' onClick='showContent()'/> ";
	_r += "<input disabled='disabled' type='button' id='next' value='"+ gt.gettext("Please wait while calculating a secret key ...") + "' onclick='secondRegisterStep()'/></td>";
	_r += "</tr></table>";
	$('content').update(_r);

	$('active_tab').removeClassName("active_tab");
	$('active_tab').addClassName("nonactive_tab");
	$('registerTab').addClassName("active_tab");
	$('registerTab').removeClassName("nonactive_tab");

	$('registerTab').update('&nbsp;' + gt.gettext("Register") + '&nbsp;');
	$('active_tab').update('<a href="javascript:showContent()">'+ gActiveTabInnerHTML + '</a>');

	if (!goVoteVector.sec){
		var seed = new SecureRandom();
		goVoteVector.setSecKey(new BigInteger(giDHLENGTH-1,seed),function(){
			$('next').enable();
			$('next').value = gt.gettext('Next');
		});
	} else {
			$('next').enable();
			$('next').value = gt.gettext('Next');
	}
}

function secondRegisterStep(){
	var _r = "<tr>";
	_r += "</td><td>";
	_r += "<td>" + gt.gettext("Please store the secret key somewhere at your computer (e.&thinsp;g., by copying it to a textfile).") + "</td>";
	_r += "</tr><tr>";
	_r += "<td class='label'><label for='key'>" + gt.gettext("Secret Key:") + "</label></td>";
	_r += "<td><textarea readonly='readonly' id='key' type='text' cols='100' rows='3'>";
	_r += goVoteVector.sec.toString(16) + "</textarea></td>";
	_r += "</tr><tr>";
	_r += "<td></td>";
	_r += "<td>" + gt.gettext("Alternatively, you may bookmark this link, which inserts the key into the login field:");
	_r += " <a href=\"javascript:(function(){showLogin('";
	_r += goVoteVector.id + "');document.getElementById('key').value='";
	_r += goVoteVector.sec.toString(16);
	_r += "';})();\">";
	_r += Gettext.strargs(gt.gettext('insert dudle key (%1)'),[$F('name')]) + '</a>.';
	_r += "</td>";
	_r += "</tr><tr>";
	_r += "</td><td>";
	_r += "<td><input type='button' value='" + gt.gettext("Previous")+"' onclick='showRegister(\"" + $F('name') + "\");' /> ";
	_r += "<input type='hidden' id='name' value='" + $F('name') + "' />";
	_r += "<input type='button' value='" + gt.gettext("Finish")+"' onclick='register()'/></td>";
	_r += "</tr>";
	$('register').update(_r);
}

function register(){
	var name = $F('name');

	var _pubkey = "NAME " + $F('name') + "\n";
	_pubkey += "DHPUB " + goVoteVector.pub.toString(16);
	new Ajax.Request(gsExtensiondir + "keyserver.cgi",{
		parameters: {service: 'setKey', gpgKey: _pubkey},
		onFailure: function(transport){
			alert(gt.gettext("Failed to store key, the server said:") + " " + transport.responseText);
		},
		onSuccess: function(transport){
			showContent();
	}});
}

