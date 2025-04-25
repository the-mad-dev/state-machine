const BaseMessageProcessor = require('./base-message-processor');

class OrderUpdatesProcessor extends BaseMessageProcessor{
    constructor(requestContext, config, dependencies) {
        super(requestContext, config, dependencies);
        this.dependencies = dependencies;
    }

    processExtractedData(message) {
        console.log('OrderUpdatesProcessor - Processing the message', message);
    }
}

module.exports = OrderUpdatesProcessor;