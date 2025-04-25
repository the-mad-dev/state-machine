const loadQuery = require('./base/load-sql');
const Constants = require('../constants/constants');

const load = function(fileName) {
    return loadQuery(fileName, __dirname);
}

let sqlFileHash = {};

sqlFileHash[Constants.Tables.MessageHistory] = {
    insert: load('./message_history/insert.sql'),
    getById: load('./message_history/getById.sql'),
    update: load('./message_history/update.sql')
}

sqlFileHash[Constants.Tables.StateMachine] = {
    insert: load('./state_machine/insert.sql'),
    getById: load('./state_machine/getById.sql'),
    getByName: load('./state_machine/getByName.sql'),
    update: load('./state_machine/update.sql')
}

module.exports = sqlFileHash;