/** <Self help>
 * test(name, age) {
 *  console.log(this.greet, name, age)
 * }
 * call - invoke a function with the give context test(this, arg1, arg2). Function arguments are passed as separate parameters. let data = {greet: 'Hi'}. o/p of test(data, 'the_mad_dev', '31') is "hi the_mad_dev 31"
 * apply - invoke a function with the given context test(this, [arg1, arg2]). Function arguments are passed as a single array. let data = {greet: 'hello'}. o/p of test(data, 'the_devil', '32') is "hello the_devil 32"
 * bind - creates a new function with the given context. test(this, arg1, arg2). Function arguments are passed as separate parameters. let data = {greet: 'hola'}, let boundTest = test(data, 'the_angel'), o/p of boundTest('33') is 'hola the_angel 33'
 */

const _ = require('lodash');
const PGAccessBase = require('./pg-access-base');

class BaseMessenger extends PGAccessBase{
  constructor(requestContext, config, dependencies) {
    super(requestContext, dependencies)
    this.config = config;
    this.messagingConnection = dependencies.rabbitMQConnection; //function to create rmq connection using amqp lib
    this.rmqCon = null; //to store connection in memory
    this._channelCache = undefined; //to store channels in memory
    this.consumerList = [];  //the consumers (consumerTAg) and the associated channels are added to this array when binding exchange to the queue when starting the messaging consumer. Used to cancel the consumer when gracefully shutting down
    let listeners = process.listenerCount('SIGINT');
    if(listeners == 0) { // to avoid duplicate listners for the same process. This will create a memory leak. In the case of the poc, both message consumer and message producer extends base messenger in which the process listener is attached. Hence 2 listeners will be created if a check is not added here
      this._attachProcessTerminationHandlers();
    }
     //this will attach signal listeners (process.on) to the  current process
  }

  _exitProcessWithDelay(exitCode=0, code = null, delay = 1000 ) {
    console.log(`Process exiting due to exitCode: ${exitCode}, code: ${code}`);
    setTimeout(function() {
      process.exit(exitCode);
    }, delay)
  }

  async _terminationSignalHandler(exitCode, code, delay) {
    console.log('handling termination signal smoothly');
    //terminate any open channels and connections here
    for(let consumerInfo of this.consumerList) {
      try {
        await consumerInfo.channel.cancel(consumerInfo.consumerTag);
      } catch(err) {
        console.log('_terminationSignalHandler', err);
        exitCode = 1;
      }
    }
    this._exitProcessWithDelay(exitCode, code, delay);
  }

  /**
   * @description Listens for SIGTERM, SIGINT, SIGQUIT, SIGHUP and handles the termination of the process smoothly
   */
  _attachProcessTerminationHandlers() {
    process.on('SIGTERM', this._terminationSignalHandler.bind(this, 0, 'SIGTERM')); //polite termination. kill command
    process.on('SIGINT', this._terminationSignalHandler.bind(this, 0, 'SIGINT')); //ctrl + c in the terminal where the process is running
    process.on('SIGINT', () => {
      console.log(`SIGINT received at ${new Date().toISOString()} by process ID ${process.pid}`);
    });
    
    process.on('SIGQUIT', this._terminationSignalHandler.bind(this, 0, 'SIGQUIT')); //ctrl + /  in the terminal where the process is running. This will terminate the process and does a core dump to perform debugging
    process.on('SIGHUP', this._terminationSignalHandler.bind(this, 0, 'SIGHUP')); //closing the terminal window or end of the terminal session or kill -HUP <pid> -> this will send SIGHUP to a process often causing it to reload configuration . Typically used to reload configuration without restarting the daemon process.
  }

  async initConnection() {
    this.rmqCon = await this.messagingConnection(this.config);
    this.rmqCon.removeAllListeners();  //remove event listeners associated to the rmq connection to avoid memory leak. an  event also can be mention as parameter [eventName] to remove listeners associated to that event alone
    this.rmqCon.on('close', this._handleConnectionClose.bind(this));
    this.rmqCon.on('error', this._handleConnectionError.bind(this));
  }

  async closeConnection() {
    if(this.rmqCon) {
      try {
        await this.rmqCon.close()
      } catch(err) {
        console.log('Error while closing rmq connection',err.message);
      } finally { 
        this.rmqCon = null;
      }
    }
  }

  async _handleRabbitMQError(e) {
    console.log('_handleRabbitMQError', e);
    await this.closeConnection();
    //retry connection
  }

  _handleConnectionClose(eCode) {
    console.log('RMQ connection close');
    this._handleRabbitMQError.apply(this, eCode);
  } 

  
  _handleConnectionError(eCode) {
    console.log('RMQ connection errored');
    this._handleRabbitMQError.apply(this, eCode);
  } 


   /**
   * @param {Boolean} useCache pass true to get channels from cache
   * @param {JSON} options channels can be created for specific exchange and queues i.e. channle.bindQueue(queue, exchangName, queueRoutingKey), those options can be passed through this parameter. {exchangeId, exchange, queue}. Mostly used for consumers to have channels per exchange/queue
   * @returns {Object} channel
   * @description getChannel method uses an existing connection in memory or creates a new one if none exists and uses that to create a channel or return an existing channel from cache
   */
   async getChannel(useCache=true, options={}) {
    let method = 'getChannel';
    try {
      if(!this.rmqCon) {
        await this.initConnection();
        // await this.initConnection.call(this);
      }

      if(useCache && this._channelCache != undefined) {
        console.log('Using channel from cache');
        return this._channelCache;
      }
  
      let channel = await this.rmqCon.createConfirmChannel(); //createChannel() vs createConfirmChannel -> this will ensure the message is delivered where the message broker will give back an ack that the message is delivered, has little bit performance overhead and latency for the from and to calls
       
      //handle channel close
      channel.on('close', (eCode) => {
        this._handleChannelClose(eCode, options);
      });

      //handle channel error
      channel.on('error', eCode => {
        this._handleChannelError(eCode, options);
      });

      if(useCache) {
        this._channelCache = channel;
      }
      return channel;
    } catch(err) {
      console.log(method,err);
      throw err;
    }
  }

  _handleChannelClose(eCode, options={}) {
    console.log('_handleChannelClose', eCode);
    this._channelCache = undefined;
  }

  async _handleChannelError(eCode, options={}) {
    console.log('_handleChannelError', eCode);
    this._channelCache = undefined;
    //recreate channel
  }

  /**
   * 
   * @param {String} exchange name of the exchange where the message should be published
   * @param {*} payload the message to be published to the exchange
   */

  async publish(exchange, payload) {
   //Best-Effort Delivery
    const channel = await this.getChannel(true);
    await channel.assertExchange(exchange, "fanout", { durable: true });
    channel.publish(exchange, "", Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    await channel.waitForConfirms(); //add reliability, process waits till rmq sends an acknowledgment that the message is accepted, but a slight performance overhead. Since we are using data queuing pattern i.e message is stored in database loss of this message can be tolerated, as we can implement a cron worker to re-push the unsent messages - for the poc if you want enable this, then the setTimeout in test-rmq-producer class, that exits the process after 2 seconds can be removed
    // await channel.close();  //will be closed when the process exits, ensure that the process exits
    // await this.rmqCon.close(); //will be closed when the process exits, ensure that the process exits
  }

  //consumer related
  async createChannelToExchange(exchange, exchangeId) {
    for(let queue of this.getExchangeBindings(exchangeId)) {
        await this._bindQueueToExchange(queue, exchange, exchangeId)
    }
}

getExchangeBindings(exchangeId) {
    return this.config.rmq.messaging.bindings[exchangeId] || [];
}

async _bindQueueToExchange(queue, exchange, exchangeId) {
    let channel = await this.getChannel(false, {exchangeId, exchange, queue});
    if(exchange.bindQueue) {
        await channel.assertQueue(queue, {arguments: {durable: true, auto_delete: false}}); //durable -> true, means persist queue and the messages in the queue even if the RMQ server restarts, default value is false, auto_delete -> false, means do not delete the queue if all the consumers disconnect. default value is false
        let routingKey = ''; //have it in the config for each exchange and construct it here
        await channel.bindQueue(queue, exchange.name, routingKey);
    }
    let { consumerTag } = await channel.consume(queue, this.processMessage(queue, exchange.name, channel));
    this._storeChannelInContext(channel, consumerTag);  //this know the list of consumers associated to the channel to cancel, when there is termination signal. channel.cancel(consumerTag). cancelling means gracefully informing the consumers to stop consuming the messages. refer _terminationSignalHandler

}

_storeChannelInContext(channel, consumerTag) {
  this.consumerList.push({channel, consumerTag});
}
  
}

module.exports = BaseMessenger;
