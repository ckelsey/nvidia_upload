var E1 = window.E1

class ValidatorService {
    constructor() {

    }

    isAnsel(meta) {
        console.log("meta", meta)

        for (var m in meta) {
            if (meta[m] && typeof meta[m] !== `string` && typeof meta[m] !== `number`) {
                meta[m] = String.fromCharCode.apply(null, new Uint16Array(meta[m]))
            }

            if (meta[m] && typeof meta[m] === `string`) {
                meta[m] = decodeURIComponent(meta[m].replace(/\\u[\dA-F]{4}/gi,
                    function (match) {
                        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
                    }))
            }
        }

        var isValid = (E1.getThis(meta, "Model", "").toLowerCase().indexOf("nvidia") > -1 ||
            E1.getThis(meta, "Model", "").toLowerCase().indexOf("ansel") > -1 ||
            E1.getThis(meta, "Model", "").toLowerCase().indexOf("nvcamera") > -1 ||
            E1.getThis(meta, "Software", "").toLowerCase().indexOf("nvidia") > -1 ||
            E1.getThis(meta, "Software", "").toLowerCase().indexOf("ansel") > -1 ||
            E1.getThis(meta, "Software", "").toLowerCase().indexOf("nvcamera") > -1 ||
            E1.getThis(meta, "Make", "").toLowerCase().indexOf("nvidia") > -1 ||
            E1.getThis(meta, "Make", "").toLowerCase().indexOf("ansel") > -1 ||
            E1.getThis(meta, "Make", "").toLowerCase().indexOf("nvcamera") > -1
        )

        return isValid
    }

    upload(file) {
        return new window.Promise((resolve, reject) => {
            var binary = ""
            var reader

            try {
                reader = new window.FileReader()
            } catch (error) {
                reader = window.FileReader
            }

            reader.onload = () => {
                if (file.type === "image/jpeg") {
                    window.EXIF.getData(reader.result, (meta) => {
                        if (!this.isAnsel(meta)) {
                            reject(`<span>${E1.services.TranslateService.translate(`Error reading file. Only Ansel generated images are supported`)}</span>`)
                        }

                        var orientations = [6, 8]

                        if (meta.Orientation && orientations.indexOf(meta.Orientation) > -1) {
                            var ctx = window.document.createElement(`canvas`).getContext(`2d`)
                            var img = new Image
                            var arrayBufferView = new Uint8Array(reader.result)
                            var blob = new Blob([arrayBufferView], { type: "image/jpeg" })
                            var imageUrl = window.URL.createObjectURL(blob)

                            img.onload = function () {
                                ctx.canvas.width = img.height
                                ctx.canvas.height = img.width

                                if (meta.Orientation === 6) {
                                    ctx.transform(0, 1, -1, 0, img.height, 0)
                                }

                                if (meta.Orientation === 8) {
                                    ctx.transform(0, -1, 1, 0, 0, img.width)
                                }

                                ctx.drawImage(img, 0, 0)

                                window.URL.revokeObjectURL(imageUrl)

                                resolve({ data: ctx.canvas.toDataURL(), meta: meta })
                            }

                            img.src = imageUrl

                        } else {
                            resolve({ data: reader.result, meta: meta })
                        }
                    })
                } else {

                    var bytes = new window.Uint8Array(reader.result)
                    var length = bytes.byteLength

                    for (var i = 0; i < length; i++) { binary += window.String.fromCharCode(bytes[i]) }

                    var meta = window.png.splitChunk(binary)
                    var results = {}

                    if (!meta) {
                        return reject(`<span>${E1.services.TranslateService.translate(`Error reading file. Only Ansel generated images are supported`)}</span>`)
                    }

                    meta.forEach((m) => {
                        if (m.type === "tEXt") {
                            if (m.data.indexOf("Model") > -1) {
                                results.Model = m.data.split("Model")[1]
                            }

                            if (m.data.indexOf("Software") > -1) {
                                results.Software = m.data.split("Software")[1]
                            }

                            if (m.data.indexOf("Source") > -1) {
                                results.Source = m.data.split("Source")[1]
                            }

                            if (m.data.indexOf("MakerNote") > -1) {
                                results.MakerNote = m.data.split("MakerNote")[1]
                            } else if (m.data.indexOf("Make") > -1) {
                                results.Make = m.data.split("Make")[1]
                            }

                            if (m.data.indexOf("Description") > -1) {
                                results.Description = m.data.split("Description")[1]
                            }
                        }
                    })

                    if (!this.isAnsel(results)) {
                        reject(`<span>${E1.services.TranslateService.translate(`Error reading file. Only Ansel generated images are supported`)}</span>`)
                    }

                    resolve({ data: reader.result, meta: results })
                }
            }

            if (file.type === "image/jpeg" || file.type === "image/png") {
                reader.readAsArrayBuffer(file)
            } else {

                return reject(`<span>${E1.services.TranslateService.translate(`Only JPEG and PNG files can be uploaded.`)}</span>`)
            }
        })
    }
}

E1.registerService("ValidatorService", new ValidatorService())