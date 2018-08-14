var fs = require('fs');
var https = require('https');
var Crawler = require('crawler')
var stack = [];
var init, run;

function downloadFile(url) {
    console.log(`Downloading: ${url}`);
    var path = url.split('/').pop();
    var [fn, ext] = path.split('.');
    var filename;
    if (ext === 'mp3') {
        let [, , series, lesson] = fn.split('_');
        filename = `${series}-${lesson}.${ext}`;
    }
    if (ext === 'pdf') {
        let [series, lesson] = fn.split('-');
        series = series.replace('eng', 'Lesson');
        filename = `${series}-${lesson}.${ext}`;        
    }
    let file = fs.createWriteStream(`./downloads/${filename}`);
    var req = https.get(url, (res) => {
        res.pipe(file);
    })
}

function runCrawl(params) {
    return {
        maxConnections: 5,
        callback: (err, res, done) => {
            if (err) console.log(err);
            else { 
                var $ = res.$;
                $("a").each(function(index) {
                    let link = $(this).attr('href');
                    if (link) {
                        let url, fullurl;

                        if (params && params.firstcall) {
                            let match_chap = link.match(/en\/chapter\-.*\/.*/g)
                            if (match_chap) {
                                [url] = match_chap;
                                fullurl = `${baseurl}/${url}`
                                stack.push(fullurl);
                            }
                        } else {
                            let match_pdf = link.match(/\/downloads\/.*/g);
                            let match_mp3 = link.match(/\/overlay\/media\/.*/g);
                            let match_download = link.match(/.*download\.mp3.*/g)
        
                            if (match_download) {
                                [url] = match_download;
                                fullurl = `${url}`;
                                downloadFile(fullurl)
                            }
                            if (match_pdf) {
                                [url] = match_pdf;
                                fullurl = `${baseurl}${url}`;
                                downloadFile(fullurl)
                            }
                            if (match_mp3) {
                                [url] = match_mp3;
                                fullurl = `${baseurl}${url}`
                                run.queue(fullurl);
                            }
                        }

                    }
                })
            }
            done();
        }
    }
}

const [, , baseurl, path] = process.argv;
if (baseurl && path) {
    init = new Crawler(runCrawl({firstcall: true}))
    init.queue(`${baseurl}${path}`);
    init.on('drain', () => {
        run = new Crawler(runCrawl());
        stack.map((url) => {
            run.queue(url);
        })
    });    
}
else {
    console.log(`error: required parameters are [baseurl] and [path]`);
}
