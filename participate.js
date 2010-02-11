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

function fingerprint(pub){
	return SHA256_hash(pub);
}

/**********************************************************
 * remove non-standard characters to give a valid html id *
 **********************************************************/
function htmlid(s){
	return s.gsub(/[^A-Z^a-z^0-9^\-^_^:^\.]/,".");
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
						statustext = 'Has voted anonymously.';
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
	var _resultMatrix = new Array();
	var _colResults = new Array();

	for (var _inverted = 0; _inverted < 2; _inverted++){
		_resultMatrix[_inverted] = new Object();
		_colResults[_inverted] = new Object();

		gaColumns.each(function(_col){
			_resultMatrix[_inverted][_col] = new Array();
			_colResults[_inverted][_col] = BigInteger.ZERO;
			var sumelement = $("sum_" + htmlid(_col));

			for (var _table = 0; _table < giNumTables; _table++){
				_resultMatrix[_inverted][_col][_table] = BigInteger.ZERO;
				gaParticipants.each(function(_gpgID){
					var req = gsExtensiondir + 'webservices.cgi?service=getVote&pollID=' + gsPollID
					req += "&gpgID=" + _gpgID;
					req += "&timestamp=" + escape(_col);
					req += "&tableindex=" + _table;
					req += "&inverted=" + (_inverted == 0 ? "false" : "true");
					new Ajax.Request(req, {
						method: "get",
						asynchronous: false,
						onSuccess: function(_transport){
							_resultMatrix[_inverted][_col][_table] = _resultMatrix[_inverted][_col][_table].add(new BigInteger(_transport.responseText)).mod(goVoteVector.dcmod);
						},
						onFailure: function(_transport){
							alert("Failed to fetch result for column " + _col + ", participant " + _gpgID + "!");
						}
					});
				});
				var result = minabs(_resultMatrix[_inverted][_col][_table],goVoteVector.dcmod);
				if (result.compareTo(BigInteger.ZERO) < 0){
					var _attack = _inverted == 0 ? "decrease" : "increase";
					$('comments').insert({before: "<div class='warning'>Somebody tried to "+_attack+" column "+_col+" by "+result.abs()+"!!!</div>"});
					sumelement.setStyle("background-color:red");
					sumelement.addClassName("wrong");
				}
				_colResults[_inverted][_col] = _colResults[_inverted][_col].add(result);
			}
			if (_inverted == 0){
				var totalsum = (new BigInteger(sumelement.innerHTML)).add(_colResults[_inverted][_col]);
				sumelement.update(totalsum);
			} else {
				if (goNumParticipants.compareTo(_colResults[0][_col].add(_colResults[1][_col])) != 0) {
					$('comments').insert({before: "<div class='warning'>Somebody sent inconsistent values at column "+_col+"!!!</div>"});
					sumelement.setStyle("background-color:red");
					sumelement.addClassName("wrong");
				}
			}
		});
	}
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


/*****************************************************************
 * Start all calculations, which can be done before vote casting *
 *****************************************************************/
Vote.prototype.startKeyCalc = function (){
	this.sec = new BigInteger(localStorage.getItem("sec"));
	this.pub = new BigInteger(localStorage.getItem("pub"));
	this.otherParticipantArray = gaParticipants.without(gsMyID);
	this.calcNextDHKey();
}

/*********************************
 * called from the "Save"-Button *
 *********************************/
Vote.prototype.save = function (){
	var _failurehappend = false;

	for (var _inverted = 0; _inverted < 2; _inverted++){
		for (var _colidx = 0; _colidx < gaColumns.length; _colidx++){
			var _col = gaColumns[_colidx];
			var randomTable = Math.round(Math.random()*(giNumTables-1));
			var voteval = $(htmlid(_col)).checked ? BigInteger.ONE : BigInteger.ZERO;
			voteval = voteval.subtract(new BigInteger(_inverted.toString())).abs();
			this.keyMatrix[_inverted][_col][randomTable] = this.keyMatrix[_inverted][_col][randomTable].add(voteval);//.mod(this.dcmod);

			for (var _table = 0; _table < giNumTables;_table++){
				var req = gsExtensiondir + 'webservices.cgi?service=setVote&pollID=' + gsPollID
				req += "&gpgID=" + gsMyID;
				req += "&vote=" + this.keyMatrix[_inverted][_col][_table];
				req += "&timestamp=" + escape(_col);
				req += "&tableindex=" + _table;
				req += "&inverted=" + (_inverted == 0 ? "false" : "true");
				new Ajax.Request(req, {
					method:'get',
					asynchronous: false,
					onFailure: function(transport){
						_failurehappend = true;
				}});
			}
		}
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
Vote.prototype.calcSharedKey = function (otherID,timeslot,tableindex,inverted){
	var cmp = new BigInteger(gsMyID).compareTo(new BigInteger(otherID));
	if (cmp == 0){
			return BigInteger.ZERO;
	}

	var ret = hash(pseudorandom(this.participants[otherID]["dh"],gsPollID,timeslot,tableindex,inverted));
	if (cmp > 0){
		return ret.negate().mod(this.dcmod);
	}
	return ret.mod(this.dcmod);
}


/**************************************************************************
 * calculate the DC-Net keys, a participant has to add to his vote vector *
 **************************************************************************/
Vote.prototype.calculateVoteKeys = function () {
	this.keyMatrix = new Array();
	for (var _inverted = 0; _inverted < 2; _inverted++){

		this.keyMatrix[_inverted] = new Object();
		for (var _colidx = 0; _colidx < gaColumns.length; _colidx++){
			var _col = gaColumns[_colidx];
			this.keyMatrix[_inverted][_col] = new Array();

			for (var _table = 0; _table < giNumTables;_table++){
				this.keyMatrix[_inverted][_col][_table] = BigInteger.ZERO;
				for (var id in this.participants){
					var addval = this.calcSharedKey(id,_col,_table,_inverted);

					this.keyMatrix[_inverted][_col][_table] = this.keyMatrix[_inverted][_col][_table].add(addval);
					this.keyMatrix[_inverted][_col][_table] = this.keyMatrix[_inverted][_col][_table].mod(this.dcmod);
				}
			}
		}
	}
}


/**************************************************
 * calculate a DH secret with another participant *
 **************************************************/
Vote.prototype.calcNextDHKey = (function(){
		var i = 0;
		return function() {
			if (i >= this.otherParticipantArray.length) {
				this.calculateVoteKeys();
				window.setTimeout('showSaveButton()', 1000);
				return;
			}

			var id = this.otherParticipantArray[i];

			i++;

			this.participants[id] = new Object();
			if (localStorage.getItem(id) == null){
				this.participants[id] = fetchKey(id);

				// calculate the dh secret
				this.participants[id]["pub"].modPow(this.sec,this.dhmod,
						function (result) {
							goVoteVector.participants[id]["dh"] = result;
							localStorage.setItem(id,result);
							goVoteVector.calcNextDHKey();
						});
			} else {
				this.participants[id]["dh"] = new BigInteger(localStorage.getItem(id));
				this.calcNextDHKey();
			}
		}
})();

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
