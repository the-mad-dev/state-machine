const Enum = require('../constants/Enum');
const BaseAction = require('../base/base-action');
const _ = require('lodash');
const uuid = require('uuid');


class PlaceOrder extends BaseAction {
    constructor(requestContext, config, dependencies ) { 
        super(requestContext, dependencies);
        this.action = "PlaceOrder";
    }
    async _doAction(args) {
        console.log('Order placed');
        args.message_args = _.extend( { order_id: args.order_id, email: 'test@gmail.com', phone: 9840090}, args.message_args);
        return Enum.StateMachineEvents.PlaceOrderSuccess;
    }
}

module.exports = PlaceOrder;