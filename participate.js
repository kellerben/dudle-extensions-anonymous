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
	var l = "Secret Key:<br /><textarea id='pass' cols='140' rows='3'></textarea><br />";
	l += "<input type='button' value='Login' onclick='login();location.reload();' id='loginbutton' />";
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
		var dhmod = new BigInteger("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A63A3620FFFFFFFFFFFFFFFF",16);
		break
	case 1024:
		var dhmod = new BigInteger("179769313486231590770839156793787453197860296048756011706444423684197180216158519368947833795864925541502180565485980503646440548199239100050792877003355816639229553136239076508735759914822574862575007425302077447712589550957937778424442426617334727629299387668709205606050270810842907692932019128194");
		break;
	case 1536:
		var dhmod = new BigInteger("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF",16);
		break;
	}

	var dcmod = new BigInteger("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",16);
	var g = new BigInteger("2");
	
	var sec = new BigInteger($F('pass'),16);
	var pub = g.modPow(sec,dhmod);

	var id = "0x" + SHA256_hash(pub.toString(16)).slice(56,64).toUpperCase();

	localStorage.setItem("sec",sec);
	localStorage.setItem("pub",pub);
	localStorage.setItem("g",g);
	localStorage.setItem("dhmod",dhmod);
	localStorage.setItem("dcmod",dcmod);
	localStorage.setItem("id",id);
}


function htmlid(s){
	return s.gsub(" ","_").gsub(":","_");
}

function getState(gpgID){
	return extensiondir + 'webservices.cgi?service=getState&pollID=' + pollID + "&gpgID=" + gpgID
}

function togglecheck(id){
	$(id).checked = !$(id).checked;
}

var columns;
new Ajax.Request(extensiondir + 'webservices.cgi?service=getColumns&pollID=' + pollID, {
	method:'get',
	onSuccess: function(transport){
		columns = transport.responseText.split("\n");

		new Ajax.Request(extensiondir + 'webservices.cgi?service=getParticipants&pollID=' + pollID,{
			method: "get",
			onFailure: function(){ alert('Failed to fetch participant list.') },
			onSuccess: function(transport){
				participants = transport.responseText.split("\n");

				if (participants.length > 0 && participants[0] != ""){
					var row = "";
					participants.each(function(participant){
						row += "<tr class='participantrow' id='participant_" + participant + "'>"
						row += "<td class='name' title='" + participant + "' id='" + participant + "'>Fetching Name for " + participant + "...</td>"
						row += "<td class='undecided' colspan='" + columns.length + "' id='status_"+participant+"'>Fetching status...</td>"
						row += "</tr>"
					});
					$("separator_top").insert({ before: row });

					// participate
					if (participants.indexOf(localStorage.getItem("id")) != -1) {
						var id = localStorage.getItem("id");
						participaterow = "<td id='"+id+"' title='"+id+"' class='name'>Fetching name for id " + id + "...</td>";

						columns.each(function(col){
							participaterow += "<td title='"+col+"' class='undecided' onclick=\"togglecheck('"+htmlid(col)+"');\">";
							participaterow += "<input id='"+htmlid(col)+"' type='checkbox' onclick=\"togglecheck('"+htmlid(col)+"');\"/></td>";
						});
						participaterow += "<td id='submit' class='date'><input onclick='vote();' type='button' value='Save'></td>";


						$("add_participant").update("");
						$("participant_" + id).update(participaterow);
						$("separator_top").update("");
					}

					// give everything humanreadable names
					participants.each(function(participant){
						updateName(participant);
						new Ajax.Request(getState(participant),{
							method: 'get',
							onSuccess: function(transport){
								stat = transport.responseText;
								var classname = "undecided"
								var statustext = "Failed to fetch Status";
								switch (stat){
									case "voted":
										classname = 'ayes';
										statustext = 'Has voted.';
										break;
									case 'notVoted':
										classname = 'cno';
										statustext = 'Has not voted yet.';
										break;
									case 'flying':
										classname = 'bmaybe';
										statustext = 'Is to be removed.';
										break;
									case 'kickedOut':
										classname = 'ayes';
										statustext = 'Is removed.';
										break;
								}
								row = $("status_" + participant);
								row.update(statustext);
								row.removeClassName("undecided");
								row.addClassName(classname);
								
							}
						});
					});
				}
		}});
}});

function vote(){
	var votev = new Object();
	columns.each(function(col){
		votev[col] = $(htmlid(col)).checked ? BigInteger.ONE : BigInteger.ZERO;
	});
	for (var v in votev){
		document.write(votev[v]);
	}
	
}
