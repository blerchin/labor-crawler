var phantom = require('phantom-render-stream');
var Promise = require('bluebird');
var fs = require('fs');
var URL = require('url');
var config = require('./config');
var Interface = require('./interface');
var AWS = require('aws-sdk');

AWS.config.region = 'us-west-1';
var S3 = new AWS.S3();

var Screenshotter = function(){
	this.active_jobs = 0;
	this.inter = new Interface();
	this.render = phantom({
		pool: 5,
		format: config.page_save_format,
		paperFormat: 'A4',
		phantomFlags: ['--ignore-ssl-errors=true', '--web-security=false']
	});
};

Screenshotter.prototype.run = function(){
	setInterval(this.tick.bind(this), 1000);
};

Screenshotter.prototype.tick = function(){
	var self = this;
	while( this.active_jobs < config.max_screenshot_jobs ){
		this.inter.getPageToCapture()
			.then(function(page){
				if(!page){
					return Promise.resolve();
				}
				return self.screenshot(page.url)
					.then(function(key){
						console.log("captured " + page.url );
						page.captured = true;
						page.capturedPDFKey = key;
						return page.save();
					})
					.catch(function(err){
						page.captured = true;
						return page.save();
						console.log('error: ' + err);
						return Promise.resolve();
					});
			}).then(function(){
				self.active_jobs--;
			}).catch(function(err){
				console.log(err);
			});
		this.active_jobs++;
	}
};

Screenshotter.prototype.screenshot = function(url){
	var self = this;

	var renderStream = this.render(url);
	var params = {
		Bucket: config.bucket_name, 
		Key: this.outputPath(url),
		Body: renderStream
	};
	return new Promise(function(resolve, reject){
		S3.upload(params, function(err){
			if(err){
				reject(err);
			} else {
				resolve(params.Key);
			}
		})
	});
};

Screenshotter.prototype.outputPath = function(url){
	var obj = URL.parse(url);
	var host = obj && obj.host;
	return config.page_save_location + '/' + Date.now() + '_' + host + '.' + config.page_save_format;
}

module.exports = Screenshotter;
