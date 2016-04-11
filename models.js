var config = require('./config');
var mongoose = require('mongoose');
console.log(config.mongo_url);
mongoose.connect(config.mongo_url);

var Page = mongoose.model('Page', new mongoose.Schema({
	title: String,
	url: {
		type: String,
		unique: true
	},
	links: Array,
	words: Array,
	wordsC: {
		type: Number,
		index: true
	},
	printed: {
		type:	Boolean,
		'default': false
	},
	capturedPDFKey: String,
	capturing: {
		type: Boolean,
		'default': false
	},
	captured: {
		type:	Boolean,
		'default': false
	}
}, {
	timestamps: true
}));

var Link = mongoose.model('Link', new mongoose.Schema({
	href: {
		type: String,
		unique: true
	},
	wordsC: String,
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
