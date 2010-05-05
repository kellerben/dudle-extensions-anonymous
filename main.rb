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

class Extension
	def initialize(basedir)
		@basedir = basedir
		$d.html.add_script("var gsExtensiondir='#{basedir}/extensions/dc-net/';")

		if File.exists?("#{basedir}/extensions/dc-net/locale/#{GetText.locale}/dudle_dc-net.po")
			$d.html.add_html_head("<link rel='gettext' type='application/x-po' href='#{basedir}/extensions/dc-net/locale/#{GetText.locale}/dudle_dc-net.po' />")
		end
		$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/Gettext.js")
		$d.html.add_head_script("#{basedir}/extensions/dc-net/lib/prototype.js")
		
	end
	def add_lib(jslib)
		$d.html.add_head_script("#{@basedir}/extensions/dc-net/lib/#{jslib}.js")
	end
	def add_script(script)
		$d.html.add_script_file("#{@basedir}/extensions/dc-net/#{script}.js")
	end
	def add_css(file)
		$d.html.add_css("#{@basedir}/extensions/dc-net/#{file}.css")
	end
end


if $d.is_poll?
	e = Extension.new("..")

	case $d.tab
	when "invite_participants.cgi"

		e.add_lib("scriptaculous-effects")
		e.add_lib("scriptaculous-controls")

		e.add_script("common")
		e.add_script("invite_participants")
		e.add_css("invite_participants")

	when "." 

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
		e.add_lib("jsbn")
		e.add_lib("jsbn2")
		e.add_lib("jssha256")
		e.add_lib("jsaes")
		e.add_lib("prng4")
		e.add_lib("rng")

		e.add_script("common")
		e.add_script("login_register_common")
		e.add_script("participate")
		e.add_css("participate")
	end
else

	e = Extension.new(".")

	e.add_lib("jsbn")
	e.add_lib("jsbn2")
	e.add_lib("jssha256")
	e.add_lib("prng4")
	e.add_lib("rng")

	e.add_script("common")
	e.add_script("login_register_common")
	e.add_script("register")
end
