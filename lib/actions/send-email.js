const Enum = require('../constants/Enum');
const BaseAction = require('../base/base-action');

class SendEmail extends BaseAction {
    constructor(requestContext, config, dependencies) { 
        super(requestContext, dependencies);
        this.action = "SendEmail";
    }

    async _doAction(args) {
        console.log('Email sent to', args.email);
        return;
    }
}

module.exports = SendEmail;