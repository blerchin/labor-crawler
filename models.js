var config = require('./config');
var mongoose = require('mongoose');
console.log(config.mongo_url);
mongoose.connect(config.mongo_url);

var Page = mongoose.model('Page', new mongoose.Schema({
	title: String,
	url: String,
	links: Array,
	words: Array,
	wordsC: Number,
	printed: {
		type:	Boolean,
		'default': false
	},
	capturedPDFKey: String,
	captured: {
		type:	Boolean,
		'default': false
	}
}, {
	timestamps: true
}));

var Link = mongoose.model('Link', new mongoose.Schema({
	href: String,
	visited: {
		type: Boolean,
		'default': false
	}
}, {
	timestamps: true
}));

module.exports = {
	Page: Page,
	Link: Link
}
