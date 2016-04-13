var Interface = require('./interface');
var config = require('./config');
var AWS = require('aws-sdk')
var NodePrinter = require('node-printer');
var fs = require('fs');

var S3 = new AWS.S3();

var Printer = function(){
	this.active_jobs = 0;
	this.inter = new Interface();
	this.printers = NodePrinter.list();
	this.printer = new NodePrinter(this.printers[0]);
};

Printer.prototype.run = function(){
	setInterval(this.tick.bind(this), 1000);
};

Printer.prototype.tick = function(){
	var self = this;
	while( this.active_jobs < config.max_print_jobs ){
		this.inter.getPageToPrint()
			.then(function(page){
				page.printing = true;
				return page.save();
			})
			.then(function(page){
				if(!page){
					return Promise.resolve();
				}
				return self.print(page.capturedPDFKey)
					.then(function(){
						console.log("printed " + page.url );
						page.printed = true;
						return page.save();
					})
					.catch(function(err){
						page.printed = true;
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

Printer.prototype.print = function(key){
	var self = this;
	console.log('printing ' + key);
	if(!key){
		return Promise.reject("no key passed ot print");
	}
	return new Promise(function(resolve, reject){
		S3.getObject({
			Bucket: config.bucket_name,
			Key: key
		}, function(err, data){
			if(err){
				return reject(err);
			}
			var destPath = config.temp_storage_dir + "/" + Date.now() + ".pdf";
			fs.writeFile(destPath, data.Body, function(err){
				if( err) {
					console.log(err);
					return reject(err)
				} else {
					//console.log('printing ' + key);
					var job = self.printer.printFile(destPath);
					job.once('sent', function(){
						console.log('sent');
						return resolve('printed successfully');
					});
				}
			});
		});
	});
};

module.exports = Printer;
