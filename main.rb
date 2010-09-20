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
		@basedir = basedir + "/extensions/dc-net"
		if File.exists?("#{@basedir}/config.rb")
			load "#{@basedir}/config.rb"
		else
			load "#{@basedir}/config_sample.rb"
		end
		$d.html.add_script("var gsDCExtensiondir='#{@basedir}/';")

		if File.exists?("#{@basedir}/locale/#{GetText.locale.language}/dudle_dc-net.po")
			$d.html.add_html_head("<link rel='gettext' type='application/x-po' href='#{@basedir}/locale/#{GetText.locale.language}/dudle_dc-net.po' />")
		end
		$d.html.add_head_script("#{@basedir}/lib/Gettext.js")
		$d.html.add_head_script("#{@basedir}/lib/prototype.js")
		
	end
	def add_lib(jslib)
		$d.html.add_head_script("#{@basedir}/lib/#{jslib}.js")
	end
	def add_script(script)
		if COMPRESSED
			$d.html.add_script_file("#{@basedir}/compressed/#{script}.js")
		else
			$d.html.add_script_file("#{@basedir}/#{script}.js")
		end
	end
	def add_css(file)
		$d.html.add_css("#{@basedir}/#{file}.css")
	end
end


if $d.is_poll?
	if File.exist?("dc_data.yaml") || $d.tab == "invite_participants.cgi"

		e = Extension.new("..")
		$d.html.add_script("var gsDCPollID = '#{$d.urlsuffix}';")

		case $d.tab
		when "invite_participants.cgi"

			$d.html.add_script(<<SCRIPT
var gsDCEdit = '#{EDIT}';
var gsDCDelete = '#{DELETE}';
SCRIPT
);

			e.add_lib("scriptaculous-effects")
			e.add_lib("scriptaculous-controls")

			e.add_script("common")
			e.add_script("invite_participants")
			e.add_css("invite_participants")

		when "." 

			if $USEUTF
			# †✉◌#░▨▧◍▩☨☩☥☦☢☣☠✄✈✝✞✟✠
				FLY = "✄"
				KICKED = "☠"
			else
				FLY = "-"
				KICKED = "-"
			end
			$d.html.add_script(<<SCRIPT
var gsDCEdit = '#{EDIT}';
var gsDCDelete = '#{DELETE}';
var gsDCUnknown = '#{UNKNOWN}';
var gsDCKickOut = '#{DELETE}';
var gsDCVoted = '#{PASSWORDSTAR}';
var gsDCFlying = '#{FLY}';
var gsDCKickedOut = '#{KICKED}';
SCRIPT
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
