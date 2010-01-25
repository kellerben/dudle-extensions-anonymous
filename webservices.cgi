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
		return "open" unless $dc
		ret = true
		rett = ""
		@data.keys.each{|p|
			ret = false unless $dc[p]
		}
		ret ? "closed" : "open"
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
		{ "return" => "Liste potentieller Startzeiten des Events (rfc3339) oder 204 wenn noch nix konfiguriert" }
	end
	def webservice_getTimeStamps
		# FIXME, when it should work for seconds or pollhead
		if @head.columns.empty?
			$header["status"] = "204 No Content"
			return ""
		else
			@head.columns.collect{|t| "#{t}:00+01:00" }.join("\n")
		end
	end


	def Poll.webservicedescription_0Initialization_getParticipants
		{ "return" => "Liste der GPG-IDs aller Teilnehmer oder 204 wenn noch nix konfiguriert"}
	end
	def webservice_getParticipants
		if @data.keys.empty?
			$header["status"] = "204 No Content"
			return ""
		else
			@data.keys.join("\n")
		end
	end

	def Poll.webservicedescription_0Initialization_addParticipant
		{ "return" => "",
			"input" => "gpgID"
		}
	end
	def webservice_addParticipant
		$dc["participants"] ||= []
		$dc["participants"] << $cgi["gpgID"]
		$dc["participants"].uniq!
		store_dc($dc)
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
	def Poll.webservicedescription_1VoteCasting_setVote
		{ "return" => '"HTTP202" OR "HTTP403"',
			"input" => ["gpgID", "vote", "timestamp", "tableindex"],
			"vote" => "eigene Teilsumme ({0,1} + Schlüssel aller Teilnehmer, die noch nicht gewählt haben + Schlüssel zu allen Teilnehmern in deren getUsedKeys man selbst steht)" }
	end
	def webservice_setVote
		# TODO return 403 if necessary
		gpgID = $cgi["gpgID"]
		vote = $cgi["vote"]
		timestamp = $cgi["timestamp"]
		tableindex = $cgi["tableindex"].to_i

		$dc[gpgID] ||= {}
		$dc[gpgID][timestamp] ||= []
		$dc[gpgID][timestamp][tableindex] = vote

		participants = {"voted" => [], "notVoted" => []}
		(@data.keys - [gpgID]).each{|p|
			participants[getState(p)] << p
		}
		usedKeys = participants["notVoted"]
		participants["voted"].each{|p|
			usedKeys << p if getUsedKeys(p).include?(gpgID)
		}

		$dc[gpgID]["usedKeys"] = usedKeys

		$header["status"] = "202 Accepted"
		store_dc($dc)
	end
	
	def Poll.webservicedescription_1VoteCasting_setVoteSignature
		{ "return" => '"HTTP202" if the signature is correct (votes are stored persistant in this case) OR "HTTP403" otherwise',
			"input" => ["gpgID", "signature"],
			"signature" => 'for (t in timestamps){for (i in tableindizes){sigstring += t + i + vote}};sign(sigstring)' }
	end
	def webservice_setVoteSignature
		# TODO return 403 if getState == "voted" && getState fertig implementiert
		$dc[$cgi["gpgID"]]["signature"] = $cgi["signature"]
		$header["status"] = "202 Accepted"
		store_dc($dc)
	end

	def Poll.webservicedescription_1VoteCasting_getState
		{ "return" => '"notVoted" OR "voted" OR "flying" OR "kickedOut", Warning: only "notVoted" and "voted" is supported currently',
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
		getState($cgi["gpgID"])
	end

	def Poll.webservicedescription_1VoteCasting_getUsedKeys
		{ "return" => 'Liste von gpgIDs der Votekeys, mit der der Benutzer <gpgID> seine Stimme verschlüsselt hat',
			"input" => ["gpgID"]
		}
	end
	def getUsedKeys(gpgID)
		$dc[gpgID]["usedKeys"].to_a
	end
	def webservice_getUsedKeys
		getUsedKeys($cgi["gpgID"]).join("\n")
	end

	def Poll.webservicedescription_1VoteCasting_setKickOutKey
		{ "return" => 'HTTP202" OR "HTTP403"',
			"input" => ["gpgIDSender","gpgIDLeaver","timestamp", "tableindex", "key"],
			"key" => "symmetrischer Schlüssel mit dem gewählt wurde" }
	end
#	def webservicedescription_setKickOutKey
#	end
	
	def Poll.webservicedescription_1VoteCasting_setKickOutSignature
		{ "return" => 'HTTP202" OR "HTTP403" (same as setVoteSignature)',
			"input" => ["gpgIDSender","gpgIDLeaver","signature"],
			"signature" => "genauso gebildet wie bei voteSignature aber key statt vote"}
	end
#	def webservicedescription_setKickOutSignature
#	end

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
		{ "return" => 'Teilsumme des Teilnehmers oder "HTTP403", falls Wahlgang noch nicht beendet',
			"input" => ["gpgID", "timestamp", "tableindex"]}
	end
	def webservice_getVote
		if webservice_getPollState == "open"
			$header["status"] = "403 Forbidden"
			return "Die Umfrage wurde noch nicht beendet!"
		end
		$dc[$cgi["gpgID"]][$cgi["timestamp"]][$cgi["tableindex"].to_i].to_s
	end

	def Poll.webservicedescription_2ResultPublication_getVoteSignature
		{ "return" => 'Signatur, der betreffenden Wahl oder "HTTP403", falls Wahlgang noch nicht beendet',
			"input" => ["gpgID"] }
	end
	def webservice_getVoteSignature
		$dc[$cgi["gpgID"]]["signature"]
	end
	
	def Poll.webservicedescription_2ResultPublication_getKickOutKey
		{ "return" => 'symmetrischer Schlüssel (vor Hash)',
			"input" => ["gpgIDSender", "gpgIDLeaver", "timestamp", "tableindex"] }
	end
#	def webservicedescription_getKickOutKey
#	end
	
	def Poll.webservicedescription_2ResultPublication_getKickOutSignature
		{ "return" => 'Liste von Signaturen',
			"input" => ["gpgIDSender", "gpgIDLeaver", "timestamp", "tableindex"] }
	end
#	def webservicedescription_getKickOutSignature
#	end

	def store_dc(data)
		File.open("dc_data.yaml","w"){|f|
			f << data.to_yaml
		}
		"Sucessfully Stored"
	end
end


if __FILE__ == $0

require "pp"
require "cgi"
$cgi = CGI.new
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

if all.include?($cgi["service"])
	$header = {"type" => "text/plain"}
	Dir.chdir("../../#{$cgi["pollID"]}/")
	load "../dudle.rb"
	$d = Dudle.new

	if File.exist?("dc_data.yaml")
		$dc = YAML::load_file("dc_data.yaml")
	else
		$dc = {}
	end

	$cgi.out($header){
		$d.table.send("webservice_#{$cgi["service"]}")
	}

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
<form method='get' action=''>
<div>
<input type='hidden' name='service' value='#{w}' />
<table class='settingstable'>
<tr>
	<td><label for="#{w}pollID">pollID:</label></td>
	<td><input id="#{w}pollID" size='16' type='text' name='pollID' value='#{$cgi["pollID"]}' /></td>
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
	<td></td><td><input type='submit' value='#{Poll.instance_methods.include?("webservice_" + w) ? "call" : "TODO' disabled='disabled"}' /></td>
</tr>
</table>
</div>
</form>
END
	}
}

c = <<COMMENT
global

getKey(gpgID)
        return: gpgKey
        über BouncyCastle oder Runtime.exec("gpg ...")

getDeadline(pollID)
        return: timestamp
        Enddatum der Abstimmung

getCommentIDs(pollID)
        return: List<commentID>
        Liste aller Comment-IDs zu dieser Umfrage

getCommentWriter(pollID, commentID)
        return: userPseudonym

getCommentTime(pollID, commentID)
        return: timestamp

getCommentText(pollID, commentID)
        return: content
        Inhalt des Kommentars
COMMENT

$cgi.out($header){ 
	$out
}

end

end
