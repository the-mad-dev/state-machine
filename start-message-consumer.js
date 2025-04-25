const config = require('./config/config.json');
const rabbitMQConnection = require('./lib/base/amqp-connection');
const db = require('./lib/base/db');
const MessageConsumer = require('./lib/messaging/message-consumer');
const MessageProducer = require('./lib/messaging/message-producer');
const ProcessorFactory = require('./lib/messaging/processor/processor-factory');
const sqlFilesCache = require('./lib/sql/index');
const nconf = require('nconf');
const _ = require('lodash');

class MessageConsumerService {
    constructor(config) {
        nconf.argv();
        this.config = config;
        this.dependencies = {}
        this._setDependencies();
        this.messageConsumer = new MessageConsumer(this.config, this.dependencies, new ProcessorFactory(this.config, this.dependencies));
    }

    _setDependencies() {
        this.dependencies.rabbitMQConnection = rabbitMQConnection.bind(this, this.config);
        this.dependencies.pgp = db(this.config);
        this.dependencies.sqlFilesCache = sqlFilesCache;
        this.dependencies.messageProducer = new MessageProducer({request_id: 123}, config, this.dependencies);
    }

    _modifyExchangeConfigClusterId(clusterId) {
        if(!_.isEmpty(clusterId)) {
            let bindingConfig = {};
            _.forEach(this.config.rmq.messaging.exchanges, (exchangeConfig, exchangeName) => {
                if(exchangeConfig.clusterId == clusterId.toString()) {
                    bindingConfig[exchangeName] = this.config.rmq.messaging.bindings[exchangeName];
                }
            });
            this.config.rmq.messaging.bindings = bindingConfig;
        }
    }

    async start() {
        let clusterId = nconf.get('clusterId');
        console.log(`Started consumer clusterId=${clusterId}`);
        this._modifyExchangeConfigClusterId(clusterId);
        await this.messageConsumer.drainMessages();
    }
}

let messageConsumerService = new MessageConsumerService(config);
messageConsumerService.start()
.then(() => {
    console.log("Waiting for further messages ...");
})
.catch((err) => {
    console.log('err', err);
    process.exit(1);
})

