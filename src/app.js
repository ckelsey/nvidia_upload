var E1 = window.E1
var self

class App {
    constructor() {
        this.imagesUrl = `https://api.cklsylabs.com/swg/images/`
        this.images = {}
        this.showImages()
    }

    showImage(res) {

        if (typeof res === `string`) {
            res = self.images[res]
        }

        var type = `Screenshot`

        if (res.is360) {
            type = `360Mono`

            if (res.is3D) {
                type = `360Stereo`
            }
        } else if (res.is3D) {
            type = `Stereo`
        }

        E1.setModel(null, "@MessageService.modal", {
            active: true,
            clss: `imageModal`,
            content: `
                <div id="image-modal">
                    <div><e1-image-viewer type="${type}" url="${res.largeImage}" preview="${res.smallImage}"></e1-image-viewer></div>
                    <div><h3>${res.title}</h3></div>
                </div>
            `
        })
    }

    showImages() {
        var x = new XMLHttpRequest()
        x.open("GET", this.imagesUrl, false)
        x.onload = (res) => {
            var res = JSON.parse(x.responseText)

            if (res && res.Items) {
                var container = window.document.getElementById(`images`)

                res.Items.forEach(element => {
                    var html = `<div class="image" onclick="E1.services.App.showImage('${element.id}')"><img src="${element.thumbnailImage}"></div>`
                    container.appendChild(E1.cleanHtml(html))
                    this.images[element.id] = element
                });
            }
        }
        x.send()
    }
}

self = new App()

E1.registerService("App", self)