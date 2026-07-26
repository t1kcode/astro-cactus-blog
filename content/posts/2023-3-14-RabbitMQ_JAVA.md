---
title: RabbitMQ_JAVA
abbrlink: e0a3f475
tags: ["RabbitMQ", "消息队列"]
categories: ["封档"]
description: "封档"
publishDate: 2023-03-14 10:31:10
---

# RabbitMQ_JAVA

## 引入依赖

```xml
<!--引入amqp相关依赖-->
<dependency>
    <groupId>com.rabbitmq</groupId>
    <artifactId>amqp-client</artifactId>
    <version>5.13.1</version>
</dependency>
```

## 第一种模型 Hello World!

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

**在上图的模型中，有以下概念：**

- **P：生产者，也就是要发送消息的程序**
- **C：消费者，消息的接收者，会一直等待消息到来**
- **queue：消息队列，图中红色部分，类似一个邮箱，可以缓存消息；生产者向其中投递消息，消费者从其中取出消息**

### 开发生产者

```java
public class Provider
{
    @Test
    public void testSendMessage() throws IOException, TimeoutException
    {
        // 创建连接mq的连接工厂对象
        ConnectionFactory connectionFactory = new ConnectionFactory();
        // 设置连接rabbitMQ的主机地址
        connectionFactory.setHost("127.0.0.1");
        // 设置端口号
        connectionFactory.setPort(5672);
        // 设置连接哪个虚拟主机
        connectionFactory.setVirtualHost("/ems");
        // 设置访问虚拟主机的用户名和密码
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");
        // 获取连接对象
        Connection connection = connectionFactory.newConnection();
        // 获取连接中的通道
        Channel channel = connection.createChannel();

        // 通道绑定对应消息队列
        // 参数1：队列名称，如果队列不存在则自动创建
        // 参数2：用来定义队列特性是否要持久化，true 持久化队列；false 不持久化
        // 参数3：exclusive 是否独占队列，true 独占队列；false 不独占
        // 参数4：autoDelete 是否在消费完成后自动删除队列，true 自动删除，false 不自动删除
        // 参数5：额外附加参数
        channel.queueDeclare("hello", false, false, false, null);

        // 发布消息
        // 参数1：交换机名称
        // 参数2：队列名称
        // 参数3：传递消息额外设置
        // 参数4：消息的具体内容
        channel.basicPublish("", "hello", null, "hello rabbitMQ".getBytes(StandardCharsets.UTF_8));
        channel.close();
        connection.close();
    }
```

### 开发消费者

```java
public class Customer
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        // 创建连接mq的连接工厂对象
        ConnectionFactory connectionFactory = new ConnectionFactory();
        // 设置连接rabbitMQ的主机地址
        connectionFactory.setHost("127.0.0.1");
        // 设置端口号
        connectionFactory.setPort(5672);
        // 设置连接哪个虚拟主机
        connectionFactory.setVirtualHost("/ems");
        // 设置访问虚拟主机的用户名和密码
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        // 获取连接对象
        Connection connection = connectionFactory.newConnection();
        // 获取连接中的通道
        Channel channel = connection.createChannel();

        // 通道绑定对象
        channel.queueDeclare("hello", false, false, false, null);

        // 消费消息
        // 参数1：消费哪个队列的消息，队列名称
        // 参数2：开始消息的自动确认机制
        // 参数3：消费时的回调接口
        channel.basicConsume("hello", true, new DefaultConsumer(channel){

            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
//                LOGGER.info("Delivery result = {}", Arrays.toString(body));
                System.out.println(new String(body));
            }
        });

//        channel.close();
//        connection.close();
    }
}
```

## 第二种模型 Work Queues

**`Work Queues`，也被称为（`Task Queues`），任务模型。当消息处理比较耗时的时候，可能生产消息的速度会远远大于消息的消费速度，长此以往，消息就会堆积得越来越多，无法及时处理。此时就可以使用`Work Queues`模型：让多个消费者绑定到一个队列，共同消费队列中的消息。队列中的消息一旦消费，就会消失，因此任务是不会重复执行的**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

- **P：生产者，任务得发布者**
- **C1：消费者1，领取任务并完成任务，假设完成速度较慢**
- **C2：消费者2，领取任务并完成任务，假设完成速度快**

### 开发生产者

```java
public class Provider
{
    @Test
    public void testSendMessage() throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");
        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();

        channel.queueDeclare("work", true, false, false, null);
        for(int i = 0; i < 20; i++){
            channel.basicPublish("", "work", null, ("hello Work Queues" + i).getBytes(StandardCharsets.UTF_8));
        }
        channel.close();
        connection.close();
    }
}
```

### 开发消费者

```java
public class Customer1
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();

        channel.queueDeclare("work", true, false, false, null);

        channel.basicConsume("work", true, new DefaultConsumer(channel){

            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer1 result = " + new String(body));
            }
        });
    }
}
```

```java
public class Customer2
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();

        channel.queueDeclare("work", true, false, false, null);

        channel.basicConsume("work", true, new DefaultConsumer(channel){

            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer2 result = " + new String(body));
            }
        });
    }
}
```

**默认情况下，RabbitMQ将按顺序将每个消息发送给下一个使用者。平均而言，每个消费者都会收到相同数量的消息，这种分发消息的方式称为循环**

### 消息自动确认机制

```java
public class Customer1
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        final Channel channel = connection.createChannel();

        channel.queueDeclare("work", true, false, false, null);

        // 一次只能接收一条未确认的消息
        channel.basicQos(1);
        // 关闭自动确认消息
        channel.basicConsume("work", false, new DefaultConsumer(channel){

            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                try{
                    Thread.sleep(2000);
                }catch(InterruptedException e){
                    e.printStackTrace();
                }
                System.out.println("Customer1 result = " + new String(body));
                // 参数1：要确认的消息标志
                // 参数2：是否开启多条消息确认
                channel.basicAck(envelope.getDeliveryTag(), false);
            }
        });
    }
}
```

```java
public class Customer2
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        final Channel channel = connection.createChannel();

        channel.queueDeclare("work", true, false, false, null);
        // 一次只能接收一条未确认的消息
        channel.basicQos(1);
        channel.basicConsume("work", false, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer2 result = " + new String(body));
                channel.basicAck(envelope.getDeliveryTag(), false);
            }
        });
    }
}
```

- **设置通道一次只能消费一个消息**

- **关闭消息的自动确认，开启手动确认消息**

## 第三种模型  Publish/Subscribe

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

**在fanout（广播）模式下，消息发送流程是这样的：**

- **可以有多个消费者**
- **每个消费者有自己的queue（队列）**
- **每个队列都要绑定到Exchange（交换机）**
- **生产者发送的消息，只能发送到交换机，交换机来决定要发给哪个队列，生产者无法决定**
- **交换机把消息发送给绑定过的所有队列**
- **队列的消费者都能拿到消息，实现一条消息被多个消费者消费**

### 开发生产者

```java
public class Provider
{
    @Test
    public void testSendMessage() throws IOException, TimeoutException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");
        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();

        // 声明交换机
        // 参数1：交换机名称
        // 参数2：交换机类型，fanout 广播类型
        channel.exchangeDeclare("logs", "fanout");

        // 发送消息
        channel.basicPublish("logs", "", null, "fanout type message".getBytes(StandardCharsets.UTF_8));

        channel.close();
        connection.close();
    }
}
```

### 开发消费者

```java
public class Customer1
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();
        String queueName = channel.queueDeclare().getQueue();
        // 绑定交换机
        channel.queueBind(queueName, "logs", "");
        channel.basicConsume(queueName, true, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer1 result = " + new String(body));
            }
        });
    }
}
```

```java
public class Customer2
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();
        String queueName = channel.queueDeclare().getQueue();
        // 绑定交换机
        channel.queueBind(queueName, "logs", "");
        channel.basicConsume(queueName, true, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer2 result = " + new String(body));
            }
        });
    }
}
```

```java
public class Customer3
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();
        String queueName = channel.queueDeclare().getQueue();
        // 绑定交换机
        channel.queueBind(queueName, "logs", "");
        channel.basicConsume(queueName, true, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer3 result = " + new String(body));
            }
        });
    }
}
```

## 第四种模型 Routing

### Routing之订阅模型-Direct

**在Fanout模式中，一条消息，会被所有订阅的队列都消费。但是，在某些场景下，我们希望不同的消息被不同的队列消费，这时就要用到Direct类型的Exchange**

**在Direct模型下：**

- **队列与交换机的绑定，不能是任意绑定了，而是要指定一个RoutingKey（路由key）**

- **消息的发送方在向Exchange发送消息时，也必须指定消息的RoutingKey**

- **Exchange不再把消息交给每一个绑定的队列，而是根据消息的RoutingKey进行判断，只有队列的RoutingKey与消息的RoutingKey完全一致，才会接收到消息流程：**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

**图解：**

- **P：生产者，向Exchange发送消息，发送消息时，会指定一个RoutingKey**

- **X：Exchange（交换机），接收生产者的消息，然后把消息递交给与RoutingKey完全匹配的队列**

- **C1：消费者，其所在队列制定了需要RoutingKey为error的消息**
- **C2：消费者，其所在队列制定了需要RoutingKey为info、error、warning的消息**

### 开发生产者

```java
public class Provider
{
    @Test
    public void testSendMessage() throws IOException, TimeoutException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");
        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();

        // 声明交换机
        // 参数1：交换机名称
        // 参数2：交换机类型，fanout 广播类型
        channel.exchangeDeclare("logs", "direct");
        // 发送消息
        channel.basicPublish("logs", "info", null, "info info message".getBytes(StandardCharsets.UTF_8));
        channel.basicPublish("logs", "warning", null, "warning info message".getBytes(StandardCharsets.UTF_8));
        channel.basicPublish("logs", "error", null, "error info message".getBytes(StandardCharsets.UTF_8));

        channel.close();
        connection.close();
    }
}
```

### 开发消费者

```java
public class Customer1
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();
        String queueName = channel.queueDeclare().getQueue();
        // 绑定交换机
        channel.queueBind(queueName, "logs", "info");
        channel.queueBind(queueName, "logs", "warning");
        channel.queueBind(queueName, "logs", "error");

        channel.basicConsume(queueName, true, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer1 result = " + new String(body));
            }
        });
    }
}
```

```java
public class Customer2
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();
        String queueName = channel.queueDeclare().getQueue();
        // 绑定交换机
        channel.queueBind(queueName, "logs", "warning");
        channel.basicConsume(queueName, true, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer2 result = " + new String(body));
            }
        });
    }
}
```

```java
public class Customer3
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();
        String queueName = channel.queueDeclare().getQueue();
        // 绑定交换机
        channel.queueBind(queueName, "logs", "error");
        channel.basicConsume(queueName, true, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer3 result = " + new String(body));
            }
        });
    }
}
```

### Routing之订阅模型-Topic

**Topic类型的Exchange与Direct相比，都是可以根据RoutingKey把消息路由到不同的队列，只不过Topic类型Exchange可以让队列在绑定RoutingKey的时候使用统配符。这种模型RoutingKey一般都是由一个或多个单词组成，多个单词之间以"."分割，例如：item.insert**

![](imagehttps://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

> **# 通配符**
>
> ​	**\*（star）can substitute for exactly one word.	匹配1个词**
>
> ​	**#（hash）can substitute for zero or more words.	匹配0个或多个词**
>
> **# 如：**
>
> ​	**audit.# 匹配audit.irs.corporate或者audit.irs等**
>
> ​	**audit.\* 只能匹配audit.irs等**

#### 开发生产者

```java
public class Provider
{
    @Test
    public void testSendMessage() throws IOException, TimeoutException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");
        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();

        // 声明交换机
        // 参数1：交换机名称
        // 参数2：交换机类型，fanout 广播类型
        channel.exchangeDeclare("logs", "topic");
        // 发送消息
        channel.basicPublish("logs", "log", null, "log info message".getBytes(StandardCharsets.UTF_8));
        channel.basicPublish("logs", "log.info", null, "log.info info message".getBytes(StandardCharsets.UTF_8));
        channel.basicPublish("logs", "log.warning", null, "log.warning info message".getBytes(StandardCharsets.UTF_8));
        channel.basicPublish("logs", "log.error", null, "log.error info message".getBytes(StandardCharsets.UTF_8));
        channel.basicPublish("logs", "log.info.result", null, "log.info.result info message".getBytes(StandardCharsets.UTF_8));
        
        channel.close();
        connection.close();
    }
}
```

#### 开发消费者

```java
public class Customer1
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();
        // 声明交换机，如交换机不存在，则创建
        channel.exchangeDeclare("logs", "topic");
        String queueName = channel.queueDeclare().getQueue();
        // 绑定交换机
        channel.queueBind(queueName, "logs", "log.#");

        channel.basicConsume(queueName, true, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer1 result = " + new String(body));
            }
        });
    }
}
```

```java
public class Customer2
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();
        String queueName = channel.queueDeclare().getQueue();
        // 绑定交换机
        channel.queueBind(queueName, "logs", "log.*");
        channel.basicConsume(queueName, true, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer2 result = " + new String(body));
            }
        });
    }
}
```

```java
public class Customer3
{
    public static void main(String[] args) throws IOException, TimeoutException
    {
        ConnectionFactory connectionFactory = new ConnectionFactory();
        connectionFactory.setHost("127.0.0.1");
        connectionFactory.setPort(5672);
        connectionFactory.setVirtualHost("/ems");
        connectionFactory.setUsername("mall");
        connectionFactory.setPassword("mall");

        Connection connection = connectionFactory.newConnection();
        Channel channel = connection.createChannel();
        String queueName = channel.queueDeclare().getQueue();
        // 绑定交换机
        channel.queueBind(queueName, "logs", "*.info.*");
        channel.basicConsume(queueName, true, new DefaultConsumer(channel){
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope, AMQP.BasicProperties properties,
                                       byte[] body) throws IOException
            {
                System.out.println("Customer3 result = " + new String(body));
            }
        });
    }
}
```

**注：如果不指定交换机，生产者会将消息发布给AMQP default交换机；而每一个队列，无论后天绑定了哪个交换机，先天会默认绑定AMQP default交换机（无法解绑，这个交换机也无法被删除）；而这个交换机的匹配方式，是通过生产者的routingKey匹配队列的queue name；这就解释了为什么不指定交换机时，会发送给名称为routingKey的队列。
在RabbitMQ的web管理端中，点进AMQP default交换机，会看到他的介绍。
The default exchange is implicitly bound to every queue, with a routing key equal to the queue name. It is not possible to explicitly bind to, or unbind from the default exchange. It also cannot be deleted.**
