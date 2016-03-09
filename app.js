var request = require('request');
var cheerio = require('cheerio');
var bunyan = require('bunyan');
var fs = require('fs');
var events = require('events');
var eventEmitter = new events.EventEmitter();

var log = bunyan.createLogger({name: "labor-crawler"});

var config = require('./config');

var to_visit = [];
var visited = [];
to_visit.push(config.start_page)
var keywords = config.keywords;
var blacklist = config.blacklist;
var active_requests = 0;


function get(){
	log.info({running: "get"});
	while( to_visit.length > 0 && active_requests < config.max_requests ){
		parse(to_visit[0], function(){
			log.info({request: "done"});
			active_requests--;
			eventEmitter.emit('parseDone');
		});
		active_requests++;
		to_visit = to_visit.slice(1);
	}
	writeVisits();
}
eventEmitter.on('parseDone', get);
get();


function parse(url, done){
	log.info({loading: url});
	request(url, function(err, res, body){
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
}
