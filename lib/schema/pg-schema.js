const joi = require('joi');

const messageHistorySchema = joi.object({
    message: joi.object(),
    exchange: joi.string().optional(),
    status: joi.string().optional()
});

const stateMachineSchema = joi.object({
    name: joi.string().optional(),
    version: joi.string().optional(),
    events: joi.array().items(joi.object())
   
});

module.exports = {
    messageHistorySchema,
    stateMachineSchema
}