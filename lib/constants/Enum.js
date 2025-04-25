const StateMachineActions = {
    PlaceOrder: "PlaceOrder",
    CapturePayment: "CapturePayment",
    SendEmail: "SendEmail",
    SendSMS: "SendSMS"
}

const StateMachineEvents = {
    Start: "Start",
    PlaceOrderSuccess: "PlaceOrderSuccess",
    PlaceOrderFailed: "PlaceOrderFailed"
}

const Queue =  {
    ORDER_UPDATES_LISTENER: 'order_updates_listener',
    MAIL_UPDATES_LISTENER: 'mail_updates_listener'
};

const Exchange =  {
    ORDER_UPDATES: 'order_updates',
    MAIL_UPDATES: 'mail_updates'
};

module.exports = {
    StateMachineEvents,
    StateMachineActions,
    Queue,
    Exchange
}

