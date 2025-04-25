const BaseMessenger = require("../base/base-messenger");
const uuid = require('uuid');

class MessageConsumer extends BaseMessenger{
    /**
     * processor factory instance is accepted in the constructor, 
     * because message-consumer is a generic consumer model, 
     * any microservice can pass it's own processor factory instance to process service specfic messages using its own logic
     */
    constructor(config, dependencies, processorFactory) { 
        super(null, config, dependencies)
        this.processorFactory = processorFactory;
    }

    async drainMessages() {
        let exchanges = this.config.rmq.messaging.exchanges;
        for(let [id, exchange] of Object.entries(exchanges)) {
            await this.createChannelToExchange(exchange, id);
        }
    }

    processMessage(queue, exchangeName, channel) {
        const me = this;
        return ( async function(msg) {
            me.requestContext = {request_id: uuid.v4()};
            let messageProcessor = me.processorFactory.getProcessorInstance(queue, me.requestContext);
            if(messageProcessor) {
                messageProcessor.process(msg, me._ackMessage(msg, channel));
            } else {
                console.log('No processor found for queue', queue);
            }
        });
    }

    _ackMessage(msg, channel, info) {
        return (  function() {
            let ackAt = new Date();
            try {
                channel.ack(msg);
                console.log('_ackMessage acked at', {ackAt, msg: msg.content.toString()})
            } catch(err) {
                console.log("_ackMessage",err)
            }
        })
    }
}

module.exports = MessageConsumer;