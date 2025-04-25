const _ = require('lodash');
const StateMachineFactory = require('./state-machine-factory');
const StateMachineDBAccessor = require('../db/state-machine-db-accesor');
const MessageQueueManager = require('../messaging/message-queue-manager');
const PGAccessBase = require('../base/pg-access-base');

class StateMachineManager extends PGAccessBase{
    constructor(requestContext, config, dependencies) {
        super(requestContext, dependencies);
        this.dependencies = dependencies;
        this.stateMachineConfigCache = {};
        this.postTxnFns = [];
        this.stateMachineFactory = new StateMachineFactory(requestContext, config, dependencies);
        this.stateMachineDBAccessor = new StateMachineDBAccessor(requestContext, config, dependencies);
        this.messageQueueManager = new MessageQueueManager(requestContext, config, dependencies);
    }
    async initiateByEvent(stateMachineId, eventName, args) {
        //get actions for event
        let actions = await this._getEventActionsByEventName(stateMachineId, eventName);
            
        if(!_.isEmpty(actions)) {
            //trigger actions
            await this.transaction(async (t) => {
                args.t = t;
                await this._triggerActions(stateMachineId, actions, args);
            });
            await this._executePostTxnFns();
        }
        //return result;
        return args.result
    }

    async intiateByAction(stateMachineId, actionName, args) {

    }

    async _getEventActionsByEventName(stateMachineId, eventName) {
        let stateMachineConfig = await this.getStateMachineConfigById(stateMachineId);
        if(stateMachineConfig) {
            let event =  _.find(stateMachineConfig.events, (e) => {
                if(_.isArray(e.name)) {
                    return _.includes(e.name, eventName);
                } else {
                    return e.name == eventName;
                }
            });

            if(!_.isEmpty(event)) {
                return event.actions;
            }
        }
        return [];
    }

    async _trigger(stateMachineId, actionName, args, exceptionEvent) {
        try {
            let action = this.stateMachineFactory.getAction(actionName);
            if(_.isEmpty(action)) {
                console.log('No action found in statemachine for action name: ', actionName);
                return;
            }
            let event = await action.doAction(args);
            if(event) {
                let actions = await this._getEventActionsByEventName(stateMachineId, event);
                if(!_.isEmpty(actions)) {
                    await this._triggerActions(stateMachineId, actions, args);
                }
            }
        } catch(err) {
            await this._triggerExceptionHandler(stateMachineId, exceptionEvent, args);
            console.log(err);
        }
      
    }

    async _triggerExceptionHandler(stateMachineId, exceptionEvent, args) {
        if(exceptionEvent) {
            let actions = this._getEventActionsByEventName(stateMachineId, exceptionEvent);
            if(!_.isEmpty(actions)) {
                await this._triggerActions(stateMachineId, actions, args);
            }
        }
    }

    async _triggerActions(stateMachineId, actions, args) {
        for(let _action of actions) {
            let nextStateMachineId = _action.state_machine_id || stateMachineId;
            if(_action.async && _action.exchange) {
                //handle queuing operations
                this._enqueuePostTxns(this.messageQueueManager, this.messageQueueManager.sendMessageToExchange, [_action.exchange, {
                    state_machine_id: nextStateMachineId,
                    action_id: _action.name,
                    args: _.get(args, 'message_args')
                }])
            } else {
                await this._trigger(nextStateMachineId, _action.name, args, _action.exception);
            }
        }
    }

    async getStateMachineConfigById(stateMachineId) {
            let result = await this.stateMachineDBAccessor.getByName(stateMachineId);
            return result[0].data;
    }

    _enqueuePostTxns(funcContext, func, funcArgs) {
        this.postTxnFns.push({funcContext, func, funcArgs})
    }

    async _executePostTxnFns() {
        for(let arg of this.postTxnFns) {
            if(_.has(arg, 'funcArgs[2].t')) {
                _.set(arg, 'funcArgs[2].t', this.dependencies.pgp)
            }
            try {
                await arg.func.apply(arg.funcContext, arg.funcArgs);
            } catch(err) {
                console.log(err);
            }
        }
    }
} 

module.exports = StateMachineManager;