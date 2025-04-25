'use strict'

const pgp = require('pg-promise')();

let transactionCache  = new WeakMap(); //using weak map to create weak references to the request context object to be collected by the garbage collector

/**
 * @class
 */
class PGAccessBase {
  constructor(requestContext, dependencies) {
    this.requestContext = requestContext;
    this.db = dependencies.pgp;
  }

  getRawRequestContext() {
    return this.requestContext;
  }

  /**
   * 
   * @param {*} obj request context
   * @returns transaction cache array for the given request context
   */
  static getObjFromCache(obj) {
    let cache;
    if (transactionCache.has(obj)) {
      cache = transactionCache.get(obj);
      return cache;
    }
    return;
  }

  /**
   * 
   * @param {*} obj request context
   * @returns top most transaction object from the cache for the given request context
   */
  static getLatestTransactionFromCache(obj) {
    let cacheObj = PGAccessBase.getObjFromCache(obj);
    if(cacheObj)
      return cacheObj[cacheObj.length - 1];
    return;
  }

  /**
   * 
   * @param {*} obj request context
   * @param {*} t transaction object
   */
  static setTransactionInCache(obj, t) {
    let cachedTxObj = PGAccessBase.getObjFromCache(obj);
    if (cachedTxObj) {
      cachedTxObj.push(t);
      transactionCache.set(obj, cachedTxObj);
    }
    else{
      transactionCache.set(obj, [t]);
    }
    obj.currentActiveTransaction = t;
  }

  /**
   * 
   * @param {*} obj request context
   * @description if the cache is not empty pops a transaction. if the cache is empty deletes the key (request context) from the weakmap
   */
  static popLastTransactionFromCache(obj){
    let cachedTxObj = PGAccessBase.getObjFromCache(obj);
    if (cachedTxObj) {
      cachedTxObj.pop();
      if(cachedTxObj.length === 0) {
        PGAccessBase.clearTransactionFromCache(obj);
      } else {
        transactionCache.set(obj, cachedTxObj);
      }
      obj.currentActiveTransaction = PGAccessBase.getLatestTransactionFromCache(obj);
    }
  }

  /**
   * 
   * @param {*} obj - request context object
   * @description deletes the request context from the weak map
   */
  static clearTransactionFromCache(obj) {
    delete obj.currentActiveTransaction;
    transactionCache.delete(obj)
  }

  /**
   * 
   * @returns request context
   */
  getRequestContext() {
    return this.requestContext;
  }

/**
 * 
 * @param {*} method function that accepts the transaction object 't' that carries out the database queries using the transaction t
 * @param {*} preFn function to be executed before executing the pass 'method' - not implemented
 * @param {*} postFn function to be executed after executing the passed 'method' - not implemented
 * @returns The result of the database query executed 
 * @description A wrapper function that abstracts the transaction management implementation
 */
  async transaction(method, preFn, postFn) {
    let me = this;
    let TransactionMode = pgp.txMode.TransactionMode;
    let isolationLevel = pgp.txMode.isolationLevel;
    let mode = new TransactionMode({
      tiLevel: isolationLevel.repeatableRead,
      readOnly: false
    });

    let txWrapper = async function (t) {
      let returnVal
      let requestContext = me.getRequestContext();
      PGAccessBase.setTransactionInCache(requestContext, t);
      try {
        returnVal = await method.call(me, t);
      } catch(err){
        PGAccessBase.popLastTransactionFromCache(requestContext);
        throw err;
      }
      PGAccessBase.popLastTransactionFromCache(requestContext);
      return returnVal;
    }
  
    try{
      let result;
      let activeTxn = PGAccessBase.getLatestTransactionFromCache(this.requestContext);
      let db = me.db;
      if (activeTxn) {
        db = activeTxn;
        console.log('transaction-Begin savepoint');
      } else {
        console.log('transaction-Begin Transaction');
      }
      txWrapper.txMode = mode;
      result = await db.tx({mode}, txWrapper);
      return result;
    }
    catch(err){
     console.log('transaction',err);
     throw err; //if err is not thrown, the transaction will not rollback.
    }
  }
}

module.exports = PGAccessBase;