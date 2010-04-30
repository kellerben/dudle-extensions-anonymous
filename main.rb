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

def locale_prototype_extensiondir(basedir)
	$d.html.add_script("var gsExtensiondir='#{basedir}/extensions/dc-net/';")

	if File.exists?("#{basedir}/extensions/dc-net/locale/#{GetText.locale}/dudle_dc-net.po")
		$d.html.add_html_head("<link rel='gettext' type='application/x-po' href='#{basedir}/extensions/dc-net/locale/#{GetText.locale}/dudle_dc-net.po' />")
	end
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/Gettext.js")
	$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/prototype.js")
end

case $d.tab
when "invite_participants.cgi"
	locale_prototype_extensiondir("..")

	$d.html.add_head_script("../extensions/dc-net/lib/scriptaculous-effects.js")
	$d.html.add_head_script("../extensions/dc-net/lib/scriptaculous-controls.js")

	$d.html.add_script_file("../extensions/dc-net/common.js")
	$d.html.add_script_file("../extensions/dc-net/invite_participants.js")
	$d.html.add_css("../extensions/dc-net/invite_participants.css")

when "." 
	if $d.is_poll?
		locale_prototype_extensiondir("..")

		$d.html.add_script(<<SCRIPT
var gsEdit = '#{EDIT}';
var gsUnknown = '#{UNKNOWN}';
var gsKickOut = '#{DELETE}';
var gsVoted = '#{PASSWORDSTAR}';
var gsFlying = '⚠';
var gsKickedOut = '𝄐';
SCRIPT
# ⚠⬚⸪𝄽𝄐✉◌#
)
		$d.html.add_head_script("../extensions/dc-net/lib/jsbn.js")
		$d.html.add_head_script("../extensions/dc-net/lib/jsbn2.js")
		$d.html.add_head_script("../extensions/dc-net/lib/jssha256.js")
		$d.html.add_head_script("../extensions/dc-net/lib/jsaes.js")
		$d.html.add_head_script("../extensions/dc-net/lib/prng4.js")
		$d.html.add_head_script("../extensions/dc-net/lib/rng.js")

		$d.html.add_script_file("../extensions/dc-net/common.js")
		$d.html.add_script_file("../extensions/dc-net/login_register_common.js")
		$d.html.add_script_file("../extensions/dc-net/participate.js")
		$d.html.add_css("../extensions/dc-net/participate.css")
	end
end
unless $d.is_poll?
	locale_prototype_extensiondir(".")

	$d.html.add_head_script("extensions/dc-net/lib/jsbn.js")
	$d.html.add_head_script("extensions/dc-net/lib/jsbn2.js")
	$d.html.add_head_script("extensions/dc-net/lib/jssha256.js")
	$d.html.add_head_script("extensions/dc-net/lib/prng4.js")
	$d.html.add_head_script("extensions/dc-net/lib/rng.js")

	$d.html.add_script_file("extensions/dc-net/common.js")
	$d.html.add_script_file("extensions/dc-net/login_register_common.js")
	$d.html.add_script_file("extensions/dc-net/register.js")
end
