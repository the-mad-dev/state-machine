### State machine

##### Overview:

this project is poc of state machine framework. A state machine is nothing but a json document that depicts how a workflow should be executed. Example, consider the below ecommerce workflow. 

```
Order placed -> allocate inventory -> ship item -> send email
```

Now in a typical code base, updating this workflow with a new action item Eg. update inventory once the item is shipped would require some good coding effort. What if, it's as simple as editing a json file and very few code tweaks. Building new workflows with existing actions can be done in minutes.
Two different workflows can be chained to be executed on after the other,buy simply mentioning the state machine id in the action.

```
Order placed -> allocate inventory -> ship item -> update inventory -> send email
```


This is possible with the framework. 


#### State machine:

Json document:
```

{
        "name": "State machine name",
        "version": "1.0.0",
        "events": [
            {
                "name": "Start", #intial event
                "actions": [
                    { "name": "PlaceOrder"} #Initial action
                ]
            },
            {
                "name": "PlaceOrderSuccess", #Event - Result of Place order action
                "actions": [
                    { "name": "CapturePayment"},  #Action
                    { 
                      "name": "SendNotifications", #Action
                      "async": true,
                      "exchange": "mail_updates",
                      "state_machine_id": "TriggerNotifications"
                                 
                    }
                ]
            },
            {
                "name": "PlaceOrderFailed", #Event - Result of Place order action
                "actions": [
                    { 
                      "name": "SendNotifications", #Associated action
                      "async": true,
                      "exchange": "mail_updates",
                      "state_machine_id": "TriggerNotifications"
                                 
                    }
                ]
            }
        ]
    }

```
**Event**:

An event is a result of an action performed. A event can have it's own list of actions. Each action can publish any number of events and in turn can trigger other actions


**Action:**

An action is the work that needs to be done in the workflow like, Place Order. A action should return an event depicting the status of the action. Eg. PlaceOrderSuccess, PlaceOrderFailed. Action can be synchronous / asynchronous (Queuing a message)


**Components:**

**State machine manager :**
Exposes methods to initate the state machine, trigger actions, consume events and trigger their associated actions etc
\
**State machine DB accessor:**
State machines are stored in a table. This serves as the data access layer to retrieve the same
\
**Actions:**
Each action file corresponds to an action defined in the state machine json. Each action class will expose a method called _doAction that will be invoked by state machine. The business logic will be implemented either within the _doAction method or it will invoke some other method to achieve the same.
\
**Message producer,Message consumer:** Refer RMQ-PUB-SUB project
\
**PG-access-base, base-accessor etc:** Refer PG-transaction project

**Demo:**

The demo uses the following state machines 

```
{
        "name": "TestStateMachine",
        "version": "1.0.0",
        "events": [
            {
                "name": "Start",
                "actions": [
                    { "name": "PlaceOrder"}
                ]
            },
            {
                "name": "PlaceOrderSuccess",
                "actions": [
                    { "name": "CapturePayment"},
                    { 
                      "name": "SendNotifications",
                      "async": true,
                      "exchange": "mail_updates",
                      "state_machine_id": "TriggerNotifications"
                                 
                    }
                ]
            },
            {
                "name": "PlaceOrderFailed",
                "actions": [
                    { 
                      "name": "SendNotifications",
                      "async": true,
                      "exchange": "mail_updates",
                      "state_machine_id": "TriggerNotifications"
                                 
                    }
                ]
            }
        ]
    }
```
```

    {
        "name": "TriggerNotifications",
        "version": "1.0.0",
        "events": [
            {
                "name": "Start",
                "actions": [
                    { "name": "SendEmail"},
                    { "name": "SendSMS"}
                ]
            }
        ]
    }
   ```

This state machine demonstrates the below workflow

**Place order**

_If place order is  sucess_
   1. capture payment
   2. send email - async

\
_If place order failed_
   1. send email - async


\
**Code workflow:**
1. Place order is the initial action. 
2. This action could return either of the two events. 
3. One is PlaceOrderSucces and other is PlaceOrderFailed. 
4. If PlaceOrderSuccess is triggered, then it should perform two actions. CapturePayment and Send Email. 
5. If PlaceOrderFailed event is published then it should perform one action SendEmail.
6. Here SendEmail is an asynchronous action i.e this action will send a message to a particular exchange mentioned under the action configuration iteself. 
7. On processing the message the state machine(TriggerNotifications) that should be triggered by the message processor is also specified under the action configuration itself

**Pre-requisites:**
1. Node JS - latest version
2. Postgres - latest version
3. RMQ - latest version


**Steps:**
1. Run the queries in the file  to create database, roles, tables, insert data etc
2. Update config file with postgress connection url, rmq conneciton url
3. Ensure that Postgres, Rabbtmq are up and running
4. Run the following command
```
npm run init-state-machine
```
5. Output
```
> init-state-machine
> node test.js

DB Pool stats { totalCount: 1, idleCount: 1, waitingCount: 0 }
Time taken seconds {
  query: "select * from state_machine where data->>'name' = $1;",
  timeTaken: 55
}
transaction-Begin Transaction
Order placed
DB Pool stats { totalCount: 2, idleCount: 1, waitingCount: 0 }
Time taken seconds {
  query: "select * from state_machine where data->>'name' = $1;",
  timeTaken: 25
}
Payment captured
transaction-Begin Transaction
Time taken seconds {
  query: 'INSERT INTO message_history (id, data) VALUES ($1, $2);',
  timeTaken: 3
}
Message sent
Message sent: f7378940-c4da-4c4a-b341-8e07be728536
done
```
5. Run the following command to start the message consumer and process the messages that were queued by the state machine. The message consumer on receiving the message will trigger the corresponding state machine to process the message
```
npm run init-msg-consumer
```
6. Ouput
```
> init-msg-consumer
> node  start-message-consumer --clusterId=B

Started consumer clusterId=B
Waiting for further messages ...
transaction-Begin Transaction
Time taken seconds {
  query: 'select id, data from message_history where id=$1;',
  timeTaken: 4
}
Time taken seconds {
  query: 'update message_history set data=$2 where id=$1;',
  timeTaken: 3
}
_ackMessage acked at {
  ackAt: 2025-04-25T07:54:34.490Z,
  msg: '{"id":"f7378940-c4da-4c4a-b341-8e07be728536"}'
}
DB Pool stats { totalCount: 2, idleCount: 2, waitingCount: 0 }
Time taken seconds {
  query: "select * from state_machine where data->>'name' = $1;",
  timeTaken: 25
}
transaction-Begin Transaction
Email sent to test@gmail.com
SMS sent to 9840090
```



