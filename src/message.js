var E1 = window.E1

class MessageService {
    constructor() {
        this.message = {}
        this.modal = {}
    }
}

E1.registerService("MessageService", new MessageService())