const BaseMessageProcessor = require('./base-message-processor');
const StateMachineManager = require('../../state-machine/state-machine-manager');
const Enum = require('../../constants/Enum');
const _ = require('lodash');

class MailUpdatesProcessor extends BaseMessageProcessor{
    constructor(requestContext, config, dependencies) {
        super(requestContext, config, dependencies);
        this.dependencies = dependencies;

    }

    async processExtractedData({message}) {
        let stateMachineId = _.get(message, 'state_machine_id', '');
        if(stateMachineId) {
            await this.stateMachineManager.initiateByEvent(stateMachineId, Enum.StateMachineEvents.Start, _.get(message, 'args'));
        }
    }
}

module.exports = MailUpdatesProcessor;