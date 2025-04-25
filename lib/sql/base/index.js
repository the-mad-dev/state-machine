'use strict'

const load = require('./load-sql');

let sqlFileHash = {
    insert: load('./queries/insert.sql'),
    inserAndReturn: load('./queries/insertAndUpdate.sql'),
    update: load('./queries/update.sql'),
    updateAndReturn: load('./queries/updateAndReturn.sql'),
    delete: load('./queries/delete.sql'),
    insertAndReturn: load('./queries/get-by-id.sql')
}

module.exports = sqlFileHash;