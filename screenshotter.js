var phantom = require('phantom');
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
};

Screenshotter.prototype.run = function(){
	setInterval(this.tick.bind(this), 1000);
};

Screenshotter.prototype.tick = function(){
	var self = this;
	if( this.active_jobs < config.max_screenshot_jobs ){
		console.log('starting a job');
		this.inter.getPageToCapture()
			.then(function(page){
				if(page){
					console.log('got page ', page.title);
					page.capturing = true;
					return page.save();
				} else {
					console.log("didn't get a page");
					return Promise.resolve();
				}
			})
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
						console.log('error: ' + err);
						//page.captured = true;
						return page.save();
					});
			}).then(function(){
				console.log('finished a job');
				self.active_jobs--;
			}).catch(function(err){
				console.log(err);
			});
		this.active_jobs++;
	}
};

Screenshotter.prototype.renderFile = function(url){
	var sitepage = null;
	var phInstance = null;
	var tmpFile = null;
	return phantom.create()
		.then(function(instance){
			phInstance = instance;
			return instance.createPage();
		}).then(function(page){
			sitepage = page;
			return sitepage.property('viewportSize', config.screenshot_viewport_size)
		}).then(function(){
			return sitepage.open(url);
		}).then(function(status){
			tmpFile = config.temp_storage_dir + "/" + Date.now() + ".pdf";
			return sitepage.render(tmpFile);
		}).then(function(){
			sitepage.close();
			phInstance.exit();
			return Promise.resolve(tmpFile);
		});
};

Screenshotter.prototype.render = function(url){
	console.log('rendering');
	return this.renderFile(url).then(function(tmpFile){
		console.log('rendered');
		return Promise.resolve(fs.createReadStream(tmpFile));
	})
};

Screenshotter.prototype.screenshot = function(url){
	var self = this;
	console.log('screenshotting ' + url)

	return this.render(url)
		.then(function(readStream){
			console.log('got stream');
			var params = {
				Bucket: config.bucket_name, 
				Key: self.outputPath(url),
				Body: readStream
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
		});
};

Screenshotter.prototype.outputPath = function(url){
	var obj = URL.parse(url);
	var host = obj && obj.host;
	return config.page_save_location + '/' + Date.now() + '_' + host + '.' + config.page_save_format;
}

module.exports = Screenshotter;
