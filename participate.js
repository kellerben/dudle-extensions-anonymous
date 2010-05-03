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
/*global gt, goVoteVector, gsExtensiondir, gsPollID, gsEdit, gsVoted, gsUnknown, gsFlying, gsKickedOut, gfUpdateName, giNumTables, goNumParticipants, Vote */

var gParticipantTds;
var gActiveParticipant;
var gaColumns;
var goParticipants;

/**********************************************************
 * remove non-standard characters to give a valid html id *
 **********************************************************/
function htmlid(s) {
	return s.gsub(/[^A-Z^a-z^0-9^\-^_^:^\.]/, ".");
}

function cancelButton() {
	return "<br /><input type='button' value='" + gt.gettext("Cancel") + "' onclick='location.assign(location.href)' style='margin-top:1ex'/>";
}
function showLogin(_participant) {
	var _username, _l;
	if ($("add_participant")) {
		$("add_participant").remove();
	} else {
		gActiveParticipant.update(gParticipantTds); 
	}
	
	$("separator_top").remove();
	$("separator_bottom").remove();

	_username = $(_participant).innerHTML;
	_l = "<td class='label'><label for='key'>";
	_l += Gettext.strargs(gt.gettext("Secret Key for %1:"), [_username]);
	_l += "</label></td>";

	_l += "<td id='td.key' colspan='" + gaColumns.length + "'><textarea id='key' cols='100' rows='2'></textarea></td>";
	_l += "<td><input id='loginbutton' type='button' value='" + gt.gettext("Next") + "' onClick='login()'/>";
	_l += cancelButton();
	_l += "</td>";


	gActiveParticipant = $("participant_" + _participant);
	gParticipantTds = gActiveParticipant.innerHTML;
	gActiveParticipant.insert({
		before: "<tr id='separator_top'><td colspan='" + (gaColumns.length + 2) + "' class='invisible'></td></tr>",
		after: "<tr id='separator_bottom'><td colspan='" + (gaColumns.length + 2) + "' class='invisible'></td></tr>"
	});
	gActiveParticipant.update(_l);
}

function getState(participant, column) {
	var state = "notVoted";
	if ($H(goParticipants[participant]).keys().indexOf("voted") !== -1) {
		goParticipants[participant].voted.each(function (vote) {
			if (vote[0].indexOf(column) !== -1) {
				state = "voted";
			}
		});
	}
	return state;
}

function insertParticipationCheckboxes() {
	var participationVisible = true;
	gaColumns.each(function (col) {
		switch (getState(goVoteVector.id, col)) {
		case "notVoted":
		case "flying":
			/* insert participation checkboxes */
			var _td;
			_td = "<td title='" + col + "' class='undecided' onclick=\"togglecheckbutton('" + htmlid(col) + "');\">";
			_td += "<input id='" + htmlid(col) + "' type='checkbox' onclick=\"togglecheckbutton('" + htmlid(col) + "');\"/></td>";
			$(htmlid(col + "." + goVoteVector.id)).replace(_td);

			if (participationVisible) {
				participationVisible = false;
				_td = "<td id='submit'>";
				_td += "<input id='votebutton' onclick='goVoteVector.save();' type='button' value='" + gt.gettext("Calculating keys ...") + "' disabled='disabled'>";
				_td += cancelButton();
				_td += "</td>";
				$("lastedit_" + goVoteVector.id).update(_td);

				$(goVoteVector.id + "_td").firstElementChild.replace($(goVoteVector.id));

				if ($("add_participant")) {
					$("add_participant").remove();
					$("separator_top").remove();
					$("separator_bottom").remove();
				}
				goVoteVector.startKeyCalc();
			}
			break;
		}
	});
}

function login() {
	if ($F('key')) {
		var key = new BigInteger($F('key'), 16);
		$("td.key").update(gt.gettext("Calculating the public key ..."));
		$("loginbutton").value = gt.gettext("Please wait ...");
		$("loginbutton").disabled = true;
		goVoteVector.setSecKey(key, function () {
			if ("participant_" + goVoteVector.id === gActiveParticipant.id) {
				gActiveParticipant.update(gParticipantTds);
				insertParticipationCheckboxes();
			} else {
				var _errormsg = gt.gettext("You entered a wrong key!");
				_errormsg += " <a href='javascript:showLogin(\"" + gActiveParticipant.id.gsub("participant_", "") + "\")>" + gt.gettext("Try again?");
				$("td.key").update(_errormsg);
			}
		});
	}
}

function fingerprint(pub) {
	return SHA256_hash(pub);
}

/****************************************
 * fetches status of gsPollID and calls *
 * _successFunction with it             *
 ****************************************/
function getPollState(_successFunction) {
	new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		parameters: {service: 'getPollState', pollID: gsPollID},
		method: 'get',
		onSuccess: function (_t) {
			_successFunction(_t.responseText);
		}
	});
}

function togglecheckbutton(id) {
	$(id).checked = !$(id).checked;
}


/**************************************************
 * insert HTML code, which shows the participants *
 **************************************************/
function showParticipants() {
	$H(goParticipants).each(function (participant) {
		var row = "<tr class='participantrow' id='participant_" + participant.key + "'>";
		row += "<td class='name' title='" + participant.key + "' id='" + participant.key + "_td'>";
		row += "<a href='javascript:showLogin(\"" + participant.key + "\")' title='" + gt.gettext("Edit User") + "'>";

		row += "<span id='" + participant.key + "'>";
		row += Gettext.strargs(gt.gettext("Fetching Name for %1 ..."), [participant.key]) + "</span>";

		row += " <span class='edituser'><sup>" + gsEdit + "</sup></span></a>";
		row += "</td>";

		gaColumns.each(function (column) {
			var classname, statustitle, statustext;

			switch (getState(participant.key, column)) {
			case "voted":
				classname = 'voted';
				statustitle = gt.gettext('Has voted anonymously.');
				statustext = gsVoted;
				break;
			case 'notVoted':
				classname = 'undecided';
				statustitle = gt.gettext('Has not voted yet.');
				statustext = gsUnknown;
				break;
			case 'flying':
				classname = 'bmaybe';
				statustitle = gt.gettext('Is to be removed.');
				statustext = gsFlying;
				break;
			case 'kickedOut':
				classname = 'undecided';
				statustitle = gt.gettext('Is removed.');
				statustext = gsKickedOut;
				break;
			}
			row += "<td class='" + classname + "' id='" + htmlid(column  + "."  + participant.key) + "' title='" + statustitle + "'>" +  statustext + "</td>";
		});
		row += "<td class='invisible' id='" + htmlid("lastedit_" + participant.key) + "'></td></tr>";
		$("separator_top").insert({ before: row });
		gfUpdateName(participant.key);
	});
}

/********************
 * minabs(5, 6) = -1 *
 * minabs(2, 6) =  2 *
 ********************/
function minabs(_number, _modulo) {
	if (_number.compareTo(_number.subtract(_modulo).abs()) < 0) {
		return _number;
	} else {
		return _number.subtract(_modulo);
	}
}

/*******************************************************************
 * calculate the result from anonymous votes and add it to the sum *
 *******************************************************************/
function calcResult() {

	new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		method: "get",
		parameters: { service: "getVote", pollID: gsPollID },
		onSuccess: function (_transport) {
			var _totalVoteSeveralCols, _totalVote, _resultMatrix, _colResults, _inverted;
			_totalVoteSeveralCols = _transport.responseText.evalJSON();
			_totalVote = {};

			_resultMatrix = [];
			_colResults = [];
			$H(_totalVoteSeveralCols).each(function (_participant) {
				_totalVote[_participant.key] = {};
				$A(_participant.value).each(function (_vote) {
					$H(_vote.vote).each(function (_colvote) {
						_totalVote[_participant.key][_colvote.key] = _colvote.value;
					});
				});
			});

			for (_inverted = 0; _inverted < 2; _inverted++) {
				_resultMatrix[_inverted] = {};
				_colResults[_inverted] = {};

				gaColumns.each(function (_col) {
					var sumelement = $("sum_" + htmlid(_col));
					_resultMatrix[_inverted][_col] = [];
					_colResults[_inverted][_col] = BigInteger.ZERO;
					if (_inverted === 0) {
						sumelement.setStyle("color: white; background-color: black");
					}

					for (var _table = 0; _table < giNumTables; _table++) {
						_resultMatrix[_inverted][_col][_table] = BigInteger.ZERO;
						
						$H(goParticipants).keys().each(function (_gpgID) {
							_resultMatrix[_inverted][_col][_table] = _resultMatrix[_inverted][_col][_table].add(new BigInteger(_totalVote[_gpgID][_col][_table][_inverted], 16)).mod(goVoteVector.dcmod);
						});

						var result = minabs(_resultMatrix[_inverted][_col][_table], goVoteVector.dcmod);
						if (result.compareTo(BigInteger.ZERO) < 0) {
							var _attack = _inverted === 0 ? gt.gettext("decrease") : gt.gettext("increase");
							$('comments').insert({before: "<div class='warning'>" + Gettext.strargs(gt.gettext("Somebody tried to %1 column %2 by %3!!!"), [_attack, _col, result.abs()]) + "</div>"});
							sumelement.setStyle("background-color:red");
							sumelement.addClassName("wrong");
						}
						_colResults[_inverted][_col] = _colResults[_inverted][_col].add(result);
					}
					if (_inverted === 0) {
						var totalsum = (new BigInteger(sumelement.innerHTML)).add(_colResults[_inverted][_col]);
						sumelement.update(totalsum);
					} else {
						if (goNumParticipants.compareTo(_colResults[0][_col].add(_colResults[1][_col])) !== 0) {
							$('comments').insert({before: "<div class='warning'>" + Gettext.strargs(gt.gettext("Somebody sent inconsistent values at column %1!!!"), [_col]) + "</div>"});
							sumelement.setStyle("background-color:red");
							sumelement.addClassName("wrong");
						}
					}
				});
			}
		}
	});
}

function pseudorandom(dh, uuid, col, tableindex, inverted) {
	var seed, block, key, i;
	seed = SHA256_hash(uuid + col + tableindex + inverted);
	//FIXME: use 256 bit and not only the first 128 bit of SHA256
	block = new Array(16);
	for (i = 0; i < 16; i++) {
		block[i] = new BigInteger(seed.charAt(i * 2) + seed.charAt(i * 2 + 1), 16);
	}

	seed = SHA256_hash(dh.toString());
	key = new Array(32);
	for (i = 0; i < 32; i++) {
		key[i] = new BigInteger(seed.charAt(i * 2) + seed.charAt(i * 2 + 1), 16);
	}

	AES_ExpandKey(key);
	AES_Encrypt(block, key);
	return block;
}

function hash(block) {
	return new BigInteger(SHA256_hash(block), 16);
}

function showSaveButton() {
	var v = $("votebutton");
	v.value = gt.gettext("Save");
	v.enable();
}


// TODO: transform into asynchronus call
function fetchKey(id) {

	var req, participant, line, resp;
	req = new XMLHttpRequest();
	req.open("POST", gsExtensiondir + "keyserver.cgi", false);
	req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
	req.send("service=getKey&gpgID=" + id.toString());

	if (req.status === 200) {
		participant = {"id" : id};
		resp = req.responseText.split("\n");
		for (line = 0; line < resp.length;line++) {
			if (resp[line].startsWith("DHPUB ")) {
				participant.pub = new BigInteger(resp[line].gsub("DHPUB ", ""), 16);
			}
		}
		return participant;
	} else {
		return gt.gettext('Something went wrong! The server said:') + " " + req.responseText;
	}
}


/*****************************************************************
 * Start all calculations, which can be done before vote casting *
 *****************************************************************/
Vote.prototype.startKeyCalc = function () {
	this.otherParticipantArray = $H(goParticipants).keys().without(goVoteVector.id);
	this.calcNextDHKey();
};

/*********************************
 * called from the "Save"-Button *
 *********************************/
Vote.prototype.save = function () {
	var _inverted, _colidx, _col, randomTable, voteval, _voteobj, _table;

	// choose random table 
	for (_inverted = 0; _inverted < 2; _inverted++) {
		for (_colidx = 0; _colidx < gaColumns.length; _colidx++) {
			_col = gaColumns[_colidx];
			randomTable = Math.round(Math.random() * (giNumTables - 1));
			voteval = $(htmlid(_col)).checked ? BigInteger.ONE : BigInteger.ZERO;
			voteval = voteval.subtract(new BigInteger(_inverted.toString())).abs();
			this.keyMatrix[_inverted][_col][randomTable] = this.keyMatrix[_inverted][_col][randomTable].add(voteval);//.mod(this.dcmod);
		}
	}

	// write vote string
	_voteobj = {};
	for (_colidx = 0; _colidx < gaColumns.length; _colidx++) {
		_col = gaColumns[_colidx];
		_voteobj[_col] = [];
		for (_table = 0; _table < giNumTables;_table++) {
			_voteobj[_col][_table] = [];
			for (_inverted = 0; _inverted < 2; _inverted++) {
				_voteobj[_col][_table][_inverted] = this.keyMatrix[_inverted][_col][_table].toString(16);
			}
		}
	}

	new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		parameters: {service: 'setVote', pollID: gsPollID, gpgID: goVoteVector.id, vote: Object.toJSON(_voteobj), signature: 'TODO'},
		onSuccess: function (transport) {
			location.assign(location.href);
		}
	});
};


/*******************************************************
 * calculate one DC-Net key with one other participant *
 *******************************************************/
Vote.prototype.calcSharedKey = function (otherID, timeslot, tableindex, inverted) {
	var cmp, ret;
	cmp = new BigInteger(goVoteVector.id).compareTo(new BigInteger(otherID));
	if (cmp === 0) {
		return BigInteger.ZERO;
	}

	ret = hash(pseudorandom(this.participants[otherID].dh, gsPollID, timeslot, tableindex, inverted));
	if (cmp > 0) {
		return ret.negate().mod(this.dcmod);
	}
	return ret.mod(this.dcmod);
};


function usedMyKey(id, col) {
	if (typeof(goParticipants[id].voted) === 'undefined') {
		return true;
	}
	var ret = false;
	goParticipants[id].voted.each(function (_vote) {
		if (_vote[1].indexOf(goVoteVector.id) !== -1) {
			ret = true;
		}
	});
	return ret;
}

/**************************************************************************
 * calculate the DC-Net keys, a participant has to add to his vote vector *
 **************************************************************************/
Vote.prototype.calculateVoteKeys = function () {
	var _inverted, _colidx, _col, _table, _id, addval;
	// initialize keyMatrix with 0
	this.keyMatrix = [];
	for (_inverted = 0; _inverted < 2; _inverted++) {
		this.keyMatrix[_inverted] = {};
		for (_colidx = 0; _colidx < gaColumns.length; _colidx++) {
			_col = gaColumns[_colidx];
			this.keyMatrix[_inverted][_col] = [];
			for (_table = 0; _table < giNumTables;_table++) {
				this.keyMatrix[_inverted][_col][_table] = BigInteger.ZERO;
			}
		}
	}
	AES_Init();
	for (_colidx = 0; _colidx < gaColumns.length; _colidx++) {
		_col = gaColumns[_colidx];
		for (_id in this.participants) {
			if (usedMyKey(_id, _col)) {
				for (_inverted = 0; _inverted < 2; _inverted++) {
					for (_table = 0; _table < giNumTables;_table++) {
						addval = this.calcSharedKey(_id, _col, _table, _inverted);
						this.keyMatrix[_inverted][_col][_table] = this.keyMatrix[_inverted][_col][_table].add(addval);
						this.keyMatrix[_inverted][_col][_table] = this.keyMatrix[_inverted][_col][_table].mod(this.dcmod);
					}
				}
			}
		}
	}
	AES_Done();
};

/**************************************************
 * calculate a DH secret with another participant *
 **************************************************/
Vote.prototype.calcNextDHKey = (function () {
		var i = 0;
		return function () {
			if (i >= this.otherParticipantArray.length) {
				this.calculateVoteKeys();
				window.setTimeout('showSaveButton()', 1000);
				return;
			}

			var id = this.otherParticipantArray[i];

			i++;

			this.participants[id] = {};
			if (localStorage.getItem(id) === null) {
				this.participants[id] = fetchKey(id);

				// calculate the dh secret
				this.participants[id].pub.modPow(this.sec, this.dhmod,
						function (result) {
							goVoteVector.participants[id].dh = result;
							/* TODO store result if user wants to stay logged in
							localStorage.setItem(id, result);
							*/
							goVoteVector.calcNextDHKey();
						});
			} else {
				/* TODO verify correctness of key */
				this.participants[id].dh = new BigInteger(localStorage.getItem(id));
				this.calcNextDHKey();
			}
		};
	}
)();

/*********************************************************
 * fetch columns and participants                        *
 * show participants and start precalculation when ready *
 *********************************************************/
new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
	parameters: {service: 'getColumns', pollID: gsPollID},
	method: 'get',
	onSuccess: function (transport) {
		gaColumns = transport.responseText.split("\n");

		new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
			parameters: {service: 'getTotalParticipants', pollID: gsPollID},
			method: "get",
			onFailure: function () { 
				alert(gt.gettext('Failed to fetch participant list.'));
			},
			onSuccess: function (transport) {
				goParticipants = transport.responseText.evalJSON();
				showParticipants();
				getPollState(function (_pollState) {
					if (_pollState === "open") {
						/*TODO 
						if (eingeloggt im localStorage) {
							goVoteVector.setSecKey(schluessel);
							insertParticipationCheckboxes();
						}
						*/
					} else {
						calcResult();
					}
				});
			}
		});
	}
});

