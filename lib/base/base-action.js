const PGAccessBase = require('./pg-access-base');

class BaseAction extends PGAccessBase { 
   constructor(requestContext, dependencies) {
    super(requestContext, dependencies);
   }

    async doAction(args) {
        await this._preHook(args);
        let event = await this._doAction(args);
        let postHookEvent = await this._postHook(args, event);
        //postHook event will get the precendence & it will be returned so that actions hooked to this event will be performed
        event = postHookEvent || event;
        return event;
    }

    async _doAction(args) {
        //method to be implemented by the child class
    }

    async _preHook(args) {
        //method to be implemented by the child class
    }

    async _postHook(args) {
        //method to be implemented by the child class
    }
}

module.exports = BaseAction;