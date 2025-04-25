const OrderUpdatesProcessor = require('./order-updates-processor');
const MailUpdatesProcessor = require('./mail-updates-processor');
const Enum = require('../../constants/Enum');

class ProcessorFactory {
    constructor(config, dependencies) {
        this.dependencies = dependencies;
        this.config = config;
    }

    getProcessorInstance(queue, requestContext) {
        switch(queue) {
            case Enum.Queue.ORDER_UPDATES_LISTENER:
                return new OrderUpdatesProcessor(requestContext, this.config, this.dependencies);
            case Enum.Queue.MAIL_UPDATES_LISTENER:
                return new MailUpdatesProcessor(requestContext, this.config, this.dependencies);
            default:
                console.log('No matching processor found');
                return null;
        }
    }
}

module.exports = ProcessorFactory;