############################################################################
# Copyright 2009,2010 Benjamin Kellermann                                  #
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

def logintab(basedir)
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/prototype.js")
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/jsbn.js")
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/jsbn2.js")
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/jssha256.js")
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/base64.js")
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/jsaes.js")
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/prng4.js")
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/rng.js")
	$d.html.add_script("var gsExtensiondir='#{basedir}/extensions/dc-net/';")
	$d.html.add_script_file("#{basedir}/extensions/dc-net/common.js")
	$d.html.add_script_file("#{basedir}/extensions/dc-net/login_register.js")
end

logintab($d.is_poll? ? ".." : ".")

case $d.tab
when "invite_participants.cgi"
	$d.html.add_head_script("../extensions/dc-net/lib/scriptaculous-effects.js")
	$d.html.add_head_script("../extensions/dc-net/lib/scriptaculous-controls.js")
	$d.html.add_script_file("../extensions/dc-net/invite_participants.js")
	$d.html.add_css("../extensions/dc-net/invite_participants.css")
when "." 
	$d.html.add_script_file("../extensions/dc-net/participate.js") if $d.is_poll?
end
