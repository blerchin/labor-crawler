var request = require('request');
var cheerio = require('cheerio');
var bunyan = require('bunyan');
var phantom = require('phantom');
var fs = require('fs');
var events = require('events');

var Printer = require('./printer');

var log = bunyan.createLogger({
	name: "labor-crawler",
	streams: [
		{
			level: 'info',
			path: './log/info.log'
		}
	]
});

var config = require('./config');

var to_visit = [];
var to_print = [];
var visited = [];
var relevant = [];
to_visit.push(config.start_page)
var keywords = config.keywords;
var blacklist = config.blacklist;
var active_requests = 0;

var printer = new Printer(to_print);

function get(){
	log.info({running: "get"});
	to_visit.sort(function(a,b){ 
		if(!a.words || !b.words ){
			return 0;
		}
		if(a.words.length > b.words.length){
			return 1;
		} else if (a.words.length < b.words.length){
			return -1;
		} else {
			return 0;
		}
	});
	while( to_visit.length > 0 && active_requests < config.max_requests ){
		parse(to_visit[0], function(){
			log.info({request: "done"});
			active_requests--;
		});
		active_requests++;
		to_visit.splice(0, 1);
	}
	writeVisits();
}
setInterval(get, 1000);
get();


function parse(url, done){
	log.info({loading: url});
	request({
		url:url,
		maxRedirects: 2
	}, function(err, res, body){
		log.info({data: "got some"});
		if(err){
			log.warn(err);
			recordVisit(url);
		} else {
			var $ = cheerio.load(body);
			var words = findKeywords($, body);
			var links = [];
			if( words.length > 0 ){
				links = findLinks($);
				links.each(function(){
					planVisit($(this));
				});
			}
			recordVisit(url, $, words, links);
		}
		log.info({request:"done"});
		done();
	});
};

function findLinks($){
	return $('a').filter(function(){
		var href = $(this).attr('href');
		return href;
	});
}

function findKeywords($, body){
	var found_words = [];
	keywords.forEach(function(k){
		log.info({lookingFor: k});
		if( body.match('/.*'+k+'.*/') ){
			found_words.push(k);
			log.info({found: k});
		}
	});
	return found_words;
}

function recordVisit(url, $, words, links){
	var record = {
		title:  $ && $('head>title').first().text(),
		url: url,
		words: words,
		links: links && links.map(function(){ return $(this).attr('href') })
	};
	//log.info({visited: record});
	visited.push(record);
	//is error if only one argument
	if(arguments.length > 2 && words.length > 0){
		relevant.push(record);
		to_print.push(record);
	}
}

function planVisit(el){
	var blocked = false;
	var href = el.attr('href');
	blacklist.forEach(function(t){
		if( href.match(t) ){
			blocked = true;
		}
	});
	visited.forEach(function(v){
		if (v.url === href){
			blocked = true;
		}
	});
	to_visit.forEach(function(v){
		if (v === href){
			blocked = true;
		}
	});
	if( !blocked ){
		to_visit.push(el.attr('href'));
	} else {
		log.info("blocked visit to '" + href + "'");
	}
}


function writeVisits(){
	fs.writeFile("visitLog.txt", visited.map(function(v){ return v.url + '\n'} ));
	fs.writeFile("toVisit.txt", to_visit);
	fs.writeFile("relevant.txt", relevant.map(function(r){ return r.url +':' + JSON.stringify(r.words) + '\n' }));
}
