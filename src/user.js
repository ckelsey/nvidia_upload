var E1 = window.E1
import lzjs from "lzjs"

class UserService {
    constructor() {
        this.user = {}
        this.isLoggedIn = false

        var query = E1.services.RequestService.getQuery()

        if(query.login){
            window.localStorage.setItem(`user`, lzjs.decompressFromBase64(query.login))
            E1.services.RequestService.setQueryParam(`login`, ``)
        }

        var user = window.localStorage.getItem(`user`)

        if(user){
            user = JSON.parse(user)

            if (new Date(user.userTokenExp).getTime() <= new Date().getTime()) {
                window.localStorage.removeItem(`user`)
                return
            }

            if (new Date(user.sessionExp).getTime() <= new Date().getTime()) {
                return this.getNewSessionToken(user.userToken)
                    .then(res => {
                        user.session = res.session
                        user.sessionExp = new Date(res.sessionExp).getTime()

                        window.localStorage.setItem(`user`, JSON.stringify(user))
                        this.user = user
                        E1.setModel(null, `@UserService.user`, user)  
                        this.isLoggedIn = true 
                        E1.setModel(null, `@UserService.isLoggedIn`, true)
                    })
                    .catch(res => {
                        window.localStorage.removeItem(`user`)
                    })
            }else{
                this.user = user
                E1.setModel(null, `@UserService.user`, user)
                this.isLoggedIn = true
                E1.setModel(null, `@UserService.isLoggedIn`, true)
            }
        }
    }

    login(){
        const returnUrl = `https://ansel.cklsylabs.com/users/jarvis/return`
        const loginUrl = `https://accounts.nvgs.nvidia.com/api/1/oauth/authorize?response_type=code&scope=user_token&client_id=163900107807260888&redirect_uri=${returnUrl}&state=${encodeURIComponent(window.location.href)}`

        window.location.href = loginUrl
    }

    getNewSessionToken(userToken) {
        return new Promise((resolve, reject) => {
            const clientUrl = "https://accounts.nvgs.nvidia.com/api/1/authentication/client/login"

            var x = new window.XMLHttpRequest()
            x.open(`POST`, clientUrl, false)
            x.setRequestHeader(`Accept`, `application/json`)
            x.setRequestHeader(`Content-Type`, `application/json`)
            x.setRequestHeader(`Authorization`, "Basic " + window.btoa(userToken + ":"))

            x.onload = () => {
                var res = JSON.parse(x.responseText)

                if (res.error) {
                    return reject(res)
                }

                resolve({
                    session: res.sessionToken,
                    sessionExp: new Date(res.expiration).getTime()
                })
            }
            x.send(JSON.stringify({
                clientId: "163900107807260888",
                deviceId: "MDAwNTlhM2M3YTAwNDA2ZjE0OTY1NmU2OTZjNjU3NDZl"
            }))
        })
    }


}

E1.registerService("UserService", new UserService())