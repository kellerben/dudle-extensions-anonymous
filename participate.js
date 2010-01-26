/****************************************************************************
 * Copyright 2009,2010 Benjamin Kellermann                                  *
 *                                                                          *
 * This file is part of dudle.                                              *
 *                                                                          *
 * Dudle is free software: you can redistribute it and*or modify it under   *
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
 * along with dudle.  If not, see <http:**www.gnu.org*licenses*>.           *
 ***************************************************************************/

var li = "<li class='nonactive_tab'><a href='javascript:showLogin();'>&nbsp;Login&nbsp;</a></li>"
li += "<li class='nonactive_tab'><a href='javascript:showRegister();'>&nbsp;Register&nbsp;</a></li>"
$("tablist").insert({ bottom: li});

var show = false;
function showLogin(){
	if (!show){
	var l = "<form method='post' action='.'>";
	l += "<table class='settingstable'><tr><td class='label' ><label for='name'>Name:</label></td>";
	l += "<td><input id='name' type='text' /></td></tr>";
	l += "<tr><td class='label'><label for='pass'>Password:</label></td><td><input id='pass' type='password' /></td></tr>";
	l += "<tr id='loginrow'><td></td><td><input type='button' value='login' onclick='login();location.reload();' id='loginbutton' /></td></tr></table></form>";
	$("polltitle").insert({before: l});
	}
	show = true;
}

function showRegister(){
	alert('TODO');
}

function fingerprint(pub){
	return SHA256_hash(pub);
}

function login(){
	switch (786){
	case 786:
		var q = new BigInteger("1552518092300708935130918131258481755631334049434514313202351194902966239949102107258669453876591642442910007680288864229150803718918046342632727613031282983744380820890196288509170691316593175367469551763119843371637221007210577919");
		break
	case 1024:
		var q = new BigInteger("179769313486231590770839156793787453197860296048756011706444423684197180216158519368947833795864925541502180565485980503646440548199239100050792877003355816639229553136239076508735759914822574862575007425302077447712589550957937778424442426617334727629299387668709205606050270810842907692932019128194");
		break;
	case 1536:
		var q = new BigInteger("2410312426921032588552076022197566074856950548502459942654116941958108831682612228890093858261341614673227141477904012196503648957050582631942730706805009223062734745341073406696246014589361659774041027169249453200378729434170325843778659198143763193776859869524088940195577346119843545301547043747207749969763750084308926339295559968882457872412993810129130294592999947926365264059284647209730384947211681434464714438488520940127459844288859336526896320919633919");
		break;
	}

	var n = new BigInteger("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",16);
	var g = new BigInteger("2");
	
	var sec = new BigInteger(b64tohex($F('pass')),16);
	var pub = g.modPow(sec,q);
	var fpr = fingerprint(pub.toString());

	localStorage.setItem("name",$F('name'));
	localStorage.setItem("sec",sec);
	localStorage.setItem("q",q);
	localStorage.setItem("n",n);
	localStorage.setItem("g",g);
	localStorage.setItem("pub",pub);
	localStorage.setItem("fingerprint",fpr);
}

