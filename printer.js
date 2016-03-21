var phantom = require('phantom');
var URL = require('url');
var config = require('./config');

var Printer = function(queue){
	this.active_jobs = 0;
	this.queue = queue;
	setInterval(this.tick.bind(this), 1000);
};

Printer.prototype.tick = function(){
	var self = this;
	while( this.queue.length > 0 && this.active_jobs < config.max_print_jobs ){
		this.print(this.queue[0].url)
			.then(function(){
				self.active_jobs--;
				console.log("printed");
			});
		this.active_jobs++;
		this.queue.splice(0,1);
	}
};

Printer.prototype.print = function(url){
	var self = this;
	return phantom.create(['--ignore-ssl-errors=yes', '--web-security=false'])
		.then(function(ph){
			return ph.createPage().then(function(page){
				return page.open(url).then(function(status){
					return self.printPage(page, url);
				})
			})
		}).catch(function(err){
			console.trace(err);
		});
};

Printer.prototype.printPage = function(page, url){
	var self = this;
	return page.property('viewportSize', config.print_viewport_size).then(function(){
		return page.render(self.outputPath(url));
	});

}

Printer.prototype.outputPath = function(url){
	var obj = URL.parse(url);
	var host = obj && obj.host;
	return config.page_save_location + '/' + Date.now() + '_' + host + '.' + config.page_save_format;
}

module.exports = Printer;
