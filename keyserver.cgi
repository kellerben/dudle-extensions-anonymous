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

require "digest/sha2"

class Keyserver
	def gpgid(key)
		dhpubkey = key.scan(/^DHPUB (.*)$/).flatten[0]
		"0x" + Digest::SHA2.new.hexdigest(dhpubkey).upcase
	end
	def Keyserver.webservicedescription_Keyserver_setKey
		{ "return" => "202",
			"input" => ["gpgKey"]}
	end
	def webservice_setKey
		$u[gpgid($cgi["gpgKey"])] = $cgi["gpgKey"]
		store($u)
		"Key sucessfully stored"
	end
	
	def getKey(gpgid)
		$u["0x" + gpgid.to_s.scan(/^0x(.*)$/).flatten[0].upcase]
	end

	def Keyserver.webservicedescription_Keyserver_getKey
		{ "return" => "gpgKey OR HTTP404 if user is unknown",
			"input" => ["gpgID"]}
	end
	def webservice_getKey
		ret = getKey($cgi["gpgID"])
		if ret
			return ret
		else
			$header["status"] = "404 Not Found"
			return "User #{$cgi["gpgID"]} is unknown."
		end
	end
	def Keyserver.webservicedescription_Keyserver_listAllKeys
		{ "return" => "list of gpgIDs" }
	end
	def webservice_listAllKeys
		$u.keys.sort.join("\n")
	end
	def Keyserver.webservicedescription_Keyserver_getName
		{ "return" => "gpgKey OR HTTP404 if user is unknown",
			"input" => ["gpgID"]}
	end
	def webservice_getName
		user = getKey($cgi["gpgID"])
		if user
			return user.scan(/^NAME (.*)$/).flatten[0].to_s
		else
			$header["status"] = "404 Not Found"
			return "User not found!"
		end
	end
	def Keyserver.webservicedescription_Keyserver_searchKey
		{ "return" => "gpgKey OR HTTP404 if user is unknown",
			"input" => ["name"]}
	end
	def webservice_searchKey
		$u.each{|user,key|
			return key if key.scan(/^NAME (.*)$/).flatten[0].to_s == $cgi["name"].chomp
		}
		$header["status"] = "404 Not Found"
		return "User not found!"
	end
	def store(data)
		File.open("keyserverdata.yaml","w"){|f|
			f << data.to_yaml
		}
	end
end


if __FILE__ == $0

require "pp"
require "yaml"
require "cgi"
$cgi = CGI.new
$header = {}
$header["charset"] = "utf-8"
$header["Cache-Control"] = "no-cache"

webservices = {}
all = []
Keyserver.methods.collect{|m|
	m.scan(/^webservicedescription_(.*)_(.*)$/)[0]
}.compact.each{|phase,webservice|
	webservices[phase] ||= []
	webservices[phase] << webservice
	all << webservice
}

if all.include?($cgi["service"])
	k = Keyserver.new
	if File.exist?("keyserverdata.yaml")
		$u = YAML::load_file("keyserverdata.yaml")
	else
		$u = {}
	end
	$header["type"] = "text/plain"
	$out = k.send("webservice_#{$cgi["service"]}")
else
$header["type"] = "text/html"
#$header["type"] = "application/xhtml+xml"

$out = <<HEAD
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"
  "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
	<title>Verfügbare Webservices</title>
	<meta http-equiv="Content-Type" content="#{$header["type"]}; charset=#{$header["charset"]}" /> 
	<meta http-equiv="Content-Style-Type" content="text/css" />
</head>
<body id='main'>
<div id='content'>
HEAD

webservices.sort.each{|category,ws|
	$out += "<h1>#{category}</h1>"
	ws.sort.each{|w|
		d = Keyserver.send("webservicedescription_#{category}_#{w}")
		$out += <<TITLE
<h2>#{w}(#{d["input"].to_a.join(", ")})</h2>
<form method='get' action=''>
<div>
<input type='hidden' name='service' value='#{w}' />
<table>
TITLE

		if d["input"]
			d["input"].each{|i| 
				$out += <<ROW
<tr>
	<td><label for="#{i}">#{i}:</label></td>
	<td><input id="#{i}" size='16' type='text' name='#{i}' /></td>
	<td>#{d[i]}</td>
</tr>
ROW
			}
		end
		$out += <<END
<tr>
	<td><strong>return:</strong></td>
	<td colspan='2' style='width: 25em'>#{CGI.escapeHTML(d["return"])}</td>
</tr>
<tr>
	<td colspan='2'><input type='submit' value='#{Keyserver.instance_methods.include?("webservice_" + w) ? "call" : "TODO' disabled='disabled"}' /></td>
</tr>
</table>
</div>
</form>
END
	}
}

$out += "</div>"
$out += "</body>"
$out += "</html>"
end

$cgi.out($header){$out}
end
