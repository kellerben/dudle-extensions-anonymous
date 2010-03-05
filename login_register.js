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

var Vote = function (){
	var that = this;
	that.participants = new Object();

	switch (giDHLENGTH){
	case 786:
		this.dhmod = new BigInteger("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A63A3620FFFFFFFFFFFFFFFF",16);
		break;
	case 1024:
		this.dhmod = new BigInteger("179769313486231590770839156793787453197860296048756011706444423684197180216158519368947833795864925541502180565485980503646440548199239100050792877003355816639229553136239076508735759914822574862575007425302077447712589550957937778424442426617334727629299387668709205606050270810842907692932019128194");
		break;
	case 1536:
		this.dhmod = new BigInteger("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF",16);
		break;
	}

	this.dcmod = new BigInteger("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",16);
	this.g = new BigInteger("2");

	this.setSecKey = function(_key){
		this.sec = _key;
		this.pub = this.g.modPow(this.sec,this.dhmod);
		this.id = "0x" + SHA256_hash(this.pub.toString(16)).slice(56,64).toUpperCase();
	}
	this.storeKey = function(){
		localStorage.setItem("sec",goVoteVector.sec);
		localStorage.setItem("pub",goVoteVector.pub);
		localStorage.setItem("id",goVoteVector.id);
	}
}

var giDHLENGTH = 786;
var giNumTables = 3;
var gaColumns;
var gaParticipants;
var goNumParticipants;
var goVoteVector = new Vote();
var gsMyID;

if ("localStorage" in window){
	gsMyID = localStorage.getItem("id");
	var li = "<li class='nonactive_tab'>";
	if (gsMyID){
		li += "<a href='javascript:logout();'>&nbsp;Logout&nbsp;</a>";
	} else {
		li += "<a href='javascript:showLogin();'>&nbsp;Login&nbsp;</a>";
	}
	li += "</li>";
	$("tablist").insert({ bottom: li});

	$("polltitle").insert({before: "<div id='login'></div>"});
	function showLogin(){
		var _l = "<table class='settingstable'><tr>";
		_l += "<td class='label'><label for='key'>Secret Key:</label></td>";
		_l += "<td><textarea id='key' cols='100' rows='3'></textarea></td>";
		_l += "</tr><tr>";
		_l += "</td><td>";
		_l += "<td class='separator_bottom'><input type='button' value='Login' onclick='login()' id='loginbutton' /></td>";
		_l += "</tr><tr >";
		_l += "</td><td>";
		_l += "<td class='separator_top'><a href='javascript:showRegister();'>Register new Account</a></td>";
		_l += "</tr></table>";
		$('login').update(_l);
	}

	function showRegister(){
		var seed = new SecureRandom();
		goVoteVector.setSecKey(new BigInteger(giDHLENGTH-1,seed));

		var _r = "<table class='settingstable'><tr>";
		_r += "<td class='label'><label for='name'>Name:</label></td>";
		_r += "<td><input id='name' type='text' /></td>";
		_r += "</tr><tr>";
		_r += "<td class='label'><label for='key'>Secret Key:</label></td>";
		_r += "<td><textarea disabled='disabled' id='key' type='text' cols='100' rows='3'>";
		_r += goVoteVector.sec.toString(16) + "</textarea></td>";
		_r += "</tr><tr>";
		_r += "</td><td>";
		_r += "<td><input type='button' value='Register' onclick='register()'/></td>";
		_r += "</tr></table>";
		$('login').update(_r);
	}

	function register(){
		var name = $F('name');
		goVoteVector.storeKey();
		var _pubkey = "NAME " + $F('name') + "\n";
		_pubkey += "DHPUB " + goVoteVector.pub.toString(16);
		new Ajax.Request(gsExtensiondir + "keyserver.cgi",{
			parameters: {service: 'setKey', gpgKey: _pubkey},
			onFailure: function(transport){
				alert("Failed to store key at server: " + transport.responseText);
			},
			onSuccess: function(transport){
				alert("Please store this key to any secret location:\n"+goVoteVector.sec.toString(16));
				location.reload();
		}});
	}

	function logout(){
		localStorage.clear();
		location.reload();
	}
	function login(){
		goVoteVector.setSecKey(new BigInteger($F('key'),16));
		goVoteVector.storeKey();
		location.reload();
	}
}

