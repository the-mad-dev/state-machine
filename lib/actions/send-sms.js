const Enum = require('../constants/Enum');
const BaseAction = require('../base/base-action');

class SendSMS extends BaseAction {
    constructor(requestContext, config, dependencies) { 
        super(requestContext, dependencies);
        this.action = "SendSMS";
    }

    async _doAction(args) {
        console.log('SMS sent to', args.phone);
        return;
    }
}

module.exports = SendSMS;