#!/usr/bin/env ruby

############################################################################
# Copyright 2009, 2010 Benjamin Kellermann                                 #
#                                                                          #
# This file is part of dudle.                                              #
#                                                                          #
# Dudle is free software: you can redistribute it and/or modify it under   #
# the terms of the GNU Affero General Public License as published by       #
# the Free Software Foundation, either version 3 of the License, or        #
# (at your option) any later version.                                      #
#                                                                          #
# Dudle is distributed in the hope that it will be useful, but WITHOUT ANY #
# WARRANTY; without even the implied warranty of MERCHANTABILITY or        #
# FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public     #
# License for more details.                                                #
#                                                                          #
# You should have received a copy of the GNU Affero General Public License #
# along with dudle.  If not, see <http://www.gnu.org/licenses/>.           #
############################################################################

require "pp"
require "json"
class Poll
	###################################################################
	# Poll Details
	###################################################################
	def Poll.webservicedescription_3Polldetails_getTitle
		{ "return" => "title" }
	end
	def webservice_getTitle
		@name
	end
	def Poll.webservicedescription_3Polldetails_getPollState
		{ "return" => "open, wenn noch nicht alle gewählt haben, sonst closed" }
	end
	def webservice_getPollState
		return "open" if $dc.empty?
		
		missing = {}
		total = getTotalParticipants
		total.each{|p,state|
			if state["voted"]
				state["voted"].each{|cols,used|
					used.each{|missing_participant|
						missing[missing_participant] ||= {}
						cols.each{|c|
							missing[missing_participant][c] ||= []
							missing[missing_participant][c] << p
							missing[missing_participant][c].uniq!
						}
					}
				}
			else
				return "open" unless state["flying"]
			end
		}

		missing.each{|p,cols|
			if total[p]["voted"]
				total[p]["voted"].each{|donecols,usedkeys|
					donecols.each{|done|
						usedkeys.each{|usedkey|
							missing[p][done].delete(usedkey)
						}
					}
				}
			end
			if total[p]["flying"]
				total[p]["flying"].each{|kicker,kickcols|
					kickcols.each{|kickcol|
						missing[p][kickcol].delete(kicker)
					}
				}
			end
		}

		missing.each{|p,cols|
			cols.each{|c,miss|
				return "open" unless miss.empty?
			}
		}

		return "closed"
	end
	def Poll.webservicedescription_3Polldetails_getDebug
		{ "return" => "debug" }
	end
	def webservice_getDebug
		$dc.pretty_inspect + "\n" + self.pretty_inspect
	end
	###################################################################
	# Poll Initialization
	###################################################################
	def Poll.webservicedescription_0Initialization_getTimeStamps
		{ "return" => "Liste potentieller Startzeiten des Events (rfc3339)", 
		  "description" => "<span style='color:red'>deprecated</span> (getColumns -> kein rfc!)"}
	end
	def webservice_getTimeStamps
		# FIXME, when it should work for seconds or pollhead
		# FIXME time-strings are stripped out
		@head.columns.collect{|t|
			if t =~ /^\d\d\d\d-\d\d-\d\d \d\d:\d\d$/
				"#{t}:00+01:00" 
			else
				nil
			end
		}.compact.join("\n")
	end
	
	def Poll.webservicedescription_0Initialization_getColumns
		{ "return" => "Liste der Spalten" }
	end
	def webservice_getColumns
		@head.columns.join("\n")
	end


	def Poll.webservicedescription_0Initialization_getParticipants
		{ "return" => "Liste der GPG-IDs aller Teilnehmer",
		  "description" => "<span style='color:red'>deprecated</span> (getTotalParticipants)"}
	end
	def webservice_getParticipants
		if $dc["participants"]
			return $dc["participants"].join("\n")
		else
			return ""
		end
	end

	def Poll.webservicedescription_0Initialization_getTotalParticipants
		{ "return" => "Liste der GPG-IDs aller Teilnehmer"}
	end
	def getTotalParticipants
		ret = {}
		if $dc["participants"]
			$dc["participants"].each{|p|
				ret[p] = {}
				if $dc[p]
					ret[p] = {"voted" =>[]}
					$dc[p].each{|vote|
						ret[p]["voted"] << [vote["vote"].keys, vote["usedKeys"]]
					}

				end
			}
			if $dc["flying"]
				$dc["flying"].each{|p,kickerkeys|
					ret[p]['flying'] = {}
					kickerkeys.each{|kicker,keymessages|
						ret[p]['flying'][kicker] = keymessages.collect{|m| m["keys"].keys}.uniq.flatten
					}
				}
			end
		end
		ret
	end
	def webservice_getTotalParticipants
		getTotalParticipants.to_json
	end

	def Poll.webservicedescription_0Initialization_addParticipant
		{ "return" => "",
			"input" => "gpgID"
		}
	end
	def webservice_addParticipant
		$dc["participants"] ||= []
		$dc["participants"] << $c["gpgID"]
		$dc["participants"].uniq!
		store_dc($dc,"Participant "+ $c["gpgID"] + " invited for anonymous voting")
	end

	def Poll.webservicedescription_0Initialization_removeParticipant
		{ "return" => "202 wenn user entfernt wurde, 403 wenn der user nicht entfernt werden darf (er oder jemand anders hat schon seinen Schlüssel in einer Stimme benutzt), 404 wenn user nicht in Datenbank",
			"input" => "gpgID"
		}
	end
	def webservice_removeParticipant
		user = $c["gpgID"]
		unless $dc["participants"].include?(user)
			$header["status"] = "404 Not Found"
			return "The participant was not configured anyway!"
		end
		if $dc.keys.include?(user) 
			$header["status"] = "403 Forbidden"
			return "This participant already voted. Removing is forbidden"
		end
		if $dc["participants"].collect{|u|
			if $dc[u]
				$dc[u].collect{|v| v["usedKeys"].include?(user)}
			else 
				false
			end
		}.flatten.include?(true)
			return "The key of this user is already used in the poll. Please use kickOut to remove him."
		else
			$dc["participants"].delete(user)
			store_dc($dc,"Participant "+ $c["gpgID"] + " removed from anonymous voting")
			$header["status"] = "202 Accepted"
			return "Participant removed."
		end
	end

	def Poll.webservicedescription_0Initialization_getDuration
		{ "return" => "Dauer des Events in Minuten (integer)" }
	end
	def webservice_getDuration
		"60" #FIXME
	end

	###################################################################
	# Vote Casting
	###################################################################
	VOTEDESCR = <<FOO 
eigene Teilsumme:
<ul>
<li>{0,1}</li>
<li>+ Schlüssel aller Teilnehmer, die noch nicht gewählt haben</li>
<li>+ Schlüssel zu allen Teilnehmern in deren getUsedKeys man selbst steht</li>
</ul>
Format:<br />
vote[column][tableindex][inverted ? 1 : 0].toJSON()
FOO
comment = <<FOO
t_1<br />
vote_{t_1,j_1,n}<br />
vote_{t_1,j_1,i}<br />
...<br />
...<br />
vote_{t_1,j_I,n}<br />
vote_{t_1,j_I,i}<br />
<br />
...<br />
...<br />
<br />
t_T<br />
vote_{t_T,j_1,n}<br />
vote_{t_T,j_1,i}<br />
...<br />
...<br />
vote_{t_T,j_I,n}<br />
vote_{t_T,j_I,i}<br />

FOO
	def Poll.webservicedescription_1VoteCasting_setVote
		{ "return" => '"HTTP202" OR "HTTP403" OR "HTTP400"',
			"input" => ["gpgID", "vote", "signature"],
			"vote" => VOTEDESCR
		}
	end
	def webservice_setVote
		gpgID = $c["gpgID"]
		signature = $c["signature"]

		unless $dc["participants"].include?(gpgID)
			$header["status"] = "403 Forbidden"
			return "You are not allowed to vote."
		end
		

		unless true #FIXME: check signature
			$header["status"] = "403 Forbidden"
			return "The signature is wrong."
		else
			$dc[gpgID] ||= []
			$dc[gpgID] << {"signature" => signature}
		end
		
		begin
			h = JSON.parse($c["vote"])
		rescue => e
			$header["status"] = "400 Bad Request"
			return "invalid json format: #{e}"
		end

		begin
			$dc[gpgID].last["vote"] ||= {}
			h.each{|col,votearray|
				$dc[gpgID].last["vote"][col] ||= []
				votearray.each_with_index{|norm_inv,tableindex|
					$dc[gpgID].last["vote"][col][tableindex] ||= []
					norm_inv.each_with_index{|vote,inverted|
						$dc[gpgID].last["vote"][col][tableindex][inverted] = vote.to_i(36)
					}
				}
			}
		rescue => e
			$header["status"] = "400 Bad Request"
			return "vote has invalid structure: #{e}"
		end

		participants = {"voted" => [], "notVoted" => []}
		($dc["participants"] - [gpgID]).each{|p|
			participants[getState(p)] << p
		}
		usedKeys = participants["notVoted"]
		participants["voted"].each{|p|
			usedKeys << p if getUsedKeys(p).include?(gpgID)
		}

		$dc[gpgID].last["usedKeys"] = usedKeys

		$header["status"] = "202 Accepted"
		store_dc($dc, "Participant " + gpgID + " voted anonymously")
	end

	def Poll.webservicedescription_1VoteCasting_getState
		{ "return" => '"notVoted" OR "voted" OR "flying" OR "kickedOut", Warning: only "notVoted" and "voted" is supported currently',
		  "description" => "<span style='color:red'>deprecated</span> (getTotalParticipants)",
			"input" => ["gpgID"]}
	end
	def getState(gpgId)
		if $dc != nil && $dc[gpgId]
			#TODO sig überprüfen
			return "voted"
		else
			#TODO flying!!
			return "notVoted"
		end
	end
	def webservice_getState
		getState($c["gpgID"])
	end

	def Poll.webservicedescription_1VoteCasting_getUsedKeys
		{ "return" => 'Liste von gpgIDs der Votekeys, mit der der Benutzer <gpgID> seine Stimme verschlüsselt hat',
			"input" => ["gpgID"]
		}
	end
	def getUsedKeys(gpgID)
		$dc[gpgID][0]["usedKeys"].to_a
	end
	def webservice_getUsedKeys
		getUsedKeys($c["gpgID"]).join("\n")
	end

	def Poll.webservicedescription_1VoteCasting_setKickOutKeys
		{ "return" => 'HTTP202" OR "HTTP403"',
			"input" => ["gpgIDKicker","gpgIDLeaver","keys","signature"],
			"keys" => "symmetrische Schlüssel mit denen gewählt wurde<br />Format:<br />keys[column][tableindex][inverted ? 1 : 0].toJSON()" }
	end
	def webservice_setKickOutKeys
		victim = $c["gpgIDLeaver"]
		kicker = $c["gpgIDKicker"]
		unless $dc["participants"].include?(victim)
			$header["status"] = "403 Forbidden"
			return "#{victim} is not participant of this poll!"
		end

		unless $dc[kicker].collect{|v|
			v["usedKeys"].include?(victim)
		}.include?(true)
			$header["status"] = "403 Forbidden"
			return "#{kicker} did not used the key of #{victim}!"
		end

		$header["status"] = "202 Accepted"
		$dc["flying"] ||= {}
		$dc["flying"][victim] ||= {}
		$dc["flying"][victim][kicker] ||= []
		kickOut = {}
		begin
			kickOut["keys"] = JSON.parse($c["keys"])
		rescue => e
			$header["status"] = "400 Bad Request"
			return "invalid json format: #{e}"
		end
		kickOut["signature"] = $c["signature"]
		begin
			kickOut["keys"].each_value{|keyarray|
				keyarray.collect!{|key,inverted|
					[key.to_i(36),inverted.to_i(36)]
				}
			}
		rescue => e
			$header["status"] = "400 Bad Request"
			return "Keys have invalid structure: #{e}"
		end

		$dc["flying"][victim][kicker] << kickOut
		store_dc($dc,"Participant #{kicker} wants to kick out #{victim}")
		return "Removal request stored"
	end
	

	def Poll.webservicedescription_1VoteCasting_getKicker
		{ "return" => "Liste von GPG-IDs der Teilnehmer, die den Schlüssel schon aufgedeckt haben (1. = Initiator)",
			"input" => ["gpgIDLeaver"] }
	end
#	def webservicedescription_getKicker
#	end

	###################################################################
	# Result Publication
	###################################################################
	def Poll.webservicedescription_2ResultPublication_getVote
		{ "return" => 'Alle Summen aller Teilnehmer oder "HTTP403", falls Wahlgang noch nicht beendet',
			}
	end
	def webservice_getVote
		if webservice_getPollState != "closed"
			$header["status"] = "403 Forbidden"
			return "Die Umfrage wurde noch nicht beendet!"
		end
		ret = $dc
		ret.delete("participants")
		fly = ret.delete("flying")
		ret.each_value{|votes|
			votes.each{|v|
				v.delete("usedKeys")
				v['vote'].each_value{|tab|
					tab.each{|norm_inv|
						norm_inv.collect!{|i| i.to_s(36)}
					}
				}
			}
		}
		if fly
			fly.each_value{|keys|
				keys.each{|p,key|
					key.each{|k|
						k["keys"].each_value{|keyarray|
							keyarray.collect!{|key,inverted|
								[key.to_s(36),inverted.to_s(36)]
							}
						}
					}
				}
			}
			ret["kicked"] = fly
		end
		ret.to_json
	end

	def Poll.webservicedescription_2ResultPublication_getKickOutKey
		{ "return" => 'symmetrischer Schlüssel (vor Hash)',
			"input" => ["gpgIDKicker", "gpgIDLeaver", "timestamp", "tableindex", "inverted"] }
	end
#	def webservicedescription_getKickOutKey
#	end
	
	def Poll.webservicedescription_2ResultPublication_getKickOutSignature
		{ "return" => 'Liste von Signaturen',
			"input" => ["gpgIDKicker", "gpgIDLeaver"] }
	end
#	def webservicedescription_getKickOutSignature
#	end

end

def store_dc(data,comment)
	File.open("dc_data.yaml","w"){|f|
		f << data.to_yaml
	}
	VCS.commit(comment)
	"Sucessfully Stored"
end



if ARGV[0] == "test"
require 'test/unit'
class Webservice_test < Test::Unit::TestCase
	def setup
		$dc = {
			"participants"=>["0x2289ADC1", "0xD189C27D", "0x7EF2BF4E"],
			"flying"=>{
				"0x7EF2BF4E"=> {
					"0xD189C27D"=>[{
						"keys"=>{
							"a"=> [[0, 0], [0, 0], [0, 0]],
							"b"=> [[0, 0], [0, 0], [0, 0]]
						},
						"signature"=>"TODO"
					},{
						"keys"=>{
							"c"=> [[0, 0], [0, 0], [0, 0]]
						},
						"signature"=>"TODO"
					}
					],
					"0x2289ADC1"=>[{
						"keys"=>{
							"a"=> [[0, 0], [0, 0], [0, 0]],
							"c"=> [[0, 0], [0, 0], [0, 0]]
						},
						"signature"=>"TODO"
					}]
				}
			},
			"0xD189C27D"=> [{
				"vote"=>{
					"a"=> [[1,0], [0,0], [0,0]],
					"b"=> [[0,0], [0,1], [0,0]],
					"c"=> [[0,0], [0,1], [0,0]]
				},
				"signature"=>"TODO",
				"usedKeys"=>["0x2289ADC1", "0x7EF2BF4E"]
			}],
		 "0x2289ADC1"=> [{
		 		"vote"=> {
					"a"=> [[0,0], [1,0], [0,0]],
					"b"=> [[0,1], [0,0], [0,0]],
					"c"=> [[0,0], [1,0], [0,0]]
				},
				"signature"=>"TODO",
				"usedKeys"=>["0x7EF2BF4E", "0xD189C27D"]
			}]
		}
     $d = Poll.new
	end
	def test_getTotalParticipants()
		assert_equal(["a","b","c"],$d.getTotalParticipants()["0x2289ADC1"]['voted'][0][0])
		assert_equal(["a","b","c"],$d.getTotalParticipants()["0x7EF2BF4E"]["flying"]["0xD189C27D"])
	end
	def test_getPollState
		assert_equal("open",$d.webservice_getPollState)
		$dc["flying"]["0x7EF2BF4E"]["0x2289ADC1"] << {"keys" =>{"b"=> [[0, 0], [0, 0], [0, 0]]},"signature"=>"TODO"}
		assert_equal("closed",$d.webservice_getPollState)
	end
end

elsif __FILE__ == $0

require "pp"
require "cgi"
$c = CGI.new
$header = {}

webservices = {}
all = []
Poll.methods.collect{|m|
	m.scan(/^webservicedescription_(.*)_(.*)$/)[0]
}.compact.each{|phase,webservice|
	webservices[phase] ||= []
	webservices[phase] << webservice
	all << webservice
}

if all.include?($c["service"])
	$header = {"type" => "text/plain"}

	if $c.include?("pollID") && File.directory?("../../#{$c["pollID"]}/")
		Dir.chdir("../../#{$c["pollID"]}/")
		load "../dudle.rb"
		$d = Dudle.new

		if File.exist?("dc_data.yaml")
			$dc = YAML::load_file("dc_data.yaml")
		else
			$dc = {}
			File.open("dc_data.yaml","w").close
			VCS.add("dc_data.yaml")
			store_dc($dc,"Initialized for anonymous voting")
		end

		$c.out($header){
			$d.table.send("webservice_#{$c["service"]}")
		}
	else
		$header["status"] = "404 Not Found"
		$c.out($header){"The requested poll was not found!"}
	end

else


$out = <<NOTICE
<h1>Available Polls</h1>
<table>
	<tr>
		<th>Poll</th><th>Last change</th>
	</tr>
NOTICE
Dir.glob("../../*/data.yaml").sort_by{|f|
	File.new(f).mtime
}.reverse.collect{|f| f.gsub(/\.\.\/\.\.\/(.*)\/data\.yaml$/,'\1') }.each{|site|
	$out += <<NOTICE
<tr>
	<td class='polls'><a href='?pollID=#{CGI.escapeHTML(site).gsub("'","%27")}'>#{CGI.escapeHTML(site)}</a></td>
	<td class='mtime'>#{File.new("../../#{site}/data.yaml").mtime.strftime('%d.%m, %H:%M')}</td>
	<td><a href='../../#{CGI.escapeHTML(site).gsub("'","%27")}'>go there</a></td>
	<td>
	<div>
		<form style='margin-bottom:0px' method='post' action='../../#{CGI.escapeHTML(site).gsub("'","%27")}/delete_poll.cgi'>
			<div>
				<input type='hidden' name='confirmnumber' value='0' />
				<input type='hidden' name='confirm' value='phahqu3Uib4neiRi' />
				<input type='submit' value='delete it!' />
			</div>
		</form>
		</div>
	</td>
</tr>
NOTICE
}

$out += "</table>"

webservices.sort.each{|category,ws|
	$out << "<h1>#{category}</h1>"
	ws.sort.each{|w|
		d = Poll.send("webservicedescription_#{category}_#{w}")
		$out << <<TITLE
<h2>#{w}(#{d["input"].to_a.join(", ")})</h2>
#{d['description']}
<form method='get' action=''>
<div>
<input type='hidden' name='service' value='#{w}' />
<table class='settingstable'>
<tr>
	<td><label for="#{w}pollID">pollID:</label></td>
	<td><input id="#{w}pollID" size='16' type='text' name='pollID' value='#{$c["pollID"]}' /></td>
</tr>
TITLE

		if d["input"]
			d["input"].each{|i| 
				$out << <<ROW
<tr>
	<td><label for="#{w}#{i}">#{i}:</label></td>
	<td><input id="#{w}#{i}" size='16' type='text' name='#{i}' /></td>
	<td class="shorttextcolumn">#{d[i]}</td>
</tr>
ROW
			}
		end
		$out << <<END
<tr>
	<td><strong>return:</strong></td>
	<td class="shorttextcolumn" colspan='2' style='width: 25em'>#{CGI.escapeHTML(d["return"])}</td>
</tr>
<tr>
	<td></td><td><input type='submit' value='#{Poll.instance_methods.include?("webservice_" + w) ? "Call" : "TODO' disabled='disabled"}' /></td>
</tr>
</table>
</div>
</form>
END
	}
}

$c.out($header){ 
	$out
}

end

end
