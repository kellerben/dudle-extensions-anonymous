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

require "cgi"
require "pp"
$c = CGI.new

# prevent malicious input as these fields are evaled afterwards
if $c["pollid"] =~ /^[a-zA-Z0-9_-]*$/ && $c["column"] =~ /^[a-zA-Z0-9_\#: -]*$/

	$header = {}
	tmpdir = "/tmp/keygraph.#{rand(9999999)}"
	Dir.mkdir(tmpdir)
	`cp keygraph.tex.erb #{tmpdir}`
	Dir.chdir(tmpdir)


	File.open("init","w"){|f|
		f << <<INIT
	URL = "http://#{$c.server_name}#{$c.script_name.gsub(/\/extensions\/dc-net\/keygraph.cgi$/,"")}"
	POLLID = "#{$c["pollid"]}"
	COLUMN = "#{$c["column"]}"
INIT
	}
	`erb keygraph.tex.erb > keygraph.tex`
	`pdflatex keygraph`


	if File.exists?("keygraph.pdf")
		$header["type"]= "application/pdf"
		$header["Content-Disposition"] = "attachment; filename=keygraph_#{$c["pollid"]}.pdf"
		out = File.open("keygraph.pdf","r").readlines.join("")
	else
		$header["type"] = "text/plain"
		out = $c.pretty_inspect
		out += "\n"
		out += File.open("init","r").readlines.join("")
		out += "\n"
		out += File.open("keygraph.log","r").readlines.join("")
	end

	$c.out($header){out}
	`rm -rf #{tmpdir}`
else
	$c.out(){"Sorry, no keygraph available for this column. Try another one!"}
end
