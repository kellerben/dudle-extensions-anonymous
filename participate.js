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

var giNumTables = 3;
var gaColumns;
var gaParticipants;
var goNumParticipants;
var gsMyID = localStorage.getItem("id");
var goVoteVector = new Vote();

var li = "<li class='nonactive_tab'>";
if (gsMyID){
	li += "<a href='javascript:logout();'>&nbsp;Logout&nbsp;</a>";
} else {
	li += "<a href='javascript:showLogin();'>&nbsp;Login&nbsp;</a>";
	li += "</li><li class='nonactive_tab'>";
	li += "<a href='javascript:showRegister();'>&nbsp;Register&nbsp;</a>";
}
li += "</li>";
$("tablist").insert({ bottom: li});


/*********************************************************
 * fetch columns and participants                        *
 * show participants and start precalculation when ready *
 *********************************************************/
new Ajax.Request(gsExtensiondir + 'webservices.cgi?service=getColumns&pollID=' + gsPollID, {
	method:'get',
	onSuccess: function(transport){
		gaColumns = transport.responseText.split("\n");

		new Ajax.Request(gsExtensiondir + 'webservices.cgi?service=getParticipants&pollID=' + gsPollID,{
			method: "get",
			onFailure: function(){ alert('Failed to fetch participant list.') },
			onSuccess: function(transport){
				gaParticipants = transport.responseText.split("\n");
				if (gaParticipants.length > 0 && gaParticipants[0] != ""){
					goNumParticipants = new BigInteger(gaParticipants.length.toString());
					showParticipants();
					getPollState(function(_pollState){
						if (_pollState == "open"){
							if (gaParticipants.indexOf(gsMyID) != -1) {
								getState(gsMyID,function(_myStatus){
									switch(_myStatus){
									case "notVoted":
									case "flying":
										goVoteVector.startKeyCalc();
										showParticipationRow();
										break;
									}
								});
							}
						} else {
							calcResult();
						}
					});
				}
		}});
}});


var loginisdisplayed = false;
function showLogin(){
	if (!loginisdisplayed){
	var l = "Secret Key:<br /><textarea id='pass' cols='140' rows='3'></textarea><br />";
	l += "<input type='button' value='Login' onclick='login();location.reload();' id='loginbutton' />";
	$("polltitle").insert({before: l});
	}
	loginisdisplayed = true;
}

function showRegister(){
	alert('TODO');
	loginisdisplayed = true;
}

function fingerprint(pub){
	return SHA256_hash(pub);
}

function logout(){
	localStorage.clear();
	location.reload();
}
function login(){
	switch (786){
	case 786:
		var dhmod = new BigInteger("FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A63A3620FFFFFFFFFFFFFFFF",16);
		break;
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

/**********************************************************
 * remove non-standard characters to give a valid html id *
 **********************************************************/
function htmlid(s){
	return s.gsub(" ",".");
}

/***************************************
 * fetches status of _sGpgID and calls *
 * _successFunction with it            *
 ***************************************/
function getState(_sGpgID, _successFunction){
	new Ajax.Request(gsExtensiondir + 'webservices.cgi?service=getState&pollID=' + gsPollID + "&gpgID=" + _sGpgID,{
		method: 'get',
		onSuccess: function(_t){_successFunction(_t.responseText)}
	});
}
/* similar to getState */
function getPollState(_successFunction){
	new Ajax.Request(gsExtensiondir + 'webservices.cgi?service=getPollState&pollID=' + gsPollID,{
		method: 'get',
		onSuccess: function(_t){_successFunction(_t.responseText)}
	});
}

function togglecheckbutton(id){
	$(id).checked = !$(id).checked;
}

/**************************************************
 * insert HTML code, which shows the participants *
 **************************************************/
function showParticipants(){
	var row = "";
	gaParticipants.each(function(participant){
		row += "<tr class='participantrow' id='participant_" + participant + "'>";
		row += "<td class='name' title='" + participant + "' id='" + participant + "'>Fetching Name for " + participant + "...</td>";
		row += "<td class='undecided' colspan='" + gaColumns.length + "' id='status_"+participant+"'>Fetching status...</td>";
		row += "<td class='invisible'></td></tr>";
	});
	$("separator_top").insert({ before: row });


	// give everything humanreadable names
	gaParticipants.each(function(participant){
		updateName(participant);
		getState(participant, function(stat){
				var classname = "undecided";
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
			})
	});
}

/*********************************************************
 * insert HTML code, which shows the row with checkboxes *
 *********************************************************/
function showParticipationRow(){
	participaterow = "";
	gaColumns.each(function(col){
		participaterow += "<td title='"+col+"' class='undecided' onclick=\"togglecheckbutton('"+htmlid(col)+"');\">";
		participaterow += "<input id='"+htmlid(col)+"' type='checkbox' onclick=\"togglecheckbutton('"+htmlid(col)+"');\"/></td>";
	});
	participaterow += "<td id='submit' class='date'><input id='votebutton' onclick='goVoteVector.save();' type='button' value='Calculating keys ...' disabled='disabled'></td>";


	$("add_participant").remove();
	statusnode = 	$("status_" + gsMyID);
	statusnode.insert({ before: participaterow});
	statusnode.remove();
	$("separator_top").remove();
	$("separator_bottom").remove();
}

/*******************************************************************
 * calculate the result from anonymous votes and add it to the sum *
 *******************************************************************/
function calcResult(){
	var _resultMatrix = new Object();
	gaColumns.each(function(_column){
		_resultMatrix[_column] = new Array();
		var _colresult = BigInteger.ZERO;
		var sumelement = $("sum_" + htmlid(_column));
		for (var table = 0; table < giNumTables; table++){
			_resultMatrix[_column][table] = BigInteger.ZERO;
			gaParticipants.each(function(_gpgID){
				new Ajax.Request(gsExtensiondir + 'webservices.cgi?service=getVote&pollID=' + gsPollID + "&gpgID=" + _gpgID + "&timestamp=" + _column + "&tableindex=" + table + "&inverted=false" , {
					method: "get",
					asynchronous: false,
					onSuccess: function(_transport){
						_resultMatrix[_column][table] = _resultMatrix[_column][table].add(new BigInteger(_transport.responseText)).mod(goVoteVector.dcmod);
					},
					onFailure: function(_transport){
						alert("Failed to fetch result for column " + _column + ", participant " + _gpgID + ", table " + table);
					}
				});
			});
			var result = minabs(_resultMatrix[_column][table],goVoteVector.dcmod);
			if (result.compareTo(BigInteger.ZERO) < 0){
				alert("Somebody tried to decrease column " + _column + " by " + result.abs() + "!!!");
				sumelement.setStyle("background-color:red");
				sumelement.addClassName("wrong");
			}
			_colresult = _colresult.add(result);
		}
		if (goNumParticipants.compareTo(_colresult) < 0 && !sumelement.classNames().include("wrong")){
			alert("Somebody tried to cheat using several tables (column: " + _column +")!!!");
			sumelement.setStyle("background-color:red");
			sumelement.addClassName("wrong");
		}
		var totalsum = (new BigInteger(sumelement.textContent)).add(_colresult);
		sumelement.update(totalsum);
	});
}
/********************
 * minabs(5,6) = -1 *
 * minabs(2,6) =  2 *
 ********************/
function minabs(_number, _modulo){
	if(_number.compareTo(_number.subtract(_modulo).abs()) < 0){
		return _number;
	} else {
		return _number.subtract(_modulo);
	}
}

function pseudorandom(dh,uuid,col,tableindex,inverted){
	var seed = SHA256_hash(uuid + col + tableindex + inverted);
	//FIXME: use 256 bit and not only the first 128 bit of SHA256
	var block = new Array(16);
	for(var i = 0; i < 16; i++){
		block[i] = new BigInteger(seed.charAt(i*2) + seed.charAt(i*2+1),16);
	}
	
	AES_Init();

	seed = SHA256_hash(dh.toString());
	var key = new Array(32);
	for(var i = 0; i < 32; i++){
		key[i] = new BigInteger(seed.charAt(i*2) + seed.charAt(i*2+1),16);
	}

	AES_ExpandKey(key);
	AES_Encrypt(block, key);

	AES_Done();
	return block;
}

function hash(block){
	return new BigInteger(SHA256_hash(block),16);
}

function showSaveButton(){
	var v = $("votebutton");
	v.value="Save";
	v.enable();
}

function Vote(){
	var that = this;

	that.g = new BigInteger(localStorage.getItem("g"));
	that.dhmod = new BigInteger(localStorage.getItem("dhmod"));
	that.sec = new BigInteger(localStorage.getItem("sec"));
	that.pub = new BigInteger(localStorage.getItem("pub"));
	that.dcmod = new BigInteger(localStorage.getItem("dcmod"));
	that.participants = new Object();

	/*****************************************************************
	 * Start all calculations, which can be done before vote casting *
	 *****************************************************************/
	this.startKeyCalc = function (){
		that.otherParticipantArray = gaParticipants.without(gsMyID);
		calcNextDHKey();
	}

 	/*********************************
	 * called from the "Save"-Button *
	 *********************************/
	this.save = function (){
		var _failurehappend = false;
		for (var inverted = 0; inverted < 2; inverted++){
			gaColumns.each(function(col){
				var randomTable = Math.round(Math.random()*(giNumTables-1));
				var voteval = $(htmlid(col)).checked ? BigInteger.ONE : BigInteger.ZERO;
				voteval = voteval.subtract(new BigInteger(inverted.toString())).abs();
				that.keyMatrix[inverted][col][randomTable] = that.keyMatrix[inverted][col][randomTable].add(voteval);//.mod(this.dcmod);

				for (var tableindex = 0; tableindex < giNumTables;tableindex++){
					var req = gsExtensiondir + 'webservices.cgi?service=setVote&pollID=' + gsPollID
					req += "&gpgID=" + gsMyID;
					req += "&vote=" + that.keyMatrix[inverted][col][tableindex];
					req += "&timestamp=" + col;
					req += "&tableindex=" + tableindex;
					req += "&inverted=" + (inverted == 0 ? "false" : "true");
					new Ajax.Request(req, {
						method:'get',
						asynchronous: false,
						onFailure: function(transport){
							_failurehappend = true;
					}});
				}
			});
		}

		if (_failurehappend){
			alert("Failed to submit vote!");
		} else {
			location.reload();
		}
	}
 

 	/*******************************************************
 	 * calculate one DC-Net key with one other participant *
 	 *******************************************************/
	that.calcSharedKey = function (otherID,timeslot,tableindex,inverted){
		var cmp = new BigInteger(gsMyID).compareTo(new BigInteger(otherID));
		if (cmp == 0){
				return BigInteger.ZERO;
		}

		var ret = hash(pseudorandom(that.participants[otherID]["dh"],gsPollID,timeslot,tableindex,inverted));
		if (cmp > 0){
			return ret.negate().mod(this.dcmod);
		}
		return ret.mod(this.dcmod);
	}

 
	/**************************************************************************
	 * calculate the DC-Net keys, a participant has to add to his vote vector *
	 **************************************************************************/
	function calculateVoteKeys() {
		that.keyMatrix = new Array();
		for (var inverted = 0; inverted < 2; inverted++){

			that.keyMatrix[inverted] = new Object();
			gaColumns.each(function(col){
				that.keyMatrix[inverted][col] = new Array();

				for (var tableindex = 0; tableindex < giNumTables;tableindex++){
					that.keyMatrix[inverted][col][tableindex] = BigInteger.ZERO;
					for (var id in that.participants){
						var addval = that.calcSharedKey(id,col,tableindex,inverted);

						that.keyMatrix[inverted][col][tableindex] = that.keyMatrix[inverted][col][tableindex].add(addval);
						that.keyMatrix[inverted][col][tableindex] = that.keyMatrix[inverted][col][tableindex].mod(that.dcmod);
					}
				}
			});
		}
	}


	/**************************************************
	 * calculate a DH secret with another participant *
	 **************************************************/
	var i = 0;
	function calcNextDHKey() {
		if (i >= that.otherParticipantArray.length) {
			calculateVoteKeys();
	    window.setTimeout('showSaveButton()', 1000);
			return;
		}

		var id = that.otherParticipantArray[i];

		i++;

		that.participants[id] = new Object();
		if (localStorage.getItem(id) == null){
			that.participants[id] = fetchKey(id);
	
			// calculate the dh secret
		 that.participants[id]["pub"].modPow(that.sec,that.dhmod,
					function (result) {
						that.participants[id]["dh"] = result;
						localStorage.setItem(id,that.participants[id]["dh"]);
						calcNextDHKey();
					});
		} else {
			that.participants[id]["dh"] = new BigInteger(localStorage.getItem(id));
			calcNextDHKey();
		}
	}
}

// TODO: transform into asynchronus call
function fetchKey(id){

	var req = new XMLHttpRequest();
	req.open("POST",gsExtensiondir + "keyserver.cgi",false);
	req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
	req.send("service=getKey&gpgID=" + id.toString());
	req.close;

	if (req.status == 200){
		var participant = {"id" : id};
		var resp = req.responseText.split("\n");
		for (var line = 0; line < resp.length;line++){
			if (resp[line].startsWith("DHPUB ")){
					participant["pub"] = new BigInteger(resp[line].gsub("DHPUB ",""),16);
			}
		}
		return participant;
	} else {
		return 'Something went wrong! The server said: ' + req.responseText;
	}
}
