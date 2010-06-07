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
/*global goVoteVector, gsExtensiondir, gsPollID, gsVoted, gsUnknown, gsFlying, gsKickedOut, gfUpdateName, gfRemoveParticipant, gfReload, gfUserTd, gfKeyTd, gfCancelButton, giNumTables, goRealUserNames, gfInitAESKey, Vote, gt */

var gActiveParticipant;
var gaColumns;
var gaColumnsLen;
var goParticipants;
var gsPollState;

/**********************************************************
 * remove non-standard characters to give a valid html id *
 * thanks to 
 * http://stackoverflow.com/users/18771/tomalak
 * and
 * http://stackoverflow.com/users/160173/david-murdoch
 **********************************************************/
var htmlid = (function () {
	var cache = {},
	    ncache = {},
	    reg = /[^A-Za-z0-9_:.\-]/g;
	return function (s) {
		var id;
		if (s in cache) {
			id = cache[s];
		} else {
			id = s.replace(reg, ".");
			if (id in ncache) {
				id += ncache[id]++;
			}
			ncache[id] = 0;
			cache[s] = id;
		}
		return id;
	};
}());

var gsKickerId;
function showKicker(_victim, _kicker) {
	var tdtext = "<label for='key'>";
	tdtext += printf(_("Secret Key for %1:"), [goRealUserNames[_kicker]]);
	tdtext += "</label>";
	$("participant_" + _victim).childElements()[0].update(tdtext);

	gsKickerId = _kicker;
	$("key").enable();
	$("kickoutbutton").enable();
	$("cancelbutton").writeAttribute("onclick", "deleteUser('" + _victim + "')");
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
		return _('Something went wrong! The server said:') + " " + req.responseText;
	}
}

function startCalcDisableButton(button) {
	$("key_td").update(_("Calculating the public key ..."));
	$(button).value = _("Please wait ...");
	$(button).disable();
}

/**********************************************
 * kickout a user
 * the dh key should be calculated and stored
 **********************************************/
Vote.prototype.kickOut = function (_victim, callafterwards) {
	var _inverted, _table, ar, keyMatrix, _colidx, _col;
	AES_Init();
	keyMatrix = {};
	for (_colidx = 0; _colidx < gaColumnsLen; _colidx++) {
		_col = gaColumns[_colidx];
		keyMatrix[_col] = [];
		for (_table = 0; _table < giNumTables;_table++) {
			keyMatrix[_col][_table] = [];
			for (_inverted = 0; _inverted < 2; _inverted++) {
				keyMatrix[_col][_table][_inverted] = goVoteVector.calcSharedKey(_victim, _col, _table, _inverted).toString(36);
			}
		}
	}
	AES_Done();

	ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		parameters: {
			service: 'setKickOutKeys', 
			pollID: gsPollID, 
			gpgIDKicker: goVoteVector.id, 
			gpgIDLeaver: _victim, 
			keys: Object.toJSON(keyMatrix),
			signature: 'TODO'
		},
		onSuccess: function (transport) {
			callafterwards();
		}
	});
};


Vote.prototype.kickOutUserInterface = function (_victim) {
	var key;
	if ($F('key')) {
		key = new BigInteger($F('key'), 16);
		startCalcDisableButton("kickoutbutton");
		$("cancelbutton").disable();
		goVoteVector.setSecKey(key, function () {
			if (goVoteVector.id === gsKickerId) {
				$("key_td").update(printf(_("Please wait while removing %1 ..."), [goRealUserNames[_victim]]));
				goVoteVector.participants[_victim] = fetchKey(_victim);

				// calculate the dh secret
				goVoteVector.participants[_victim].pub.modPow(goVoteVector.sec, goVoteVector.dhmod,
					function (result) {
							goVoteVector.participants[_victim].dh = result;
							goVoteVector.participants[_victim].aeskey = gfInitAESKey(result);
							goVoteVector.kickOut(_victim, gfReload);
						}
				);
			} else {
				var _errormsg = _("You entered a wrong key!");
				_errormsg += " <a href='javascript:(function () {deleteUser(\"" + _victim + "\");showKicker(\"" + _victim + "\", \"" + gsKickerId + "\")})()'>" + _("Try again?") + "</a>";
				$("key_td").update(_errormsg);
				$("kickoutbutton").value = printf(_("Delete %1"), [goRealUserNames[_victim]]);
			}
		});
	}
};

var gParticipantTds;
function exchangeParticipantRow(_participant, _newTds) {
	if ($("add_participant")) {
		$("add_participant").remove();
	} else {
		gActiveParticipant.update(gParticipantTds); 
	}
	
	$("separator_top").remove();
	$("separator_bottom").remove();



	gActiveParticipant = $("participant_" + _participant);
	gParticipantTds = gActiveParticipant.innerHTML;
	gActiveParticipant.insert({
		before: "<tr id='separator_top'><td colspan='" + (gaColumnsLen + 2) + "' class='invisible'></td></tr>",
		after: "<tr id='separator_bottom'><td colspan='" + (gaColumnsLen + 2) + "' class='invisible'></td></tr>"
	});
	gActiveParticipant.update(_newTds);
}
/*
 * display the Edit User form
 */
function editUser(_participant) {
	var _l;
	_l = "<td colspan='2' id='" + _participant + "_td' class='label'><label for='key'>";
	_l += printf(_("Secret Key for %1:"), [goRealUserNames[_participant]]);
	_l += "</label></td>";

	_l += gfKeyTd();
	_l += "<td><input id='loginbutton' type='button' value='" + _("Next") + "' onClick='login()'/>";
	_l += gfCancelButton();
	_l += "</td>";
	exchangeParticipantRow(_participant, _l);
}

/* 
 * display the delete user form
 */
function deleteUser(_victim) {
	var usersNeeded = [], _tds;
	$H(goParticipants).each(function (_pair) {
		if (_pair.value.voted) {
			if (!goParticipants[_victim].flying || (goParticipants[_victim].flying && !goParticipants[_victim].flying[_pair.key])) {
				for (var _i = 0; _i < _pair.value.voted.length; ++_i) {
					if (_pair.value.voted[_i][1].include(_victim)) {
						usersNeeded.push(_pair.key);
					}
				}
			}
		}
	});
	if (usersNeeded.size() === 0) {
		alert(_("There are no votes depending on this user. Please vote before removing other participants."));
	} else {
		_tds = "<td colspan='2'>" + _("Please select your username:");
		_tds += "<ul style='text-align: left'>";
		_tds += usersNeeded.uniq().collect(function (e) {
			return "<li title='" + e + "'><a href='javascript:showKicker(\"" + _victim + "\", \"" + e + "\")'>" + goRealUserNames[e] + "</a></li>"; 
		}).join("");
		_tds += "</ul></td>";
		_tds += gfKeyTd();

		_tds += "<td><input id='kickoutbutton' type='button' value='";
		_tds += printf(_("Delete %1"), [goRealUserNames[_victim]]);
		_tds += "' onClick='goVoteVector.kickOutUserInterface(\"" + _victim + "\")' disabled='disabled' />";
		_tds += gfCancelButton();
		_tds += "</td>";
		exchangeParticipantRow(_victim, _tds);
		$("key").disable();
	}
}


function getState(participant, column) {
	var state = "notVoted";

	if ($H(goParticipants[participant]).keys().indexOf("flying") !== -1) {
		$H(goParticipants[participant].flying).each(function (kicker) {
			if (kicker.value.indexOf(column) !== -1) {
				if (gsPollState === "closed") {
					state = "kickedOut";
				} else {
					state = "flying";
				}
			}
		});
	}

	if ($H(goParticipants[participant]).keys().indexOf("voted") !== -1) {
		goParticipants[participant].voted.each(function (vote) {
			if (vote[0].indexOf(column) !== -1) {
				state = "voted";
			}
		});
	}

	return state;
}

/******************************************************************
 * checks if there are additional steps needed after vote casting *
 * If there is somebody, who should be kicked out, it should be   *
 * asked if the user agrees. Users who should be asked for are    *
 * written into goFlyingUsers[flyer] = [kicker_1,...,kicker_x]    *
 ******************************************************************/
var goFlyingUsers = new Hash();
var gbQuestionsAnswered = true;
function checkforAdditionalQuestions() {
	var _button;

	$H(goParticipants).each(function (_pair) {
		var _participant = _pair[0], _status = _pair[1];
		if (typeof(_status.flying) !== 'undefined' && _participant !== goVoteVector.id) {
			goFlyingUsers.set(_participant, _status.flying);
			gbQuestionsAnswered = false;
		}
	});
	if (gbQuestionsAnswered) {
		$("votebutton").value = _("Save");
	}
}

function insertParticipationCheckboxes() {
	var _td, participationVisible = false;
	gaColumns.each(function (col) {
		switch (getState(goVoteVector.id, col)) {
		case "notVoted":
		case "flying":
			/* insert participation checkboxes */
			_td = "<td title='" + col + "' class='undecided' onclick=\"$('" + htmlid(col) + "').click()\">";
			_td += "<input id='" + htmlid(col) + "' type='checkbox' onclick=\"event.cancelBubble = true\"/></td>";
			$(htmlid(col + "." + goVoteVector.id)).replace(_td);

			participationVisible = true;
			break;
		}
	});
	// insert save buttons when at least one checkbox was inserted
	if (participationVisible) {
		_td = "<td id='submit'>";
		_td += "<input id='votebutton' onclick='goVoteVector.save()' type='button' value='" + _("Next") + "'>";
		_td += gfCancelButton();
		_td += "</td>";
		Element.replace($("lastedit_" + goVoteVector.id), _td);
		checkforAdditionalQuestions();

		$("participant_" + goVoteVector.id).childElements()[0].remove();
		$("participant_" + goVoteVector.id).childElements()[0].writeAttribute("colspan", "2");

		if ($("add_participant")) {
			$("add_participant").remove();
			$("separator_top").remove();
			$("separator_bottom").remove();
		}
		goVoteVector.startKeyCalc();
	}
}

function login() {
	if ($F('key')) {
		var key = new BigInteger($F('key'), 16);
		startCalcDisableButton("loginbutton");
		goVoteVector.setSecKey(key, function () {
			if ("participant_" + goVoteVector.id === gActiveParticipant.id) {
				gActiveParticipant.update(gParticipantTds);
				insertParticipationCheckboxes();
			} else {
				var _errormsg = _("You entered a wrong key!");
				_errormsg += " <a href='javascript:editUser(\"";
				_errormsg += gActiveParticipant.id.gsub("participant_", "") + "\")'>";
				_errormsg += _("Try again?");
				_errormsg += "</a>";
				$("key_td").update(_errormsg);
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
	var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		parameters: {service: 'getPollState', pollID: gsPollID},
		method: 'get',
		onSuccess: function (_t) {
			_successFunction(_t.responseText);
		}
	});
}


/**************************************************
 * insert HTML code, which shows the participants *
 **************************************************/
function showParticipants() {
	$H(goParticipants).each(function (participant) {
		var rowstart, row = "", editable = false;

		gaColumns.each(function (column) {
			var classname, statustitle, statustext;

			switch (getState(participant.key, column)) {
			case "voted":
				classname = 'voted';
				statustitle = _('Has voted anonymously.');
				statustext = gsVoted;
				break;
			case 'notVoted':
				editable = true;
				classname = 'undecided';
				statustitle = _('Has not voted yet.');
				statustext = gsUnknown;
				break;
			case 'flying':
				editable = true;
				classname = 'bmaybe';
				statustitle = _('Is to be removed.');
				statustext = gsFlying;
				break;
			case 'kickedOut':
				classname = 'undecided';
				statustitle = _('Is removed.');
				statustext = gsKickedOut;
				break;
			}
			row += "<td class='" + classname + "' id='" + htmlid(column  + "."  + participant.key) + "' title='" + statustitle + "'>" +  statustext + "</td>";
		});

		rowstart = "<tr class='participantrow' id='participant_" + participant.key + "'>";
		rowstart += gfUserTd(participant.key, editable);

		row += "<td class='invisible' id='" + htmlid("lastedit_" + participant.key) + "'></td></tr>";
		$("separator_top").insert({ before: rowstart + row });
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
	var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		method: "get",
		parameters: { service: "getVote", pollID: gsPollID },
		onSuccess: function (_transport) {
			var _totalVoteSeveralCols, _totalVote, _resultMatrix, _colResults, _inverted,
				sumelement, _table, result, _attack, totalsum, colidx, _col, numParticipants, partidx, _gpgID,
				_kicked, kickeridx, kicksidx;

			/* FIXME evalJSON() is evil, as others may inject some code*/
			_totalVoteSeveralCols = $H(_transport.responseText.evalJSON());
			_totalVote = {};
			_resultMatrix = [];
			_colResults = [];
			_kicked = $H(_totalVoteSeveralCols.unset("kicked"));
			numParticipants = _totalVoteSeveralCols.keys().length;

			_totalVoteSeveralCols.each(function (_participant) {
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

				for (colidx = 0; colidx < gaColumnsLen; ++colidx) {
					_col = gaColumns[colidx];
					sumelement = $("sum_" + htmlid(_col));
					_resultMatrix[_inverted][_col] = [];
					_colResults[_inverted][_col] = BigInteger.ZERO;
					if (_inverted === 0) {
						sumelement.setStyle("color: white; background-color: black");
					}

					for (_table = 0; _table < giNumTables; _table++) {
						_resultMatrix[_inverted][_col][_table] = BigInteger.ZERO;
						
						for (partidx = 0; partidx < numParticipants; ++partidx) {
							_gpgID = _totalVoteSeveralCols.keys()[partidx];
							_resultMatrix[_inverted][_col][_table] = _resultMatrix[_inverted][_col][_table].add(new BigInteger(_totalVote[_gpgID][_col][_table][_inverted], 36)).mod(goVoteVector.dcmod);
						}

						_kicked.each(function (kickers) {
							$H(kickers.value).each(function (kicker) {
								for (kickeridx = 0; kickeridx < kicker.value.length; ++kickeridx) {
									for (kicksidx = 0; kicksidx < kickers.value[kicker[kickeridx]].length; ++kicksidx) {
										_resultMatrix[_inverted][_col][_table] = _resultMatrix[_inverted][_col][_table].subtract(new BigInteger(kickers.value[kicker[kickeridx]][kicksidx].keys[_col][_table][_inverted], 36)).mod(goVoteVector.dcmod);
									}
								}
							});
						});


						result = minabs(_resultMatrix[_inverted][_col][_table], goVoteVector.dcmod);
						if (result.compareTo(BigInteger.ZERO) < 0) {
							_attack = _inverted === 0 ? _("decrease") : _("increase");
							$('comments').insert({before: "<div class='warning'>" + printf(_("Somebody tried to %1 column %2 by %3!!!"), [_attack, _col, result.abs()]) + "</div>"});
							sumelement.setStyle("background-color:red");
							sumelement.addClassName("wrong");
						}
						_colResults[_inverted][_col] = _colResults[_inverted][_col].add(result);
					}
					if (_inverted === 0) {
						totalsum = (new BigInteger(sumelement.innerHTML)).add(_colResults[_inverted][_col]);
						sumelement.update(totalsum);
					} else {
/*FIXME auf spalten anpassen*/
						if (new BigInteger(numParticipants.toString()).compareTo(_colResults[0][_col].add(_colResults[1][_col])) !== 0) {
							$('comments').insert({before: "<div class='warning'>" + printf(_("Somebody sent inconsistent values at column %1!!!"), [_col]) + "</div>"});
							sumelement.setStyle("background-color:red");
							sumelement.addClassName("wrong");
						}
					}
				}
			}
		}
	});
}

function gfDH2AES(dh) {
	var i, n, aeskey, dhstr, a;

	dhstr = dh.toString(16);
	a = [];
	for (i = 0; i * 2 < dhstr.length; ++i) {
		a[i] = parseInt(dhstr.charAt(i * 2) + dhstr.charAt(i * 2 + 1), 16);
	}

	aeskey = new Array(16);
	for (i = 0; i < 16; ++i) {
		aeskey[i] = 0;
		for (n = 0; 16 * n + i < a.length; ++n) {
			aeskey[i] ^= a[16 * n + i];
		}
	}
	return aeskey;
}

function gfInitAESKey(dh) {
	var aesfull = gfDH2AES(dh);
	AES_ExpandKey(aesfull);
	return aesfull;
}

function pseudorandom(aeskey, uuid, col, tableindex, inverted) {
	var i, n, upper,
		seed = uuid + col + tableindex + inverted,
		round = 0,
		block = [[]],
		result = "";

	for (i = 0; i < seed.length; i++) {
		block[round].push(seed.charCodeAt(i) & 0xff);
		if (block[round].length % 16 === 0) {
			round++;
			block[round] = [];
		}
		upper = seed.charCodeAt(i) >> 8;
		if (upper !== 0) {
			block[round].push(upper);
			if (block[round].length % 16 === 0) {
				round++;
				block[round] = [];
			}
		}
	}

	for (i = 0; i <= round; ++i) {
		AES_Decrypt(block[i], aeskey);
		for (n = 0; n < block[i].length; ++n) {
			result += block[i][n].toPaddedString(2, 16);
		}
	}

	return result;
}


function hash(block) {
	return new BigInteger(SHA256_hash(block), 16);
}

/***********************************************
 * If user votes faster than calculation, 
 * save will overwrite this function to send
 ***********************************************/
var gbCalculationFinished = false;
Vote.prototype.calculationReady = function () {
	gbCalculationFinished = true;
};

/*****************************************************************
 * Start all calculations, which can be done before vote casting *
 *****************************************************************/
Vote.prototype.startKeyCalc = function () {
	this.otherParticipantArray = $H(goParticipants).keys().without(goVoteVector.id);
	this.calcNextDHKey();
};

/******************************************************************
 * stores user into gaKickUsers if kickuser == true               *
 * if user == null, nothing is stored (first round)               *
 * asks the user to kickout next user (goFlyingUsers.random)      *
 * deletes this user from goFlyingUsers afterwards                *
 ******************************************************************/
var gaKickUsers = [], gsPreviousUserRow;
Vote.prototype.askKickOutNext = function (user, kickuser) {
	var nextuser, nextkickers, i, kickoutquestion;

	if (typeof(user) === "undefined") {
		// first call of the function, remove the vote buttons
		for (i = 0; i < gaColumnsLen; ++i) {
			$$("#participant_" + this.id + " td")[1].remove();
		}
		$("votebutton").remove();
	} else {
		// we are not in the first run
		// remove the old question
		$("kickoutquestion").remove();
		// restore the previously saved row
		$("participant_" + user).update(gsPreviousUserRow);

		if (kickuser) {
			gaKickUsers.push(user);
		}
	}

	kickoutquestion = "<td id='kickoutquestion' colspan='" + gaColumnsLen + "'>";

	if (goFlyingUsers.size() === 0) {
		// this was the last question, stop here and send everything
		kickoutquestion += "</td>";
		$$("#participant_" + goVoteVector.id + " td")[0].insert({
			after: kickoutquestion
		});
		if (gbCalculationFinished) {
			this.sendVote();
		} else {
			this.userWasFaster();
		}
		return;
	}
	nextuser = goFlyingUsers.keys()[0];
	nextkickers = $H(goFlyingUsers.unset(nextuser)).keys().collect(function (user) {
		return goRealUserNames[user];
	});

	// save the row
	gsPreviousUserRow = $("participant_" + nextuser).innerHTML;

	// make the belonging fields red
	$$("#participant_" + nextuser + " td.name, #participant_" + nextuser + " td.bmaybe").each(function (field) {
		field.setStyle({
			backgroundColor: 'red' 
		});
	});

	kickoutquestion += printf(gt.ngettext('%1 wants to remove %2.', 
			'Some Users (%1) want to remove %2.', 
			nextkickers.size()),
		[nextkickers.join(", "), goRealUserNames[nextuser]]
	);
	kickoutquestion += "<br />";
	kickoutquestion += "<input type='button' onclick='goVoteVector.askKickOutNext(\"" + nextuser + "\", true)' value='" + _("I agree.") + "' id='agreebutton' />";
	kickoutquestion += "&nbsp;";
	kickoutquestion += "<input type='button' onclick='goVoteVector.askKickOutNext(\"" + nextuser + "\", false)' value='" + _("I do not agree.") + "' id='disagreebutton'/>";
	kickoutquestion += "</td>";

	$$("#participant_" + goVoteVector.id + " td")[0].insert({
		after: kickoutquestion
	});


};

/*********************************
 * called from the "Save"-Button *
 *********************************/
Vote.prototype.save = function () {
	var _colidx, _col;
	this.votes = {};

	// read the votes
	for (_colidx = 0; _colidx < gaColumnsLen; _colidx++) {
		_col = gaColumns[_colidx];
		this.votes[_col] = $(htmlid(_col)).checked ? BigInteger.ONE : BigInteger.ZERO;
	}

	// check if we can send the vote
	if (gbQuestionsAnswered) {
		if (gbCalculationFinished) {
			this.sendVote();
		} else {
			this.userWasFaster();
		}
	} else {
		this.askKickOutNext();
	}
};

/*************************************
 * recursively send all kickout keys *
 *************************************/
Vote.prototype.sendNextKickoutKey = function () {
	var nextvictim;
	if (gaKickUsers.size() === 0) {
		// all users send, finish
		gfReload();
		return;
	}
	nextvictim = gaKickUsers.pop();
	$("participant_" + this.id).update("<td colspan='" + (giNumTables + 3) + "'>" + printf(_("Please wait while removing %1 ..."), [goRealUserNames[nextvictim]]) + "</td>");
	this.kickOut(nextvictim, goVoteVector.sendNextKickoutKey);
};

/****************************************************
 * this function is called, when the user is faster 
 * in answering the questions than the calculation
 ****************************************************/
Vote.prototype.userWasFaster = function () {
	this.calculationReady = this.sendVote;
	$("participant_" + this.id).update("<td colspan='" + (giNumTables + 3) + "'>" + _("Please wait while calculating keys ...") + "</td>");
};

Vote.prototype.sendVote = function () {
	var _inverted, _colidx, _col, randomTable, voteval, _table, ar;

	$("participant_" + this.id).update("<td colspan='" + (giNumTables + 3) + "'>" + _("Please wait while sending the vote ...") + "</td>");

	// choose random table 
	for (_inverted = 0; _inverted < 2; _inverted++) {
		for (_colidx = 0; _colidx < gaColumnsLen; _colidx++) {
			_col = gaColumns[_colidx];
			randomTable = Math.round(Math.random() * (giNumTables - 1));
			voteval = this.votes[_col].subtract(new BigInteger(_inverted.toString())).abs();
			this.keyMatrix[_inverted][_col][randomTable] = this.keyMatrix[_inverted][_col][randomTable].add(voteval);//.mod(this.dcmod);
		}
	}

	// write vote string
	this.voteobj = {};
	for (_colidx = 0; _colidx < gaColumnsLen; _colidx++) {
		_col = gaColumns[_colidx];
		this.voteobj[_col] = [];
		for (_table = 0; _table < giNumTables;_table++) {
			this.voteobj[_col][_table] = [];
			for (_inverted = 0; _inverted < 2; _inverted++) {
				this.voteobj[_col][_table][_inverted] = this.keyMatrix[_inverted][_col][_table].toString(36);
			}
		}
	}
	ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
		parameters: {service: 'setVote', pollID: gsPollID, gpgID: goVoteVector.id, vote: Object.toJSON(this.voteobj), signature: 'TODO'},
		onSuccess: function (transport) {
			goVoteVector.sendNextKickoutKey();
		},
		onFailure: function (transport) {
			alert("Something went wrong, could not send the vote!");
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

	ret = hash(pseudorandom(this.participants[otherID].aeskey, gsPollID, timeslot, tableindex, inverted));
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
		if (_vote[0].indexOf(col) !== -1 && _vote[1].indexOf(goVoteVector.id) !== -1) {
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
		for (_colidx = 0; _colidx < gaColumnsLen; _colidx++) {
			_col = gaColumns[_colidx];
			this.keyMatrix[_inverted][_col] = [];
			for (_table = 0; _table < giNumTables;_table++) {
				this.keyMatrix[_inverted][_col][_table] = BigInteger.ZERO;
			}
		}
	}
	AES_Init();
	for (_id in this.participants) {
		for (_colidx = 0; _colidx < gaColumnsLen; _colidx++) {
			_col = gaColumns[_colidx];
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
				this.calculationReady();
				return;
			}

			var id = this.otherParticipantArray[i];

			i++;

			this.participants[id] = fetchKey(id);

			// calculate the dh secret
			this.participants[id].pub.modPow(this.sec, this.dhmod,
				function (result) {
					goVoteVector.participants[id].dh = result;
					goVoteVector.participants[id].aeskey = gfInitAESKey(result);
					goVoteVector.calcNextDHKey();
				}
			);
		};
	}()
);

/*********************************************************
 * checks, if the name entered in the username input     *
 * is configured in the privacy-enhanced poll            *
 *********************************************************/
var gsOldParticipateTr, gsRequestedUserName;
function checkIfUserIsAnonymousConfigured() {
	var pequestion, 
			requesteduserid,
			i;
	gsRequestedUserName = $F("add_participant_input");
	if ($H(goRealUserNames).values().include(gsRequestedUserName)) {
		
		// search for the id
		$H(goRealUserNames).each(function (_pair) {
			if (_pair.value === gsRequestedUserName) {
				requesteduserid = _pair.key;
			}
		});

		// check if user already voted
		if (typeof(goParticipants[requesteduserid].voted) === "undefined") {
			//store old tr for later use
			$("add_participant_input").value = gsRequestedUserName;
			gsOldParticipateTr = $("add_participant").innerHTML;
			for (i = 0; i < gaColumnsLen; ++i) {
				$$("#add_participant td.checkboxes")[0].remove();
			}

			// ask user if he is the configured one
			$("savebutton").disable();
			pequestion = "<td id='pequestion' colspan='" + gaColumnsLen + "'>";
			pequestion += _("A user with the same name is configured for anonymous voting!");
			pequestion += "<br />";
			pequestion += "<input type='button' onclick='editUser(\"" + requesteduserid + "\")' value='" + printf(_("I have the secret key for user %1."), [gsRequestedUserName]) + "' id='pebutton' />";
			pequestion += "&nbsp;";
			pequestion += "<input type='button' onclick='continueNonPe()' value='" + _("Continue with non-anonymous voting.") + "' id='nonpebutton'/>";
			pequestion += "</td>";
			$("add_participant_input_td").insert({
				after: pequestion
			});
		}
	}
}
function continueNonPe() {
	$("add_participant").update(gsOldParticipateTr);
	$("add_participant_input").value = gsRequestedUserName;
}

function onAjaxComplete(callfunc) {
	var wait = function () {
		if (Ajax.activeRequestCount === 0) {
			callfunc();
		} else {
			window.setTimeout(wait, 100);
		}
	};
	window.setTimeout(wait, 1);
}


/*********************************************************
 * fetch columns and participants                        *
 * show participants and start precalculation when ready *
 *********************************************************/
var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
	parameters: {service: 'getColumns', pollID: gsPollID},
	method: 'get',
	onSuccess: function (transport) {
		gaColumns = transport.responseText.split("\n");
		gaColumnsLen = gaColumns.length;

		var ar = new Ajax.Request(gsExtensiondir + 'webservices.cgi', {
			parameters: {service: 'getParticipants', pollID: gsPollID},
			method: "get",
			onFailure: function () { 
				alert(_('Failed to fetch participant list.'));
			},
			onSuccess: function (transport) {
				/* FIXME evalJSON() is evil, as others may inject some code*/
				goParticipants = transport.responseText.evalJSON();
				getPollState(function (_pollState) {
					gsPollState = _pollState;
					showParticipants();
					if (_pollState === "closed") {
						calcResult();
					} else {
						// check, if user tries to vote with the non-privacy-enhanced interface
						$("add_participant_input").writeAttribute("onchange", "checkIfUserIsAnonymousConfigured()");
						onAjaxComplete(checkIfUserIsAnonymousConfigured);
					}
				});
			}
		});
	}
});

