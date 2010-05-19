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
require "yaml"
require "git"
require "digest/sha2"
require "cgistatus"

class Keyserver
	def initialize(dir)
		@dir = dir
		if File.exist?("#{dir}/data.yaml")
			@u = YAML::load_file("#{dir}/data.yaml")
		else
			Dir.mkdir(dir)
			Dir.chdir(dir)
			VCS.init
			@u = {}
			File.open("data.yaml","w"){|f|
				f << @u.to_yaml
			}
			VCS.add("data.yaml")
			VCS.commit("init keyserver")
			Dir.chdir("..")
		end
	end
	def humanreadable(gpgid)
		begin
		name = Keyserver.getName(getKey(gpgid))
		rescue => e
			if e.message == "Bad key format"
				return gpgid
			else 
				raise e
			end
		end
		name
	end
	def Keyserver.gpgid(key)
		dhpubkey = key.scan(/DHPUB ([\da-fA-F]*)/).flatten[0]
		raise "Bad key format" unless dhpubkey
		"0x" + Digest::SHA2.new.hexdigest(dhpubkey).upcase[56..64]
	end

	def getKey(gpgid)
		hex = gpgid.to_s.scan(/^0x(.*)$/).flatten[0]
		if hex
			return @u["0x" + hex.upcase]
		else
			return nil
		end
	end

	def Keyserver.getName(key)
		raise "Bad key format" unless key
		name = key.scan(/^NAME (.*)$/).flatten[0].to_s
		raise "Bad key format" if name == ""
		name
	end

	def store(comment)
		Dir.chdir(@dir)
		File.open("data.yaml","w"){|f|
			f << @u.to_yaml
		}
		VCS.commit(comment)
		Dir.chdir("..")
	end

	def searchId(name)
		@u.each{|user,key|
			return Keyserver.gpgid(key) if key.scan(/^NAME (.*)$/).flatten[0].to_s == name
		}
		nil
	end

	def Keyserver.webservicedescription_Keyserver_setKey
		{ "return" => "202 or 400 if key bad formated or 403 if name already exists",
			"input" => ["gpgKey"]}
	end
	def webservice_setKey
		begin
			id = Keyserver.gpgid($cgi["gpgKey"])
			name = Keyserver.getName($cgi["gpgKey"])
		rescue => e
			if e.message == "Bad key format"
				$header["status"] = CGI::HTTP_STATUS[400]
				return e.message
			else
				raise e
			end
		end
		if searchId(name)
			$header["status"] = CGI::HTTP_STATUS[403]
			return "The User already exists"
		end

		@u[id] = $cgi["gpgKey"]
		store("Public Key for #{humanreadable(id)} added.")
		$header["status"] = CGI::HTTP_STATUS[202]
		"Key with id #{id} sucessfully stored"
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
			$header["status"] = CGI::HTTP_STATUS[404]
			return "User #{$cgi["gpgID"]} is unknown."
		end
	end
	def Keyserver.webservicedescription_Keyserver_listAllIds
		{ "return" => "list of gpgIDs" }
	end
	def webservice_listAllIds
		@u.keys.sort.join("\n")
	end
	def Keyserver.webservicedescription_Keyserver_listAllNames
		{ "return" => "list of Names of registered keys" }
	end
	def webservice_listAllNames
		@u.values.collect{|key| key.scan(/^NAME (.*)$/).flatten[0]}.join("\n")
	end
	def Keyserver.webservicedescription_Keyserver_getName
		{ "return" => "gpgKey OR HTTP404 if user is unknown",
			"input" => ["gpgID"]}
	end

	def webservice_getName
		key = getKey($cgi["gpgID"])
		if key
			name = Keyserver.getName(key)
			if name
				return name
			end
		end
		$header["status"] = CGI::HTTP_STATUS[404]
		return "User not found!"
	end
	def Keyserver.webservicedescription_Keyserver_searchId
		{ "return" => "gpgKey OR HTTP404 if user is unknown",
			"input" => ["name"]}
	end
	def webservice_searchId
		id = searchId($cgi["name"].chomp)
		if id
			return id
		else
			$header["status"] = CGI::HTTP_STATUS[404]
			return "User not found!"
		end
	end
	def Keyserver.webservicedescription_Keyserver_searchKey
		{ "return" => "gpgKey OR HTTP404 if user is unknown",
			"input" => ["name"]}
	end
	def webservice_searchKey
		@u.each{|user,key|
			return key if key.scan(/^NAME (.*)$/).flatten[0].to_s == $cgi["name"].chomp
		}
		$header["status"] = CGI::HTTP_STATUS[404]
		return "User not found!"
	end
	def Keyserver.webservicedescription_Keyserver_searchName
		{ "return" => "list of possible names for a given substring",
			"input" => ["search"]}
	end
	def webservice_searchName
		ret = []
		@u.each{|user,key|
			name = key.scan(/^NAME (.*)$/).flatten[0].to_s
			ret << name unless name.downcase.scan($cgi["search"].downcase).empty?
		}
		return "<ul><li>#{ret.join('</li><li>')}</li></ul>".gsub("<li></li>","")
	end
end


if __FILE__ == $0

require "pp"
require 'test/unit'
class Keyserver
	attr_accessor :u
	def initialize(dir)
		@dir = "/dev/null"
		@u = {}
	end
	def store(comment)
	end
end
class Keyserver_test < Test::Unit::TestCase
	def setup
		$header = {}
		$cgi = {}
		@k = Keyserver.new("foo")
		@somekeys = {
			:Alice => { 
				:id => "0xD189C27D",
				:key => "NAME Alice\nDHPUB e890c9072acbcb3dd93a586b882f1a478998dd1ef979475550307ebfb2f843f302dc865fc88bac9be612e26410cc51ff2d5192cdbd61a840a27427ece97fa8c4250a820f95aad76ad2b2a1c0000396693d05b2ba882745b68bbf72ccec317ecf"
			},
			:Bob => {
				:id => "0x2289ADC1",
				:key => "NAME Bob\nDHPUB 11837e00f1f33bdb86cbf15f6054fb3924c1a6b084970868b91f5fe1bd1f57be8fb51a38bdc2afae0b9ac69e534340ceb4472951c9ce0248fc0c84e3521286175e118582321b1f08ea98077a7164b93edc880f3b494c22d9cd3905daa9c145a2"
			}
		}
	end
	def setupkeys
		@somekeys.each_value{|key|
			@k.u[key[:id]] = key[:key]
		}
	end
	def test_gpgid
		assert_equal(@somekeys[:Alice][:id],Keyserver.gpgid(@somekeys[:Alice][:key]))
	end
	def test_searchId
		$cgi["name"] = "Alice"
		@k.webservice_searchId
		assert_equal(CGI::HTTP_STATUS[404],$header["status"])
		setupkeys
		assert_equal(@somekeys[:Alice][:id],@k.webservice_searchId)
	end
	def test_searchKey
		$cgi["name"] = "Alice"
		@k.webservice_searchKey
		assert_equal(CGI::HTTP_STATUS[404],$header["status"])
		setupkeys
		assert_equal(@somekeys[:Alice][:key],@k.webservice_searchKey)
	end
	def test_searchName
		$cgi["search"] = "Al"
		assert_equal("<ul></ul>",@k.webservice_searchName)
		setupkeys
		assert_equal("<ul><li>Alice</li></ul>",@k.webservice_searchName)
		$cgi["search"] = "fbgiae"
		assert_equal("<ul></ul>",@k.webservice_searchName)
	end

	def test_setKey
		$cgi["gpgKey"] = @somekeys[:Alice][:key]
		@k.webservice_setKey
		assert_equal(CGI::HTTP_STATUS[202],$header["status"])

		@k.webservice_setKey
		assert_equal(CGI::HTTP_STATUS[403],$header["status"])

		$cgi["gpgKey"] = "NAME Foo\n DH"
		@k.webservice_setKey
		assert_equal(CGI::HTTP_STATUS[400],$header["status"])
	end
	
	def test_getKey
		setupkeys
		
		$cgi = {"gpgID" => @somekeys[:Alice][:id]}
		assert_equal(@somekeys[:Alice][:key], @k.webservice_getKey)

		$cgi = {"gpgID" => @somekeys[:Alice][:id].downcase}
		assert_equal(@somekeys[:Alice][:key], @k.webservice_getKey)

		$cgi = {"gpgID" => "0xdeadbeef"}
		@k.webservice_getKey
		assert_equal(CGI::HTTP_STATUS[404], $header["status"])
	end
	def test_getName
		setupkeys
		$cgi["gpgID"] = @somekeys[:Alice][:id]
		assert_equal("Alice", @k.webservice_getName)

		$cgi["gpgID"] = @somekeys[:Alice][:id].downcase
		assert_equal("Alice", @k.webservice_getName)

		$cgi["gpgID"] = "0xdeadbeef"
		@k.webservice_getName
		assert_equal(CGI::HTTP_STATUS[404], $header["status"])
	end
	def test_listAll
		assert_equal("", @k.webservice_listAllIds)
		assert_equal("", @k.webservice_listAllNames)
		setupkeys
		assert_equal(@somekeys.values.collect{|k| k[:id]}.sort, @k.webservice_listAllIds.scan(/^.*$/).flatten.sort)
		assert_equal(@somekeys.keys.collect{|n| n.to_s}.sort, @k.webservice_listAllNames.scan(/^.*$/).sort)
	end
end

end
