const BaseAccessor = require('../base/base-accessor');
const Constants = require('../constants/constants');
const Schema = require('../schema/pg-schema')

class StateMachineDBAccesor extends BaseAccessor {
    constructor(requestContext, config, dependencies) {
        super(requestContext, config, dependencies, Constants.Tables.StateMachine, Schema.stateMachineSchema, dependencies.pgp)
        this.requestContext = requestContext;
        this.sqlCmds = dependencies.sqlFilesCache[Constants.Tables.StateMachine];
    }

    async getById(id) {
        //To do, instead of using this.db, use the current active transaction for the request context from the cache
        const tx = this.getSharedTxObject();
        return await this.dbGetById(tx, id);
    }

    async getByName(name) {
        return await this.dbGetByName(this.db, name);
    }

     
    async dbGetByName(db, name) {
        let result = await this.filter(this.sqlCmds.getByName, [name], db);
        return result;
    }

    //Function names prefixed with db implies that the transaction object should be passed to function as param
    async dbGetById(db, id) {
        let result = await this.getById(this.sqlCmds.getById, [id], db);
        return result;
    }

    async dbInsert(db, id, data) {
        let result = await this.insert(this.sqlCmds.insert, [id, data], db);
        return result;
    }

    async dbUpdateById(db, id, data) {
        let result = await this.update(this.sqlCmds.update, [id, data], db)
        return result;
    }
}

module.exports = StateMachineDBAccesor;