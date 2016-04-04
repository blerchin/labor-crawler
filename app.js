var request = require('request');
var cheerio = require('cheerio');
var bunyan = require('bunyan');
var phantom = require('phantom');
var fs = require('fs');
var events = require('events');
var Promise = require('bluebird');

var Printer = require('./printer');
var Interface = require('./interface');

var log = bunyan.createLogger({
	name: "labor-crawler",
});
	/*
	streams: [
		{
			level: 'info',
			path: './log/info.log'
		}
	]
});
*/

var config = require('./config');

var models = require('./models');

var keywords = config.keywords;
var blacklist = config.blacklist;
var active_requests = 0;
var current_links = [];

//var printer = new Printer();
var inter = new Interface();



function visitNext(){
	log.info("visiting next");
	return inter.getLinkToVisit().then(function(link){
		if(link){
			return parse(link.href)
				.then(function(attr){
					return Promise.all([
					recordPage(attr),
					recordLinks(attr),
					updateCurrentLinks
					]);
				}).finally(function(){
					return recordLinkVisited(link);
				}).catch(function(err){
					console.trace(err);
				});
		} else {
			log.warn("no links in queue");
			return Promise.resolve();
		}
	});
};

function updateCurrentLinks(){
	return inter.getAllLinkHrefs().then(function(links){
		current_links = links;
	})
}

function recordLinkVisited(link){
	link.visited = true;
	return link.save();
}

function recordPage(attr){
	return inter.addPage(attr);
};

function recordLinks(attr){
	return Promise.map(attr.links, function(link){
		return planVisit(link);
	});
};

function parse(url){
	log.info({loading: url});
	return new Promise(function(resolve, reject){
		request({
			url:url,
			maxRedirects: 2
		}, function(err, res, body){
			log.info({data: "got some"});
			if(err){
				log.warn(err);
				reject({
					url: url
				});
			} else {
				var $ = cheerio.load(body);
				var words = findKeywords($, body);
				var links = [];
				if( words.length > 0 ){
					links = findLinks($);
				}
				resolve({
					url: url,
					title:  $ && $('head>title').first().text(),
					words: words,
					links: links
				});
			}
		});
	})
};

function findLinks($){
	var links = [];
	 $('a').each(function(){
		var href = $(this).attr('href');
		if(href){
			links.push( href );
		}
	});
	return links;
}

function findKeywords($, body){
	var found_words = [];
	keywords.forEach(function(k){
		log.info({lookingFor: k});
		if( body.match('/.*' + k + '.*/') ){
			found_words.push(k);
			log.info({found: k});
		}
	});
	return found_words;
}

function planVisit(href){
	var blocked = false;
	blacklist.forEach(function(t){
		if( href.match(t) ){
			blocked = true;
		}
	});
	current_links.forEach(function(v){
		if (v.url === href){
			blocked = true;
		}
	});

	if( !blocked ){
		return inter.addLink(href);
	} else {
		log.info("blocked visit to '" + href + "'");
		return Promise.resolve(null);
	}
}

function writeVisits(){
	fs.writeFile("visitLog.txt", visited.map(function(v){ return v.url + '\n'} ));
	fs.writeFile("toVisit.txt", to_visit);
	fs.writeFile("relevant.txt", relevant.map(function(r){ return r.url +':' + JSON.stringify(r.words) + '\n' }));
}

function get(){
	while( active_requests < config.max_requests ){
		log.info('starting visit');
		visitNext().then(function(){
			log.info({request: "done"});
			active_requests--;
		}).catch(function(err){
			console.trace(err);
		});
		active_requests++;
	}
	//writeVisits();
}

function start(){
	return inter.getLinkToVisit()
		.then(function(link){
			if (!link){
				return inter.addLink(config.start_page);
			} else {
				return Promise.resolve();
			}
		})
		.then(function(){
			get();
			setInterval(get, 1000);
		})
		.catch(function(err){
			console.trace(err);
		});
};

start();
