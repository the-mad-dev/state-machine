'use strict'
const pgErrors = require('./pg-errors.json');
const pgSchemaErrors = require('./pg-schema-errors.json');

class PgError extends Error {
    constructor(fields) {
        super(fields.message);
        this.code = fields.code;
        this.condition = pgErrors[fields.code];
        this.constraint = fields.constraint;
        this.detail = fields.detail;
        this.message = fields.message;
        this.stack = fields.stack;
    }

    isSchemaError() {
        if(_.isEmpty(pgSchemaErrors)) {
            return false;
        }

        return Object.keys(pgSchemaErrors).includes(this.code);
    }
}

module.exports = PgError;