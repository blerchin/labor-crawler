var config = require('../../config');
var Interface = require('../../interface');
var models = require('../../models');

describe("database tests:", function(){
	beforeEach(function(done){
		models.Page.remove({}, done);
		models.Link.remove({}, done);
	});

	describe("add and retrieve pages", function(){
		beforeEach(function(done){
			var self = this;
			this.i = new Interface();
			this.i.addPage({
				title: "title1",
				url: "http://url.url",
				words: ['bird','is','the','word'],
				wordsC: 4,
				links: ['http://google.com','http://yahoo.com']
			}).then(function(){
				return models.Page.find({}).then(function(pages){
					self.pages = pages;
				})
			}).then(function(){
				return self.i.getPageToPrint().then(function(page){
					self.pageToPrint = page;
					self.pageToPrint.printed = true;
					return self.pageToPrint.save();
				});
			}).then(function(){
				return self.i.getPageToPrint().then(function(page){
					self.emptyPageToPrint = page;
				})
			}).then(function(){
				done();
			});
		});
		it("added a Page", function(){
			expect(this.pages.length).toBe(1);
			var page = this.pages[0];
			expect(page.title).toBe('title1');
		});

		it("gets a Page to Print",function(){
			expect(this.pageToPrint).toBeTruthy();
			expect(this.pageToPrint.title).toBe('title1');
		});

		it("gets no Page to Print after printed set", function(){
			expect(this.emptyPageToPrint).toBe(null);
		});
	});


	describe("add and retrieve links", function(){
		beforeEach(function(done){
			var self = this;
			this.i = new Interface();
			this.i.addLink( "http://url.url").then(function(){
				return models.Link.find({}).then(function(links){
					self.links = links;
				})
			}).then(function(){
				return self.i.getLinkToVisit().then(function(link){
					self.linkToVisit = link;
					self.linkToVisit.visited = true;
					return self.linkToVisit.save();
				});
			}).then(function(){
				return self.i.getLinkToVisit().then(function(link){
					self.emptyLinkToVisit = link;
				})
			}).then(function(){
				return self.i.getAllLinkHrefs();
			}).then(function(hrefs){
				self.allLinkHrefs = hrefs;
				return Promise.resolve();
			}).then(function(){
				done();
			}).catch(function(err){
				console.log(err);
			});
		});
		it("added a Link", function(){
			expect(this.links.length).toBe(1);
			var link = this.links[0];
			expect(link.href).toBe('http://url.url');
		});

		it("gets a Link to Visit",function(){
			expect(this.linkToVisit).toBeTruthy();
			expect(this.linkToVisit.href).toBe('http://url.url');
		});

		it("gets no Link to Visit after visited set", function(){
			expect(this.emptyLinkToVisit).toBe(null);
		});
		it("gets all link hrefs as array", function(){
			expect(this.allLinkHrefs).toEqual(['http://url.url'])
		});
	});
});
