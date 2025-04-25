const BaseAccessor = require('../base/base-accessor');
const Constants = require('../constants/constants');
const Schema = require('../schema/pg-schema')

class MessageHistoryDBAccesor extends BaseAccessor {
    constructor(requestContext, config, dependencies) {
        super(requestContext, config, dependencies, Constants.Tables.MessageHistory, Schema.messageHistorySchema, dependencies.pgp)
        this.requestContext = requestContext;
        this.sqlCmds = dependencies.sqlFilesCache[Constants.Tables.MessageHistory];
    }

    async getMessageById(messsageId) {
        //To do, instead of using this.db, use the current active transaction for the request context from the cache
        const tx = this.getSharedTxObject();
        return await this.dbGetMessageById(tx, messsageId);
    }

    async dbInsertMessage(db, id, data) {
        let result = await this.insert(this.sqlCmds.insert, [id, data], db);
        return result;
    }

    //Function names prefixed with db implies that the transaction object should be passed to function as param
    async dbGetMessageById(db, messsageId) {
        let result = await this.getById(this.sqlCmds.getById, [messsageId], db);
        return result;
    }

    async dbUpdateMessageById(db, messsageId, data) {
        let result = await this.update(this.sqlCmds.update, [messsageId, data], db)
        return result;
    }
}

module.exports = MessageHistoryDBAccesor;