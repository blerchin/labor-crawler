require 'yaml'
require 'net/http'
require 'rubygems'
require 'nokogiri'
require 'debugger'
require 'rest-client'


Site = Struct.new( :url, :keyword_count )
class Crawler
	MIN_FOUND_WORDS = 3
	MIN_UNVISITED_SITES = 10
	def initialize(start_url)
		@keywords = YAML.load_file('keywords.yml')
		@blacklist = YAML.load_file('blacklist.yml')
		@notable = []
		@visited = []
		@unvisited = []
		@unvisited << Site.new(start_url, 0)

		@notable_log = File.open("notable.txt", "w")
		@visit_log = File.open("visits.txt", "w")
		@to_visit_log = File.open("to_visit.txt", "w")
	end
	
	def crawl
		while @unvisited.length > 0
			next_page
		end
	end

	def parse
		links = @current_html.css('a')
		@visited << @current_url
		@visit_log << "#{@current_url}\n"
		found_words = 0

		@keywords.each do |k|
			if @current_page.match("/#{k}/")
				found_words += 1
			end
		end

		add_links(links, found_words)
		
	end

	def is_blacklisted?(href)
		res = false
		@blacklist.each do |u|
			res = true if u.include? href
		end
		return res;
	end

	def add_links(links, found_words)
		if found_words >= MIN_FOUND_WORDS || 
			@unvisited.length < MIN_UNVISITED_SITES

			@notable << Site.new(@current_url, found_words)
			p "FOUND WORDS ON: #{@current_url}"
			@notable_log << "#{@current_url}\n"
			@notable_log.flush
			links.each do |l|
				if l['href'].match(/^http.*/) && !@visited.include?(l['href']) &&
					l['rel'] != "nofollow" &&
					!is_blacklisted?(l['href'])

					@unvisited << Site.new(l['href'], found_words)
					@to_visit_log << "#{l['href']}\n"
				end
			end
		end
	end

	def next_page
		@current_url = @unvisited.first[:url]
		begin
			req = RestClient.get( @current_url )
			@current_page = req.to_s
			@current_html = Nokogiri::HTML( @current_page )
			#p "<<< #{@current_html.css('title').text} >>>"
			#p "<<< #{@current_url} >>>"
			parse
		rescue Interrupt => e
			raise
		rescue Exception => e
			p "ERROR FETCHING #{@current_url}, #{e.inspect}"
		end
		@unvisited.delete_at(0)
	end

end

c = Crawler.new("http://nytimes.com")
c.crawl
