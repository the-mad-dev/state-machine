'user strict';

const uuid = require('uuid');
const amqplib = require("amqplib");

const BaseMessenger = require('../base/base-messenger');
const MessageHistoryDBAccesor = require('../db/message-history-db-accessor');

class MessageProducer extends BaseMessenger {
  constructor(requestContext, config, dependencies) {
    super(requestContext, config, dependencies);
    this.messageHistoryDBAccessor = new MessageHistoryDBAccesor(requestContext, config, dependencies);
  }

  async sendMessage(exchange, payload) {
    const method = 'sendMessageToExchange';
    try {
      const channel = await this.getChannel(true);
      await channel.assertExchange(exchange, "fanout", { durable: true });
      channel.publish(exchange, "", Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      });
      await channel.waitForConfirms(); //add reliability, process waits till rmq sends an acknowledgment that the message is accepted, but a slight performance overhead. Since we are using data queuing pattern i.e message is stored in database loss of this message can be tolerated, as we can implement a cron worker to re-push the unsent messages - for the poc if you want enable this, then the setTimeout in test-rmq-producer class, that exits the process after 2 seconds can be removed
    // await channel.close();  //will be closed when the process exits, ensure that the process exits
    // await this.rmqCon.close(); //will be closed when the process exits, ensure that the process exits
      console.log("Message sent");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  }

  async sendMessageToQueue(queue, message) {
    try {
      const conn = await amqplib.connect(this.config.rmq.connection);
      const ch1 = await conn.createChannel();
      await ch1.assertQueue(queue, { durable: true });

      ch1.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
      });
      console.log("Message sent:", message);

      await ch1.close();
      await conn.close();
    } catch (err) {
      console.error("Error sending message:", err);
    }
  }
}

module.exports = MessageProducer;

// let messageProducer = new MessageProducer(config);

// messageProducer.sendMessageToExchange('order_updates', {name: "arun"})
// .then(() => {
//     console.log("Success");
//     process.exit(0);
// })
// .catch((err) => {
//     console.log('Failed',err);
//     process.exit(1);
// })
