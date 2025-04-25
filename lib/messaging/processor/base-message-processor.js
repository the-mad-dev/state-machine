const PGAccessBase = require('../../base/pg-access-base');
const MessageHistoryDBAccesor = require('../../db/message-history-db-accessor');
const StateMachineManager = require('../../state-machine/state-machine-manager');

class BaseMessageProcessor extends PGAccessBase {
    constructor(requestContext, config, dependencies) {
        super(requestContext, dependencies);
        this.dependencies  = dependencies;
        this.messageHistoryDBAccesor = new MessageHistoryDBAccesor(requestContext, config, dependencies);
        this.stateMachineManager = new StateMachineManager(requestContext, config, dependencies);
    }

    async process(message, ack) {
        try {
            message = JSON.parse(message.content.toString());
            await this.transaction(async (t) => {
                message = await this.messageHistoryDBAccesor.dbGetMessageById(t, message.id);
                this.processExtractedData(message.data);
                message.data.status = 'Completed';
                await this.messageHistoryDBAccesor.dbUpdateMessageById(t, message.id, message.data);
            });
        } catch(err) {
            console.log('BaseMessageProcessor', err);
            message.data.status = 'Failed';
            await this.messageHistoryDBAccesor.dbUpdateMessageById(t, message.id, message.data);
        } finally {
            ack(message);
        }
    }
}

module.exports = BaseMessageProcessor;