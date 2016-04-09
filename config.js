module.exports = {
	"start_page": "http://google.com/search?q=labor",
	"max_requests": 5,
	"max_screenshot_jobs": 3,
	"max_print_jobs": 1,
	"screenshot_viewport_size": {
		"width": 1024,
		"height": 1200
	},
	"bucket_name": process.env.AWS_S3_BUCKET_NAME,
	"page_save_location": "pages",
	"page_save_format"	: "pdf",
	"temp_storage_dir": __dirname + "/tmp",
	"keywords":[
		"labor",
		"organized labor",
		"labor power",
		"emotional labor",
		"affective labor",
		"labor movement",
		"economy",
		"economic",
		"union"
	],
	"blacklist":[
		/.*facebook.com.*/,
		/^\/?#/,
		/^\//
	],
	"mongo_url": process.env.NODE_ENV === "test" ? process.env.TEST_MONGO_URL : process.env.MONGO_URL,
	"aws_access_key": process.env.AWS_ACCESS_KEY,
	"aws_secret_key": process.env.AWS_SECRET_KEY
}
