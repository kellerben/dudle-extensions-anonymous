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


case $d.tab
when "invite_participants.cgi"
	$d.html.add_head_script("../extensions/dc-net/lib/prototype.js")
	$d.html.add_script("../extensions/dc-net/common.js")
	$d.html.add_script("../extensions/dc-net/invite_participants.js")
when "." 
	if $d.is_poll?
		$d.html.add_head_script("../extensions/dc-net/lib/prototype.js")
		$d.html.add_head_script("../extensions/dc-net/lib/jsbn.js")
		$d.html.add_head_script("../extensions/dc-net/lib/jsbn2.js")
		$d.html.add_head_script("../extensions/dc-net/lib/jssha256.js")
		$d.html.add_head_script("../extensions/dc-net/lib/base64.js")
		$d.html.add_head_script("../extensions/dc-net/lib/jsaes.js")
		$d.html.add_script("../extensions/dc-net/common.js")
		$d.html.add_script("../extensions/dc-net/participate.js")
	end
end
