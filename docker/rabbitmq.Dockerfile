FROM rabbitmq:3.12-management

RUN apt-get update && apt-get install -y curl

RUN curl -L -o /plugins/rabbitmq_delayed_message_exchange-3.12.0.ez https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v3.12.0/rabbitmq_delayed_message_exchange-3.12.0.ez

RUN rabbitmq-plugins enable --offline rabbitmq_management rabbitmq_delayed_message_exchange