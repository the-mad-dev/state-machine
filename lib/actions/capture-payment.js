const Enum = require('../constants/Enum');
const BaseAction = require('../base/base-action');

class CapturePayment extends BaseAction {
    constructor(requestContext, config, dependencies) { 
        super(requestContext, dependencies);
        this.action = "CapturePayment";
    }

    async _doAction(args) {
        console.log('Payment captured');
        return;
    }
}

module.exports = CapturePayment;