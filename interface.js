var models = require('./models')
var _ = require('lodash');
var Interface = function(){
};

Interface.prototype.getPageToPrint = function(){
	return models.Page.findOne({
		printed: false,
		printing: {
			$ne: true
		},
		capturedPDFKey: {
			$exists: true
		},
		wordsC: {
			$gt: 0
		}
	}).sort({
		wordsC: -1
	});
};

Interface.prototype.getPageToCapture = function(){
	return models.Page.findOne({
		captured: false,
		capturing: false,
		wordsC: {
			$gt: 0
		}
	}).sort({
		wordsC: -1
	});
};

Interface.prototype.addPage = function(attr){
	return models.Page.create({
		title: attr.title,
		url: attr.url,
		words: attr.words,
		wordsC: attr.words ? attr.words.length : 0,
		links: attr.links
	});
};

Interface.prototype.getLinkToVisit = function(){
	return models.Link.findOne({
		visited: false
	}).sort({
		wordsC: -1
	});
};

Interface.prototype.getAllLinkHrefs = function(){
	return models.Link.find({}).then(function(links){
		return Promise.resolve( _.map(links, function(l){
			return l.href;
		}));
	});
};

Interface.prototype.addLink = function(attr){
	return models.Link.create(attr);
};

module.exports = Interface;
