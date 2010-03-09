############################################################################
# Copyright 2009 Benjamin Kellermann                                       #
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

default: locale/de/dudle_dc-net.mo

locale/dudle_dc-net.pot: *.js
	rm -f locale/dudle_dc-net.pot
	xgettext -L Python *.js -o $@

%.mo: %.po
	rmsgfmt $*.po -o $*.mo

locale/%/dudle_dc-net.po: locale/dudle_dc-net.pot
	msgmerge locale/$*/dudle_dc-net.po locale/dudle_dc-net.pot >/tmp/dudle_dc-net_$*_tmp.po
	if [ "`msgcomm -u /tmp/dudle_dc-net_$*_tmp.po locale/$*/dudle_dc-net.po`" ];then\
		mv /tmp/dudle_dc-net_$*_tmp.po locale/$*/dudle_dc-net.po;\
	else\
		touch locale/$*/dudle_dc-net.po;\
	fi
	if [ "`postats -f locale/$*/dudle_dc-net.po|tail -n1 |cut -d"(" -f3|cut -d")" -f1`" = "100%\n" ];\
		then poedit locale/$*/dudle_dc-net.po;\
	fi
