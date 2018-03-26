window.uploadWorker = `
(function(c){var e=function(){this.boundary="----WebKitFormBoundary"+Math.random().toString(36).slice(2);this.type="multipart/form-data; boundary="+this.boundary;this.crlf="\\r\\n";this.pairs=[]};e.prototype.append=function(b,a){var c=Object.prototype.toString.call(a),f=function(a){return a.replace(/\\r/g,"%0D").replace(/\\n/g,"%0A").replace(/"/g,"%22")},d={disposition:\'form-data; name="\'+f(b||"")+\'"\'};b&&("[object File]"===c||"[object Blob]"===c?(d.disposition+=\'; filename="\'+f(a.name||"blob")+\'"\',d.type=a.type||"application/octet-stream",d.value=a):d.value=String(a),this.pairs.push(d))};e.prototype.getBlob=function(){var b=[],a,e=this.pairs.length;for(a=0;a<e;a++)b.push("--"+this.boundary+this.crlf+"Content-Disposition: "+this.pairs[a].disposition),this.pairs[a].type&&b.push(this.crlf+"Content-Type: "+this.pairs[a].type),b.push(this.crlf+this.crlf),b.push(this.pairs[a].value),b.push(this.crlf);b.push("--"+this.boundary+"--"+this.crlf);return c.Blob?new Blob(b):(new c.FileReaderSync).readAsArrayBuffer(function(a){var b=new (c.BlobBuilder||c.WebKitBlobBuilder||c.MSBlobBuilder);(a||[]).forEach(function(a){b.append(a)});return b.getBlob()}(b))};c.FormDataBuilder=e})(this);
self.onmessage = function (e) {
    var data = e.data;
    var x = new XMLHttpRequest(); 
    x.open("PUT", data.url, false);
    x.setRequestHeader("Content-Type", data.mime);

    x.onload = function (res) {
        self.postMessage(res.target.response);
    }; 

    x.onerror = function (res) {
        self.postMessage("fail");
    };
    
    x.send(data.chunk);
}`;

class Uploader {
    constructor(file, title, userId, session, cropOptions, progressCB) {
        this.stitchUrl = `https://api.cklsylabs.com/swg/images/upload`
        this.signUrl = `https://api.cklsylabs.com/swg/images/sign`
        this.file = file
        this.title = title
        this.userId = userId
        this.session = session
        this.cropOptions = cropOptions
        this.progressCB = progressCB
        this.bytesPerChunk = 647212
        this.stop = false
    }

    run() {
        return this.getSignedUrls()
            .then(() => {
                return this.uploadChunk(this.chunkIndex)
            }, err => {
                return Promise.reject(err)
            })
    }

    setProgress(index) {
        var progress = !index ? 0 : Math.ceil((index / this.total) * 100)

        if (progress > 100) {
            progress = 100
        }

        if (typeof this.progressCB === `function`) {
            this.progressCB(progress)
        }
    }

    onSuccess(e) {
        this.chunkIndex = this.chunkIndex + 1

        this.setProgress(this.chunkIndex)

        if (this.chunkIndex < this.total) {

            if (this.urls.expires <= new Date().getTime()) {
                return this.run()
            } else {
                return this.uploadChunk(this.chunkIndex)
            }

        } else {
            return this.stitch()
        }
    }

    uploadChunk(index) {
        return new Promise((resolve, reject) => {
            if (this.stop){
                resolve()
            }

            if (!this.urls[index]) {
                return reject(`No url`)
            }

            var data = {
                url: this.urls[index],
                chunk: this.file.slice(index * this.bytesPerChunk, (index + 1) * this.bytesPerChunk),
                mime: this.mime
            }

            var workerBlob = new window.Blob([window.uploadWorker], { type: "text/javascript" })
            var worker = new window.Worker(window.URL.createObjectURL(workerBlob))
            worker.onmessage = (e) => {
                return this.onSuccess(e)
                    .then(res => resolve(res))
                    .catch(res => reject(res))
            }
            worker.postMessage(data)
        })
    }

    getSignedUrls() {
        return new Promise((resolve, reject) => {
            let data = {
                total: this.total,
                id: this.uploadId,
                user: this.userId,
                session: this.session,
                mime: this.mime
            }
            var x = new XMLHttpRequest()
            x.open("POST", this.signUrl, false)
            x.setRequestHeader(`Content-Type`, `application/json`)
            x.onload = () => {
                try {
                    this.urls = JSON.parse(x.responseText)

                    if (this.urls.hasOwnProperty(`errorMessage`)) {
                        reject(this.urls.errorMessage)
                    } else {
                        resolve(this.urls)
                    }

                } catch (error) {
                    return reject(error)
                }
            }

            x.onerror = () => {
                return reject(x.error)
            }

            x.send(JSON.stringify(data))
        })
    }

    stitch() {
        return new Promise((resolve, reject) => {
            if (this.stop) {
                resolve()
            }

            var params = {
                directory: this.urls.directory,
                ext: this.ext,
                user: this.userId,
                session: this.session,
                title: this.title
            }

            if (this.cropOptions) {
                for (var c in this.cropOptions) {
                    if (this.cropOptions[c]) {
                        params[c] = this.cropOptions[c]
                    }
                }
            }

            var x = new XMLHttpRequest()
            x.open("POST", this.stitchUrl, false)
            x.setRequestHeader(`Content-Type`, `application/json`)
            x.onload = () => {
                var data = JSON.parse(x.responseText)

                return resolve(data)
            }

            x.onerror = () => {
                return reject(x.error)
            }

            x.send(JSON.stringify(params))
        })
    }

    cancel(){
        this.stop = true
    }

    upload() {
        return new Promise((resolve, reject) => {
            if (!this.file || !this.userId || !this.session) {
                return reject(`invalid data`)
            }

            this.size = this.file.size
            this.total = Math.ceil(this.size / this.bytesPerChunk)
            this.chunkIndex = 0
            this.uploadId = `${new Date().getTime()}${Math.round(Math.random() * 1000)}`
            this.mime = this.file.type
            this.ext = this.mime === `image/jpeg` ? `jpg` : `png`
            this.urls = null

            this.setProgress(this.chunkIndex)

            return this.run()
                .then(res => {
                    return resolve(res)
                })
                .catch(res => {
                    return reject(res)
                })
        })
    }
}

module.exports = Uploader