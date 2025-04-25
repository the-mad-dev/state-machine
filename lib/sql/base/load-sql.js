const QueryFile = require('pg-promise').QueryFile;
const path = require('path');

module.exports = function(file, dirname) {
    if(!dirname) {
        dirname = __dirname;
    }
    const fullPath = path.join(dirname, file);
    return new QueryFile(fullPath, {minify: true})
}