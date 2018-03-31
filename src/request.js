import lzjs from "lzjs"
const E1 = window.E1

class RequestService {
    constructor() {
        this.abbrevKeys = [
            "c",
            "a",
            "act",
            "t",
            "p",
            "u",
            "g",
            "o",
            "s",
            "i",
            "g",
            "link"
        ]

        this.fullKeys = [
            "category_id",
            "user_id",
            "user_activity_id",
            "tabValue",
            "page",
            "uid",
            "game_id",
            "orderBy",
            "search_in_fields",
            "image_id",
            "id",
            "link"
        ]

        this.states = []

        window.addEventListener('popstate', (e) => {
            this.states.pop()
        });
    }

    mapKey(key, source, target) {
        var index = source.indexOf(key)
        return target[index]
    }

    mapKeys(keyedData, source, target) {
        var results = null
        var keys = Object.keys(keyedData)

        if (keys.length) {
            results = {}

            keys.forEach(key => {
                var _key = this.mapKey(key, source, target)

                if (_key) {
                    results[_key] = keyedData[key]
                }
            })
        }

        return results
    }

    getQuery() {
        var search = window.location.search
        var results = {}

        if (!search) {
            return results
        }

        search = search.substr(1).split("&")

        search.forEach((s) => {
            var key = s.split("=").shift()
            var val = s.split(key + "=")[1]

            if (val && val !== "undefined" && val !== "") {
                results[key] = val
            }
        })

        if (results.m) {
            try {
                var str = results.m

                str = decodeURIComponent(str)

                var _results = this.mapKeys(JSON.parse(lzjs.decompressFromBase64(str)), this.abbrevKeys, this.fullKeys)
                delete results.m
                results = Object.assign(_results ? _results : {}, results)

            } catch (e) { }
        }

        return this.clearEmptyQuery(results)
    }

    clearEmptyQuery(query) {
        if (!query) {
            return {}
        }

        for (var key in query) {
            if (!query[key] || query[key] === `` || query[key] === `undefined` || query[key] === `null`) {
                delete query[key]
            }
        }

        return query
    }

    setQuery(data, push) {
        var query = this.clearEmptyQuery(data)
        var queryString = this.getQueryString(query)
        var method = push ? `pushState` : `replaceState`

        window.history[method](query, window.document.title, window.location.origin + window.location.pathname + queryString)

        if (push) {
            this.states.push(query)
        } else {
            this.states[this.states.length - 1] = query
        }
    }

    getQueryParam(key) {
        return this.getQuery()[key]
    }

    setQueryParam(key, data, push) {
        var query = this.getQuery()
        query[key] = data
        query = this.clearEmptyQuery(query)

        this.setQuery(query, push)
    }

    getQueryString(data) {
        data = data ? data : this.getQuery()

        var extraParamsString = ``

        for (var p in data) {
            if (data[p]) {
                if (this.fullKeys.indexOf(p) === -1) {
                    extraParamsString += `&${p}=${data[p]}`
                    delete data[p]
                }
            }
        }

        var results = this.mapKeys(data, this.fullKeys, this.abbrevKeys)
        results = results ? results : {}

        return `?m=${encodeURIComponent(lzjs.compressToBase64(JSON.stringify(results)))}${extraParamsString}`
    }

    getUnencryptedQueryString(data) {
        var query = data || this.getQuery()
        var queryString = "?"

        for (var q in query) {
            if (query[q]) {
                queryString += q + "=" + query[q] + "&"
            }
        }

        queryString = queryString.split("")
        queryString.pop()
        return queryString.join("")
    }

    processPath(path) {
        if (window.location.host.indexOf(`localhost`) > -1) {
            path = window.encodeURIComponent(path)
        }

        return path
    }

    request(url, method, data) {
        return new window.Promise((resolve, reject) => {

            if (url.indexOf(`?`) === -1) {
                url = `${url}?CT=${new Date().getTime()}`
            } else {
                url = `${url}&CT=${new Date().getTime()}`
            }

            var req = new window.XMLHttpRequest()
            req.open(method ? method : "GET", url)
            req.withCredentials = false

            if (method === "DELETE" || method === "POST" || method === "PUT") {
                if (!data) {
                    data = {}
                }
            }

            if (data) {
                var uid = E1.getModel(null, `@UserModels.currentUser.id`)
                var sess = E1.getModel(null, `@UserModels.currentUser.session`)

                if (uid) {
                    data.userId = E1.getModel(null, `@UserModels.currentUser.id`)
                }

                if (uid) {
                    data.session = window.btoa(sess)
                }

                req.setRequestHeader("Content-type", "application/json")
            }

            // req.setRequestHeader("Cache-Control", "no-cache")
            // req.setRequestHeader("Pragma", "no-cache")
            // req.setRequestHeader("Expires", "Sat, 01 Jan 2000 00:00:00 GMT")

            req.onload = (res) => {
                try {
                    res = JSON.parse(res.target.responseText)
                } catch (error) {
                    res = res.target.responseText
                }
                resolve(res)
            }
            req.onerror = (err) => {
                reject(err)
            }
            req.send(data ? JSON.stringify(data) : undefined)
        })
    }
}

E1.registerService("RequestService", new RequestService())