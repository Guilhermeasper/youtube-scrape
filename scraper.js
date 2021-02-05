const request = require('request');

async function youtube(query) {
    return new Promise((resolve) => {
        let json = { results: [], version: require('./package.json').version };

        const shortVideoFilter = "&sp=EgQQARgB";
        const limit = 15;
        let url = `https://www.youtube.com/results?q=${encodeURIComponent(query)}`;

        url += shortVideoFilter;

        // Access YouTube search
        request(url, (error, response, html) => {
            // Check for errors
            if (!error && response.statusCode === 200) {

                // Get script json data from html to parse
                let data, sectionLists = [];
                try {
                    let match = html.match(/ytInitialData[^{]*(.*"adSafetyReason":[^;]*});/s);
                    if (match && match.length > 1) { }
                    else {
                        match = html.match(/ytInitialData"[^{]*(.*);\s*window\["ytInitialPlayerResponse"\]/s);
                    }
                    data = JSON.parse(match[1]);
                    sectionLists = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
                }
                catch(ex) {
                    console.error("Failed to parse data:", ex);
                    console.log(data);
                }

                // Loop through all objects and parse data according to type
                parseJsonFormat(sectionLists, json, limit);
    
                return resolve(json);
            }
            resolve({ error: error });
        });
        
    });
};

/**
 * Parse youtube search results from json sectionList array and add to json result object
 * @param {Array} contents - The array of sectionLists
 * @param {Object} json - The object being returned to caller
 * @param {Number} limit - The limits of results to be returned
 */
function parseJsonFormat(contents, json, limit) {
    contents.forEach(sectionList => {
        try {
            if (sectionList.hasOwnProperty("itemSectionRenderer")) {
                for (let index = 0; index < limit && index < sectionList.itemSectionRenderer.contents.length; index++) {
                    try {
                        json.results.push(parseVideoRenderer(sectionList.itemSectionRenderer.contents[index].videoRenderer));
                    }
                    catch(ex) {
                        console.error("Failed to parse renderer:", ex);
                        console.log(contents);
                    }
                }
            }
        }
        catch (ex) {
            console.error("Failed to read contents for section list:", ex);
            console.log(sectionList);
        }
    });
}

/**
 * Parse a videoRenderer object from youtube search results
 * @param {object} renderer - The video renderer
 * @returns object with data to return for this video
 */
function parseVideoRenderer(renderer) {
    let video = {
        "type": "video",
        "id": renderer.videoId,
        "title": renderer.title.runs.reduce(comb, ""),
        "url": `https://www.youtube.com${renderer.navigationEndpoint.commandMetadata.webCommandMetadata.url}`,
        "duration": renderer.lengthText ? renderer.lengthText.simpleText : "Live",
        "upload_date": renderer.publishedTimeText ? renderer.publishedTimeText.simpleText : "Live",
        "thumbnail_src": renderer.thumbnail.thumbnails[renderer.thumbnail.thumbnails.length - 1].url
    };

    let uploader = {
        "username": renderer.ownerText.runs[0].text,
        "url": `https://www.youtube.com${renderer.ownerText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`
    };
    uploader.verified = renderer.ownerBadges &&
        renderer.ownerBadges.some(badge => badge.metadataBadgeRenderer.style.indexOf("VERIFIED") > -1) || 
        false;

    return { content: video, uploader: uploader };
}

/**
 * Combine array containing objects in format { text: "string" } to a single string
 * For use with reduce function
 * @param {string} a - Previous value
 * @param {object} b - Current object
 * @returns Previous value concatenated with new object text
 */
function comb(a, b) {
    return a + b.text;
}

module.exports.youtube = youtube;