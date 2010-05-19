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

$:.push("../../")
$:.uniq!
require "pp"
require "git"
require "cgistatus"
require "json"
require "keyserver"
class Poll
	###################################################################
	# Poll Initialization
	###################################################################
	def Poll.webservicedescription_0Initialization_addParticipant
		{ "return" => "",
			"input" => "gpgID"
		}
	end
	def webservice_addParticipant
		@dc["participants"] ||= []
		@dc["participants"] << $c["gpgID"]
		@dc["participants"].uniq!
		store_dc("Participant "+ @k.humanreadable($c["gpgID"]) + " invited for anonymous voting")
	end

	def Poll.webservicedescription_0Initialization_removeParticipant
		{ "return" => "202 wenn user entfernt wurde, 403 wenn der user nicht entfernt werden darf (er oder jemand anders hat schon seinen Schlüssel in einer Stimme benutzt), 404 wenn user nicht in Datenbank",
			"input" => "gpgID"
		}
	end
	def webservice_removeParticipant
		user = $c["gpgID"]
		unless @dc["participants"].include?(user)
			$header["status"] = "404 Not Found"
			return "The participant was not configured anyway!"
		end
		if @dc.keys.include?(user) 
			$header["status"] = "403 Forbidden"
			return "This participant already voted. Removing is forbidden"
		end
		if @dc["participants"].collect{|u|
			if @dc[u]
				@dc[u].collect{|v| v["usedKeys"].include?(user)}
			else 
				false
			end
		}.flatten.include?(true)
			return "The key of this user is already used in the poll. Please use kickOut to remove him."
		else
			@dc["participants"].delete(user)
			store_dc("Participant "+ @k.humanreadable($c["gpgID"]) + " removed from anonymous voting")
			$header["status"] = "202 Accepted"
			return "Participant removed."
		end
	end

	###################################################################
	# Poll Details
	###################################################################
	def Poll.webservicedescription_1Polldetails_getTitle
		{ "return" => "title" }
	end
	def webservice_getTitle
		@name
	end
	def Poll.webservicedescription_1Polldetails_getPollState
		{ "return" => "open, wenn noch nicht alle gewählt haben, sonst closed" }
	end
	def webservice_getPollState
		return "open" if @dc.empty?
		
		missing = {}
		total = getParticipants
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

	def Poll.webservicedescription_1Polldetails_getColumns
		{ "return" => "Liste der Spalten" }
	end
	def webservice_getColumns
		@head.columns.join("\n")
	end


	def Poll.webservicedescription_5Deprecated_getSimpleParticipants
		{ "return" => "Liste der GPG-IDs aller Teilnehmer",
		  "description" => "<span style='color:red'>deprecated</span> (getParticipants)"}
	end
	def webservice_getSimpleParticipants
		if @dc["participants"]
			return @dc["participants"].join("\n")
		else
			return ""
		end
	end

	def Poll.webservicedescription_1Polldetails_getDuration
		{ "return" => "Dauer des Events in Minuten (integer)" }
	end
	def webservice_getDuration
		"60" #FIXME
	end

	def Poll.webservicedescription_1Polldetails_getParticipants
		{ "description" => "Alles was man zum Abstimmen braucht",
		  "return" => "{id:{voted: [[[cols,…],[usedKeys,…]][cols,…],[usedKeys]]}, id2: {flying: {kickerid: [cols,…],kicker2:[cols,…]}}}"}
	end
	def getParticipants
		ret = {}
		if @dc["participants"]
			@dc["participants"].each{|p|
				ret[p] = {}
				if @dc[p]
					used = {}
					@dc[p].each{|col,vote|
						if @head.columns.include?(col)
							used[vote[:usedKeys].sort] ||= []
							used[vote[:usedKeys].sort] << col
						end
					}
					ret[p] = {"voted" =>[]}
					used.each{|usedkeys,cols|
						ret[p]["voted"] << [cols,usedkeys]
					}

				end
			}
			if @dc["flying"]
				@dc["flying"].each{|p,kickerkeys|
					ret[p]['flying'] = {}
					kickerkeys.each{|kicker,keymessages|
						ret[p]['flying'][kicker] = keymessages.collect{|m| m["keys"].keys}.uniq.flatten
					}
				}
			end
		end
		ret
	end
	def webservice_getParticipants
		getParticipants.to_json
	end

	###################################################################
	# Vote Casting
	###################################################################
	VOTEDESCR = <<FOO 
eigene Teilsumme:
<ul>
<li>{0,1}</li>
<li>+ Schlüssel aller Teilnehmer, die noch nicht gewählt haben</li>
<li>+ Schlüssel zu allen Teilnehmern in deren usedKeys man selbst steht</li>
</ul>
Format:<br />
vote[column][tableindex][inverted ? 1 : 0].toJSON()
FOO
	def Poll.webservicedescription_2VoteCasting_setVote
		{ "return" => '"HTTP202" OR "HTTP403" OR "HTTP400"',
			"input" => ["gpgID", "vote", "signature"],
			"vote" => VOTEDESCR
		}
	end
	def getParticipantState(p,c)
		participant = getParticipants[p]
		raise "Participant #{p} not configured" unless participant
		if participant.include?("voted")
			participant["voted"].each{|v|
				return "voted" if v[0].include?(c)
			}
		end
		if participant.include?("flying")
			participant["flying"].each_value{|f|
				return "flying" if f.include?(c)
			}
		end
		return "notVoted" 
	end
	def getUsedKeys(p,c)
		return [] unless @dc[p] 
		return [] unless @dc[p][c]
		return @dc[p][c][:usedKeys]
	end
	def webservice_setVote
		gpgID = $c["gpgID"]
		signature = $c["signature"]

		unless @dc["participants"] && @dc["participants"].include?(gpgID)
			$header["status"] = "403 Forbidden"
			return "You are not allowed to vote."
		end
		

		unless true #FIXME: check signature
			$header["status"] = "403 Forbidden"
			return "The signature is wrong."
		end
		
		begin
			h = JSON.parse($c["vote"])
		rescue => e
			$header["status"] = "400 Bad Request"
			return "invalid json format: #{e}"
		end

		ret = {}
		begin
			h.each{|col,votearray|
				ret[col] = {}

				participants = {"voted" => [], "notVoted" => []}
				(@dc["participants"] - [gpgID]).each{|p|
					participants[getParticipantState(p, col)] << p
				}
				usedKeys = participants["notVoted"]
				participants["voted"].each{|p|
					usedKeys << p if getUsedKeys(p, col).include?(gpgID)
				}
				ret[col][:usedKeys] = usedKeys

				ret[col][:vote] ||= []
				votearray.each_with_index{|norm_inv,tableindex|
					ret[col][:vote][tableindex] ||= []
					norm_inv.each_with_index{|vote,inverted|
						ret[col][:vote][tableindex][inverted] = vote.to_i(36)
					}
				}
			}
		rescue => e
			raise e
			$header["status"] = "400 Bad Request"
			return "vote has invalid structure: #{e}"
		end

		$header["status"] = "202 Accepted"
		@dc[gpgID] ||= {}
		@dc[gpgID][:raw] ||= []
		@dc[gpgID][:raw] << {:vote => $c["vote"], :signature => signature }
		@dc[gpgID].merge!(ret)

		store_dc("Participant " + @k.humanreadable(gpgID) + " voted anonymously")
	end

	def Poll.webservicedescription_5Deprecated_getState
		{ "return" => '"notVoted" OR "voted" OR "flying" OR "kickedOut", Warning: only "notVoted" and "voted" is supported currently',
		  "description" => "<span style='color:red'>deprecated</span> (getParticipants)",
			"input" => ["gpgID"]}
	end
	def getState(gpgId)
		if @dc != nil && @dc[gpgId]
			return "voted"
		else
			#TODO flying!!
			return "notVoted"
		end
	end
	def webservice_getState
		getState($c["gpgID"])
	end

	def Poll.webservicedescription_5Deprecated_getUsedKeys
		{ "return" => 'Liste von gpgIDs der Votekeys, mit der der Benutzer <gpgID> seine Stimme verschlüsselt hat',
		  "description" => "<span style='color:red'>deprecated</span> (getParticipants)",
			"input" => ["gpgID"]
		}
	end
	def getOldUsedKeys(gpgID)
		@dc[gpgID][0]["usedKeys"].to_a
	end
	def webservice_getUsedKeys
		getOldUsedKeys($c["gpgID"]).join("\n")
	end

	def Poll.webservicedescription_2VoteCasting_setKickOutKeys
		{ "return" => 'HTTP202" OR "HTTP403"',
			"input" => ["gpgIDKicker","gpgIDLeaver","keys","signature"],
			"keys" => "symmetrische Schlüssel mit denen gewählt wurde<br />Format:<br />keys[column][tableindex][inverted ? 1 : 0].toJSON()" }
	end
	def webservice_setKickOutKeys
		victim = $c["gpgIDLeaver"]
		kicker = $c["gpgIDKicker"]
		if !@dc["participants"] || !@dc["participants"].include?(victim) 
			$header["status"] = "403 Forbidden"
			return "#{victim} is not participant of this poll!"
		end
		
		#FIXME: this checks only if there is any col with a used key, not if every col in key is used
		if !@dc[kicker] || !@dc[kicker].collect{|cols|
			if @head.columns.include?(cols[0])
				cols[1][:usedKeys].include?(victim)
			end
		}.include?(true)
			$header["status"] = "403 Forbidden"
			return "#{kicker} did not used the key of #{victim}!"
		end

		$header["status"] = "202 Accepted"
		@dc["flying"] ||= {}
		@dc["flying"][victim] ||= {}
		@dc["flying"][victim][kicker] ||= []
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

		if @dc["flying"][victim][kicker].include?(kickOut)
			$header["status"] = "304 Not Modified"
			return "The same information were already sent before"
		end

		@dc["flying"][victim][kicker] << kickOut
		store_dc("Participant #{@k.humanreadable(kicker)} wants to kick out #{@k.humanreadable(victim)} from anonymous voting")
		return "Removal request stored"
	end
	

	###################################################################
	# Result Publication
	###################################################################
	def Poll.webservicedescription_3ResultPublication_getVote
		{ "return" => 'Alle Summen aller Teilnehmer oder "HTTP403", falls Wahlgang noch nicht beendet',
			}
	end
	def webservice_getVote
		if webservice_getPollState != "closed"
			$header["status"] = "403 Forbidden"
			return "Die Umfrage wurde noch nicht beendet!"
		end

		getVote.to_json
	end

	def getVote
		@dc.delete("participants")
		fly = @dc.delete("flying")
		ret = {}
		@dc.each{|p,votes|
			ret[p] = []
			votes[:raw].each{|v|
				ret[p] << { 
					"vote" => JSON.parse(v[:vote]), 
					"signature" => v[:signature]
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
		ret
	end

	###################################################################
	# Debug
	###################################################################
	def Poll.webservicedescription_4Debug_getDebug
		{ "return" => "debug" }
	end
	def webservice_getDebug
		@dc.pretty_inspect + "\n" + self.pretty_inspect
	end
	def Poll.webservicedescription_4Debug_getParticipantsPP
		{ "return" => "getParticipants.pretty_inspect" }
	end
	def webservice_getParticipantsPP
		getParticipants.pretty_inspect
	end
	def Poll.webservicedescription_4Debug_getVotePP
		{ "return" => "getVote.pretty_inspect" }
	end
	def webservice_getVotePP
		getVote.pretty_inspect
	end

	def store_dc(comment)
		File.open("dc_data.yaml","w"){|f|
			f << @dc.to_yaml
		}
		VCS.commit(comment)
		"Sucessfully Stored"
	end
	def initialize_dc
		@k = Keyserver.new("keyserverdata/")
		if File.exist?("dc_data.yaml")
			@dc = YAML::load_file("dc_data.yaml")
		else
			@dc = {}
			File.open("dc_data.yaml","w").close
			VCS.add("dc_data.yaml")
			store_dc("Initialized for anonymous voting")
		end
	end

end


if __FILE__ == $0
require 'test/unit'
class PollHead
	attr_accessor :columns
end
class Poll
	attr_accessor :head, :dc
	def initialize
		@head = PollHead.new
		@k = Keyserver.new("keyserverdata/")
		@dc = {}
	end
	def store_dc(comment)
	end
	def store
	end
end
class Webservice_test < Test::Unit::TestCase
	def setup
		@votes = {
			:Alice => { 
				"gpgID" => "0xD189C27D",
				"vote" =>{
					"a"=> [["1","0"], ["0","0"], ["0","0"]],
					"b"=> [["0","0"], ["0","1"], ["0","0"]],
					"c"=> [["0","0"], ["0","1"], ["0","0"]]
				}.to_json,
				"signature" =>"TODO"
				},
			:Bob1 => {
				"gpgID" => "0x2289ADC1",
		 		"vote" => {
					"a"=> [["0","0"], ["1","0"], ["0","0"]],
					"c"=> [["0","0"], ["1","0"], ["0","0"]]
				}.to_json,
				"signature" =>"TODO"
			},
			:Bob2 => {
				"gpgID" => "0x2289ADC1",
		 		"vote" => {
					"b"=> [["0","1"], ["0","0"], ["0","0"]]
				}.to_json,
				"signature" =>"TODO"
			}
		}
		@participants = {:Bob => "0x2289ADC1", :Alice => "0xD189C27D", :Mallory => "0x7EF2BF4E"}
		@kickkeys = {
			:Alice1 => {
				"keys"=>{
					"a"=> [["0", "0"], ["0", "0"], ["0", "0"]],
					"b"=> [["0", "0"], ["0", "0"], ["0", "0"]]
				}.to_json,
				"gpgIDKicker" => "0xD189C27D",
				"gpgIDLeaver" => "0x7EF2BF4E",
				"signature" =>"TODO"
			},
			:Alice2 => {
				"keys" =>{
					"c"=> [["0", "0"], ["0", "0"], ["0", "0"]]
				}.to_json,
				"gpgIDKicker" => "0xD189C27D",
				"gpgIDLeaver" => "0x7EF2BF4E",
				"signature"=>"TODO"
			},
			:Bob =>{
				"keys"=>{
					"a"=> [["0", "0"], ["0", "0"], ["0", "0"]],
					"b"=> [["0", "0"], ["0", "0"], ["0", "0"]],
					"c"=> [["0", "0"], ["0", "0"], ["0", "0"]]
				}.to_json,
				"gpgIDKicker" => "0x2289ADC1",
				"gpgIDLeaver" => "0x7EF2BF4E",
				"signature"=>"TODO"
			}
		}
		@d = Poll.new
		@d.head.columns = ["a","b","c"]
		$header = {}
		$c = {}
	end
	def addtestparticipants
		backup = $c
		@participants.each_value{|id|
			$c["gpgID"] = id
			@d.webservice_addParticipant
		}
		$c = backup
	end
	def addtestvote(name)
		backup = $c
		$c = @votes[name]
		@d.webservice_setVote
		$c = backup
	end
	def addtestvotes
		@votes.each_key{|name|
			addtestvote(name)
		}
	end
	def addtestkickers
		@kickkeys.each_value{|kickkey|
			$c = kickkey
			@d.webservice_setKickOutKeys
		}
	end
	def test_getColumns
		assert_equal(["a","b","c"],@d.webservice_getColumns.scan(/^.*$/).flatten.sort)
	end
	def test_add_simpleget_remove_Participants
		assert_equal({},@d.getParticipants)

		$c["gpgID"] = @participants[:Alice]
		@d.webservice_addParticipant
		assert_equal({@participants[:Alice] => {}},@d.getParticipants)

		$c["gpgID"] = @participants[:Bob]
		@d.webservice_addParticipant
		@d.webservice_removeParticipant
		assert_equal(CGI::HTTP_STATUS[202],$header["status"])

		$c["gpgID"] = "0xdeadbeef"
		@d.webservice_removeParticipant
		assert_equal(CGI::HTTP_STATUS[404],$header["status"])

		assert_equal({@participants[:Alice] => {}},@d.getParticipants)
	end
	def test_getParticipants
		assert_equal({},@d.getParticipants)
		addtestparticipants
		addtestvotes
		
		assert(@d.getParticipants[@participants[:Alice]].include?("voted"))
		assert(@d.getParticipants[@participants[:Bob]].include?("voted"))
		assert(!@d.getParticipants[@participants[:Mallory]].include?("voted"))
		assert_equal(["a","b","c"],@d.getParticipants[@participants[:Alice]]["voted"][0][0])
		addtestkickers
		assert(@d.getParticipants[@participants[:Mallory]].include?("flying"))
		assert_equal(["a","b","c"],@d.getParticipants[@participants[:Mallory]]["flying"][@participants[:Alice]])
	end
	def test_getPollState
		assert_equal("open",@d.webservice_getPollState)
		addtestparticipants
		assert_equal("open",@d.webservice_getPollState)
		addtestvote(:Alice)
		assert_equal("open",@d.webservice_getPollState)
		addtestvotes
		addtestkickers
		assert_equal("closed",@d.webservice_getPollState)
	end
	def test_getParticipantState
		assert_raise(RuntimeError){@d.getParticipantState("0xdeadbeef","b")}
		addtestparticipants
		assert_equal("notVoted",@d.getParticipantState(@participants[:Alice],"b"))

		addtestvotes
		assert_equal("voted",@d.getParticipantState(@participants[:Alice],"b"))
		addtestkickers
		assert_equal("flying",@d.getParticipantState(@participants[:Mallory],"b"))
	end
	def test_setVote
		$c = @votes[:Alice]
		@d.webservice_setVote
		assert_equal(CGI::HTTP_STATUS[403],$header["status"])

		addtestparticipants
		@d.webservice_setVote
		assert_equal(CGI::HTTP_STATUS[202],$header["status"])

		$c = @votes[:Bob1]
		@d.webservice_setVote
		assert_equal(CGI::HTTP_STATUS[202],$header["status"])

		$c["vote"] = {"a" => {}}
		@d.webservice_setVote
		assert_equal(CGI::HTTP_STATUS[400],$header["status"])
	end
	def test_getUsedKeys
		addtestparticipants
		assert_equal([],@d.getUsedKeys(@participants[:Alice],"b"))
		addtestvote(:Alice)
		assert_equal([@participants[:Bob],@participants[:Mallory]].sort,@d.getUsedKeys(@participants[:Alice],"b").sort)

	end
	def test_setKickOutKeys
		$c = @kickkeys[:Bob]
		@d.webservice_setKickOutKeys
		assert_equal(CGI::HTTP_STATUS[403],$header["status"])

		addtestparticipants
		@d.webservice_setKickOutKeys
		assert_equal(CGI::HTTP_STATUS[403],$header["status"])

		addtestvotes
		@d.webservice_setKickOutKeys
		assert_equal(CGI::HTTP_STATUS[202],$header["status"])
	end
	def test_getVote
		@d.webservice_getVote
		assert_equal(CGI::HTTP_STATUS[403], $header["status"])
		addtestparticipants
		addtestvotes
		addtestkickers
		result = JSON.parse(@d.webservice_getVote)
		assert_equal([["1", "0"], ["0", "0"], ["0", "0"]], result[@participants[:Alice]][0]["vote"]["a"])
	end
end

end

