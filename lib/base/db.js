//basic pg connection

const pgp = require("pg-promise")();

function getDb(config) {
    const cn = {
        connectionString: config.postgres.connection_string, 
        max: config.postgres.max_connections //connection pool limit
    }
    return pgp(cn);
}

module.exports = getDb;