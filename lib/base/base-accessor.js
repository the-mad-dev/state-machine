const pg = require('pg-promise');
const _ = require('lodash');
const pgErrors = require('./pg-errors.json');
const PgError = require('./pg-error');
const baseSqlCmdsCache = require('../sql');
const PGAccessBase = require('./pg-access-base');

class BaseAccessor {
    constructor(requestContext, config, dependencies, tableName, joiSchema, pgp, validationOptions={}, opts={}) {
        if(_.isArray(joiSchema)) {
            this.multiColumnJoiSchema = joiSchema;
        } else {
            this.joiSchema = joiSchema;
        }
        this.tableName = tableName;
        this.types = pg().pg.types;
        this.pgp = pgp;
        this.validationOptions = validationOptions;

    }

    getSharedTxObject(t) {
        let txObj = PGAccessBase.getLatestTransactionFromCache(this.getRawRequestContext());
        if(!txObj) {
            return t || this.pgp;
        }
        return txObj;
    }

    clearSensitiveData(data) {
        //To be implemented by child class
        return data;
    }

    handleError(err) {
        if(err.code && pgErrors[err.code]) {
            throw new PgError(err);
        }
        throw err;
    }

    _validateJoiSchema(value, schema) {
        if(schema) {
            const result = schema.validate(value, this.validationOptions);
            if(result.error) {
                throw result.error;
            }
        }
    }

    validateSchema(values) {
        let me = this;
        if(_.isArray(values)) {  //in case of multi jsonb columns
            _.each(values, (val, index) => {
                if(_.isArray(val)) { //multi row insert case
                    _.each(val, (obj, idx) => {
                        if(!_.isEmpty(me.multiColumnJoiSchema)) {
                            me._validateJoiSchema(obj, me.multiColumnJoiSchema[idx])
                        } else if (_.isObject(obj)) {  //skipping others which are not objects. Assumption is the the structure of tables is expected to have columns id, data, created_date, modified_date, where data is the only jsonb colums
                            me._validateJoiSchema(obj, me.joiSchema)
                        }
                    })
                } else if(!_.isEmpty(me.multiColumnJoiSchema)) {
                    me._validateJoiSchema(val, me.multiColumnJoiSchema[index])
                } else if (_.isObject(val)) {  //skipping others which are not objects. Assumption is the the structure of tables is expected to have columns id, data, created_date, modified_date, where data is the only jsonb colums
                    me._validateJoiSchema(val, me.joiSchema)
                }
            }) 
        } else if(_.isObject(values)) {  //schema validation for jsonb column
            me._validateJoiSchema(values, me.joiSchema)
        }
    }

    _getSqlQuery(sqlQueryFile) {
        if(typeof (sqlQueryFile) === 'string')
            return sqlQueryFile;
        else if (sqlQueryFile.query)  //pg version less than 6
            return sqlQueryFile.query
        else if (sqlQueryFile[pg.QueryFile.$query])
            return sqlQueryFile[pg.QueryFile.$query]
        return sqlQueryFile.toString();
    }

    async insert(sqlCmd, values, tx=this.pgp, skipValidation=false) {
        const me = this;
        if(!sqlCmd) {
            sqlCmd = baseSqlCmdsCache["insert"];
            values.unShift(this.tableName);
        }
        try {
            let sqlQuery = me._getSqlQuery(sqlCmd);
            if(!skipValidation) {
                me.validateSchema(values);
            }
            let startTime = (new Date()).getTime();
            await tx.none(sqlCmd, values);
            let timeTaken = (new Date()).getTime() - startTime;
            if(tx.$pool) {
                console.log("DB Pool stats", {totalCount: tx.$pool.totalCount, idleCount:tx.$pool.idleCount, waitingCount: tx.$pool.waitingCount })
            }
            console.log("Time taken seconds", {query: sqlQuery, timeTaken})
        } catch(err) {
            console.log(err);
        }
    }

    async insertOne(sqlCmd, values, tx=this.pgp, skipValidation=false) {
        const me = this;
        if(!sqlCmd) {
            sqlCmd = baseSqlCmdsCache["insert"];
            values.unShift(this.tableName);
        }
        try {
            let sqlQuery = me._getSqlQuery(sqlCmd);
            if(!skipValidation) {
                me.validateSchema(values);
            }
            let startTime = (new Date()).getTime();
            let result = await tx.one(sqlCmd, values);
            let timeTaken = (new Date()).getTime() - startTime;
            if(tx.$pool) {
                console.log("DB Pool stats", {totalCount: tx.$pool.totalCount, idleCount:tx.$pool.idleCount, waitingCount: tx.$pool.waitingCount })
            }
            console.log("Time taken seconds", {query: sqlQuery, timeTaken});
            //TODO
            // if(_.get(me.config, 'clear_sensitive_info', false)) {
            //     result = me.clearSensitiveInfo(result);
            // }

            if(!result) {
                return null;
            }

            return result;
        } catch(err) {
            console.log(err);
        }
    }

    async update(sqlCmd, values, tx=this.pgp, skipValidation=false) {
        const me = this;
        if(!sqlCmd) {
            sqlCmd = baseSqlCmdsCache["update"];
            values.unShift(this.tableName);
        }
        try {
            let sqlQuery = me._getSqlQuery(sqlCmd);
            if(!skipValidation) {
                me.validateSchema(values);
            }
            let startTime = (new Date()).getTime();
            await tx.result(sqlCmd, values);
            let timeTaken = (new Date()).getTime() - startTime;
            if(tx.$pool) {
                console.log("DB Pool stats", {totalCount: tx.$pool.totalCount, idleCount:tx.$pool.idleCount, waitingCount: tx.$pool.waitingCount })
            }
            console.log("Time taken seconds", {query: sqlQuery, timeTaken})
        } catch(err) {
            console.log(err);
        }
    }

    async updateAndReturn(sqlCmd, values, tx=this.pgp, skipValidation=false) {
        const me = this;
        if(!sqlCmd) {
            sqlCmd = baseSqlCmdsCache["update"];
            values.unShift(this.tableName);
        }
        try {
            let sqlQuery = me._getSqlQuery(sqlCmd);
            if(!skipValidation) {
                me.validateSchema(values);
            }
            let startTime = (new Date()).getTime();
            let result = await tx.oneOrNone(sqlCmd, values);
            let timeTaken = (new Date()).getTime() - startTime;
            if(tx.$pool) {
                console.log("DB Pool stats", {totalCount: tx.$pool.totalCount, idleCount:tx.$pool.idleCount, waitingCount: tx.$pool.waitingCount })
            }
            console.log("Time taken seconds", {query: sqlQuery, timeTaken});
             //TODO
            // if(_.get(me.config, 'clear_sensitive_info', false)) {
            //     result = me.clearSensitiveInfo(result);
            // }

            if(!result) {
                return null;
            }

            return result;
        } catch(err) {
            console.log(err);
        }
    }

    async updateMultipleRowsAndReturn(sqlCmd, values, tx=this.pgp, skipValidation=false) {
        const me = this;
        if(!sqlCmd) {
            sqlCmd = baseSqlCmdsCache["update"];
            values.unShift(this.tableName);
        }
        try {
            let sqlQuery = me._getSqlQuery(sqlCmd);
            if(!skipValidation) {
                me.validateSchema(values);
            }
            let startTime = (new Date()).getTime();
            let result = await tx.any(sqlCmd, values);
            let timeTaken = (new Date()).getTime() - startTime;
            if(tx.$pool) {
                console.log("DB Pool stats", {totalCount: tx.$pool.totalCount, idleCount:tx.$pool.idleCount, waitingCount: tx.$pool.waitingCount })
            }
            console.log("Time taken seconds", {query: sqlQuery, timeTaken});
             //TODO
            // if(_.get(me.config, 'clear_sensitive_info', false)) {
            //     result = me.clearSensitiveInfo(result);
            // }

            if(!result) {
                return null;
            }

            return result;
        } catch(err) {
            console.log(err);
        }
    }

    async filter(sqlCmd, values, tx=this.pgp) {
        const me = this;
        try {
            let sqlQuery = me._getSqlQuery(sqlCmd);
            let startTime = (new Date()).getTime();
            let result = await tx.any(sqlCmd, values);
            let timeTaken = (new Date()).getTime() - startTime;
            if(tx.$pool) {
                console.log("DB Pool stats", {totalCount: tx.$pool.totalCount, idleCount:tx.$pool.idleCount, waitingCount: tx.$pool.waitingCount })
            }
            console.log("Time taken seconds", {query: sqlQuery, timeTaken});
            //TODO
            // if(_.get(me.config, 'clear_sensitive_info', false)) {
            //     result = me.clearSensitiveInfo(result);
            // }

            if(!result) {
                return null;
            }

            return result;
        } catch(err) {
            console.log(err);
        }
    }

    async getById(sqlCmd, values, tx=this.pgp) {
        const me = this;
        if(!sqlCmd) {
            sqlCmd = baseSqlCmdsCache["getById"];
            values.unShift(this.tableName);
        }
        try {
            let sqlQuery = me._getSqlQuery(sqlCmd);
            let startTime = (new Date()).getTime();
            let result = await tx.oneOrNone(sqlCmd, values);
            let timeTaken = (new Date()).getTime() - startTime;
            if(tx.$pool) {
                console.log("DB Pool stats", {totalCount: tx.$pool.totalCount, idleCount:tx.$pool.idleCount, waitingCount: tx.$pool.waitingCount })
            }
            console.log("Time taken seconds", {query: sqlQuery, timeTaken});
            //TODO
            // if(_.get(me.config, 'clear_sensitive_info', false)) {
            //     result = me.clearSensitiveInfo(result);
            // }

            if(!result) {
                return null;
            }

            return result;
        } catch(err) {
            console.log(err);
        }
    }
}

module.exports = BaseAccessor;