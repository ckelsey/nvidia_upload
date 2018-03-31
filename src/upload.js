var E1 = window.E1
var self

import Uploader from "./uploader"

class UploadService {
    constructor() {
        this.file = null
        this.title = ``
        this.content = `
        <div class="upload-content">
            <div style="width:50px;"><e1-icon type="upload"><e1-icon></div>
            <div><span>Drag and drop your image here</span>,<br><span>or</span></div>
            <div><button class="btn">Browse</button></div>
        </div>`
        this.uploadPane = `
            <div style="display:none;" id="showUploadProgress">
                <div id="uploading-progress">
                    <div id="count"></div>
                    <div class="progress" id="progressBar"></div>
                    <button id="cancelProgress" class="btn" onclick="E1.services.UploadService.cancel()">Cancel</button>
                </div>
            </div>
            <div id="upload-pane">
                <div class="upload-pane-inner">
                    <div class="upload-viewer">
                        <div class="img-container-outer">
                            <div id="imgContainer">
                                <e1-image-viewer id="uploadViewer" image-ready="@UploadService.uploadImgReady()" url="@UploadService.image.image" type="@UploadService.image.renderer" crop="true"></e1-image-viewer>
                            </div>
                        </div>
                    </div>
                    <div style="display:none;" e1-show="@UploadService.imageReady">
                        <div class="inputs">
                            <div id="upload-title">
                                <label for="shot-title" class="required" style="display: block;">Title</label>
                                <input id="shot-title" e1-value="@UploadService.title" type="text" onkeyup="E1.services.UploadService.uploadKeyPress(event)" />
                            </div>
                            <div class="buttons">
                                <button onclick="E1.services.UploadService.upload()" class="btn upload-result" style="margin: 0px 3px;">UPLOAD</button>
                                <button class="btn secondary-btn upload-cancel" onclick="window.location.reload()">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `

        this.type = null
        this.showUploadProgress = false
        this.progress = `0%`
        this.imageReady = false
        this.uploadUrl = ``
        this.image = {
            image: null,
            renderer: null
        }
    }

    cancel() {
        self.uploader.cancel()
        window.document.getElementById(`showUploadProgress`).style.display = `none`
        E1.setModel(null, "@UploadService.showUploadProgress", false)
        E1.setModel(null, "@UploadService.progress", `0%`)
        E1.setModel(null, "@UploadService.title", ``)
    }

    uploadImgReady() {
        E1.setModel(null, `@UploadService.imageReady`, true)
    }

    uploadKeyPress(e) {
        if (e.key && e.key.toLowerCase() === 'enter') {
            self.upload()
        }
    }

    getViewerRender() {
        var renderer = window.document.getElementById("uploadViewer")

        return renderer ? renderer.renderer : {}
    }

    upload() {

        if (!E1.getModel(null, `@UploadService.title`) || E1.getModel(null, `@UploadService.title`).trim() === ``){
            self.cancel()

            return E1.setModel(null, "@MessageService.message", {
                active: true,
                icon: "!",
                type: "error",
                message: E1.services.TranslateService.translate(`Title is required`, `capitalize`),
                buttons: [{
                    text: E1.services.TranslateService.translate(`Ok`, `capitalize`),
                    click: "E1.setModel(null, '@MessageService.message.active', false)"
                }]
            })
        }

        var renderer = this.getViewerRender()

        var cropOptions = {
            viewWidth: renderer.stats.viewWidth,
            viewHeight: renderer.stats.viewHeight,
            tilt: renderer.stats.type === `flat` ? 0 : renderer.stats.y,
            pan: renderer.stats.type === `flat` ? 0 : renderer.stats.x,
            zoom: renderer.stats.type === `flat` ? 1 : renderer.stats.z,
            x: renderer.renderer.data.cropper.positions.x,
            y: renderer.renderer.data.cropper.positions.y,
            width: renderer.renderer.data.cropper.positions.w,
            height: renderer.renderer.data.cropper.positions.h,
            pixelRatio: window.devicePixelRatio,
            type: renderer.renderer.is3D ? `3d` : false
        }

        var title = window.encodeURIComponent(E1.getModel(null, `@UploadService.title`).replace(/<script|&lt;script/ig, "").trim())

        this.uploader = new Uploader(self.file, title, E1.services.UserService.user.id, E1.services.UserService.user.session, cropOptions, (progress) => {
            window.document.getElementById(`count`).textContent = `${progress}%`
            window.document.getElementById(`progressBar`).style.width = `${progress}%`
        })

        this.uploader.upload()
            .then(res => {
                console.log("DONE", res)
                window.document.getElementById(`showUploadProgress`).style.display = `none`

                if (res){

                    E1.services.App.showImage(res)
                }
            })
            .catch(rej => {
                console.log("ERROR", rej)
                window.document.getElementById(`showUploadProgress`).style.display = `none`

                E1.setModel(null, "@MessageService.message", {
                    active: true,
                    icon: "!",
                    type: "error",
                    message: rej,
                    buttons: [{
                        text: `<span>${E1.services.TranslateService.translate(`Ok`, `capitalize`)}</span>`,
                        click: "E1.setModel(null, '@MessageService.message.active', false)"
                    }]
                })
            })

        window.document.getElementById(`showUploadProgress`).style.display = `block`
    }

    openUploadPane(res) {
        var url = res.data

        if(typeof url !== `string`){
            var domURL = window.URL || window.webkitURL
            url = domURL.createObjectURL(new window.Blob([res.data], { type: self.type }))
        }
        
        var data = {
            image: url,
            crop: true,
            renderer: "",
            ready: false
        };

        var type = E1.getThis(res.meta, "MakerNote")

        try {
            type = String.fromCharCode.apply(null, type)
        } catch (err) { }

        if (type && type.split("360").length > 1) {
            data.renderer = "360"
        }

        if (type && (type.split("Stereo").length > 1 || E1.getThis(res.meta, "ImageDescription") === "Stereo")) {
            data.renderer += "stereo"
        }

        E1.setModel(null, "@UploadService.image", data)

        E1.setModel(null, "@MessageService.modal", {
            active: true,
            content: this.uploadPane
        })
    }

    addFile(file) {
        if (!file) {
            return
        }

        self.file = file
        self.type = file.type

        return E1.services.ValidatorService.upload(file)
            .then(res => {
                if (res) {
                    return self.openUploadPane(res)
                }
            })
            .catch(rej => {
                E1.setModel(null, `@UploadService.file`, null)

                E1.setModel(null, "@MessageService.modal", {
                    active: false,
                    content: ``
                })

                E1.setModel(null, "@MessageService.message", {
                    active: true,
                    icon: "!",
                    type: "error",
                    message: rej,
                    buttons: [{
                        text: `<span>${E1.services.TranslateService.translate(`Ok`, `capitalize`)}</span>`,
                        click: "E1.setModel(null, '@MessageService.message.active', false)"
                    }]
                })
            })
    }
}

self = new UploadService()

E1.registerService("UploadService", self)