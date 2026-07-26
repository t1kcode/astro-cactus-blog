---
title: RabbitMQ_JAVA
abbrlink: e0a3f475
tags: ["RabbitMQ", "消息队列"]
categories: ["封档"]
description: "封档"
publishDate: 2023-03-15 22:04:10
---

# Mall整合RabbitMQ

> **RabbitMQ是最受欢迎的开源消息中间件之一，在全球范围内被广泛使用。RabbitMQ是轻量级且易于部署的，能支持多种消息协议，RabbitMQ可以部署在分布式系统中，以满足大规模、高可用的要求**

## RabbitMQ的消息模型

### 路由模式

![](imagehttps://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

|   标志   |     中文名     |    英文名    |                         描述                         |
| :------: | :------------: | :----------: | :--------------------------------------------------: |
|  **P**   |   **生产者**   | **Producer** |       **消息的发送者，可以将消息发送到交换机**       |
|  **C**   |   **消费者**   | **Consumer** |      **消息的接收者，从队列中获取消息进行消费**      |
|  **X**   |   **交换机**   | **Exchange** | **接收生产者发送的消息，并根据路由键发送给指定队列** |
|  **Q**   |    **队列**    |  **Queue**   |              **存储从交换机发来的消息**              |
| **type** | **交换机类型** |   **type**   | **direct表示直接根据路由键（orange/black）发送消息** |

## 整合RabbitMQ实现延迟消息

### 业务场景说明

> **用于解决用户下单以后，订单超时如何取消订单的问题**

- **用户进行下单操作（会有锁定商品库存、使用优惠券、积分一系列的操作）**

- **生成订单，获取订单的id**

- **获取到设置的订单超时时间（假设设置的为30分钟不支付就取消订单）**

- **按订单超时时间发送一个延迟消息给RabbitMQ，让它在订单超时后触发取消订单的操作**

- **如果用户没有支付，进行取消订单操作（释放锁定商品库存、返还优惠券、返回积分一系列操作）**

### 在pom.xml中添加相关依赖

```xml
<!--消息队列相关依赖-->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
<!--lombok依赖-->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

### 添加消息队列的枚举配置类QueueEnum

> **用于延迟消息队列及处理取消订单消息队列的常量定义，包括交换机名称、队列名称、路由键名称**

```java
/**
 * 消息队列枚举配置
 */
@Getter
public enum QueueEnum
{
    /**
     * 消息通知队列
     */
    QUEUE_ORDER_CANCEL("mall.order.direct", "mall.order.cancel", "mall.order.cancel"),
    /**
     * 消息通知ttl队列
     */
    QUEUE_TTL_ORDER_CANCEL("mall.order.direct.ttl", "mall.order.cancel.ttl", "mall.order.cancel.ttl");

    /**
     * 交换机名称
     */
    private final String exchange;
    /**
     * 队列名称
     */
    private final String name;
    /**
     * 路由键
     */
    private final String routeKey;

    QueueEnum(String exchange, String name, String routeKey)
    {
        this.exchange = exchange;
        this.name = name;
        this.routeKey = routeKey;
    }
}
```

### 添加RabbitMQ的配置

> **用于配置交换机、队列及队列与交换机的绑定关系**

```java
/**
 * 消息队列配置
 */
@Configuration
public class RabbitMqConfig
{

    /**
     * 订单消息实际消费队列所绑定的交换机
     */
    @Bean
    DirectExchange orderDirect()
    {
        return ExchangeBuilder
                .directExchange(QueueEnum.QUEUE_ORDER_CANCEL.getExchange())
                .durable(true)
                .build();
    }

    /**
     * 订单延迟队列队列所绑定的交换机
     */
    @Bean
    DirectExchange orderTtlDirect()
    {
        return ExchangeBuilder
                .directExchange(QueueEnum.QUEUE_TTL_ORDER_CANCEL.getExchange())
                .durable(true)
                .build();
    }

    /**
     * 订单实际消费队列
     */
    @Bean
    public Queue orderQueue()
    {
        return new Queue(QueueEnum.QUEUE_ORDER_CANCEL.getName());
    }

    /**
     * 订单延迟队列（死信队列）
     */
    @Bean
    public Queue orderTtlQueue()
    {
        return QueueBuilder.durable(QueueEnum.QUEUE_TTL_ORDER_CANCEL.getName())
                           .withArgument("x-dead-letter-exchange",
                                         QueueEnum.QUEUE_ORDER_CANCEL.getExchange())//到期后转发的交换机
                           .withArgument("x-dead-letter-routing-key",
                                         QueueEnum.QUEUE_ORDER_CANCEL.getRouteKey())//到期后转发的路由键
                           .build();
    }

    /**
     * 将订单队列绑定到交换机
     */
    @Bean
    Binding orderBinding(DirectExchange orderDirect, Queue orderQueue)
    {
        return BindingBuilder.bind(orderQueue)
                             .to(orderDirect)
                             .with(QueueEnum.QUEUE_ORDER_CANCEL.getRouteKey());
    }

    /**
     * 将订单延迟队列绑定到交换机
     */
    @Bean
    Binding orderTtlBinding(DirectExchange orderTtlDirect, Queue orderTtlQueue)
    {
        return BindingBuilder.bind(orderTtlQueue)
                             .to(orderTtlDirect)
                             .with(QueueEnum.QUEUE_TTL_ORDER_CANCEL.getRouteKey());
    }
}
```

**在RabbitMQ管理页面可以看到以下交换机和队列**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png/RabbitMQ/自定义的交换机.jpg)

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

### 交换机及队列说明

- **mall.order.direct（取消订单消息队列所绑定的交换机），绑定的队列为mall.order.cacel，一旦有消息以mall.order.cancel为路由键发送过来，就会发送到此队列**
- **mall.order.direct.ttl（订单延迟消息队列所绑定的交换机），绑定的队列为mall.order.cancel.ttl，一旦有消息以mall.order.cancel.ttl为路由键发送过来，就会转发到此队列，并在此队列保存一定时间，等到超时后会自动将消息发送到mall.order.cancel（取消订单消息消费队列）**

### 添加延迟消息的发送者CancelOrderSender

> **用于向订单延迟消息队列（mall.order.cancel.ttl）发送消息**

```java
/**
 * 取消订单消息的发出者
 */
@Component
public class CancelOrderSender
{
    private static final Logger LOGGER = LoggerFactory.getLogger(CancelOrderSender.class);

    @Resource
    private AmqpTemplate amqpTemplate;

    public void sendMessage(Long orderId, final long delayTimes)
    {
        //给延迟队列发送消息
        amqpTemplate.convertAndSend(QueueEnum.QUEUE_TTL_ORDER_CANCEL.getExchange(),
                                    QueueEnum.QUEUE_TTL_ORDER_CANCEL.getRouteKey(),
                                    orderId,
                                    message -> {
                                        //给消息设置延迟毫秒值
                                        message.getMessageProperties()
                                               .setExpiration(String.valueOf(delayTimes));
                                        return message;
                                    });
        LOGGER.info("send delay message orderId:{}", orderId);
    }
}
```

### 添加取消订单消息的接收者CancelOrderReceiver

> **用于从取消订单的消息队列（mall.order.cancel）里接收消息**

```java
/**
 * 取消订单消息的处理者
 */
@Component
@RabbitListener(queues = "mall.order.cancel")
public class CancelOrderReceiver
{
    private static final Logger LOGGER = LoggerFactory.getLogger(CancelOrderReceiver.class);

    @Resource
    private OmsPortalOrderService portalOrderService;

    @RabbitHandler
    public void handle(Long orderId)
    {
        LOGGER.info("receive delay message orderId:{}", orderId);
        portalOrderService.cancelOrder(orderId);
    }
}
```

### 添加OmsPortalOrderService接口

```java
public interface OmsPortalOrderService
{
    /**
     * 根据提交信息生成订单
     */
    @Transactional
    CommonResult generateOrder(OrderParam orderParam);

    /**
     * 取消单个超时订单
     */
    @Transactional
    void cancelOrder(Long orderId);
}
```

### 添加OmsPortalOrderService的实现类OmsPortalOrderServiceImpl

```java
/**
 * 前台订单管理Service
 */
@Service
public class OmsPortalOrderServiceImpl implements OmsPortalOrderService
{
    private static final Logger LOGGER = LoggerFactory.getLogger(OmsPortalOrderServiceImpl.class);

    @Resource
    private CancelOrderSender cancelOrderSender;

    @Override
    public CommonResult generateOrder(OrderParam orderParam)
    {
        //todo 执行一系列下单操作，具体参考mall项目
        LOGGER.info("process generateOrder");
        //下单完成后开启一个延迟消息，用于当用户没有付款时取消订单（orderId应该在下单后生成）
        sendDelayMessageCancelOrder(11L);
        return CommonResult.success(null, "下单成功");
    }

    @Override
    public void cancelOrder(Long orderId)
    {
        //todo 执行一系类取消订单操作，具体参考mall项目
        LOGGER.info("process cancelOrder orderId:{}", orderId);
    }

    private void sendDelayMessageCancelOrder(Long orderId)
    {
        //获取订单超时时间，假设为60分钟
        long delayTimes = 30 * 1000;

        //发送延迟消息
        cancelOrderSender.sendMessage(orderId, delayTimes);
    }
}
```

### 添加OmsPortalOrderController定义接口

```java
/**
 * 订单管理Controller
 */
@Controller
@RequestMapping("/order")
public class OmsPortalOrderController
{
    @Resource
    private OmsPortalOrderService portalOrderService;

    @RequestMapping(value = "/generateOrder", method = RequestMethod.POST)
    @ResponseBody
    public Object generateOrder(@RequestBody OrderParam orderParam)
    {
        return portalOrderService.generateOrder(orderParam);
    }
}
```

## 进行接口测试

### 调用下单接口

> **已将延迟消息时间设置为30秒**

![](imagehttps://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

## RabbitMQ的五种核心消息模式

### 相关概念

**这里以五种消息模式中的`路由模式`为例**

![](imagehttps://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)
|    标志    |      中文名       |    英文名    |                         描述                         |
| :--------: | :---------------: | :----------: | :--------------------------------------------------: |
|   **P**    |    **生产者**     | **Producer** |       **消息的发送者，可以将消息发送到交换机**       |
|   **C**    |    **消费者**     | **Consumer** |      **消息的接收者，从队列中获取消息进行消费**      |
|   **X**    |    **交换机**     | **Exchange** | **接收生产者发送的消息，并根据路由键发送给指定队列** |
|   **Q**    |     **队列**      |  **Queue**   |              **存储从交换机发来的消息**              |
|  **type**  |  **交换机类型**   |   **type**   | **direct表示直接根据路由键（orange/black）发送消息** |
| **fanout** | **发布/订阅模式** |  **fanout**  |          **广播消息给所有绑定交换机的队列**          |
| **direct** |   **路由模式**    |  **direct**  |                **根据路由键发送消息**                |
| **topic**  |  **通配符模式**   |  **topic**   |           **根据路由键的匹配规则发送消息**           |

### 五种消息模式

#### 简单模式

> **简单模式包含一个生产者、一个消费者和一个队列，生产者向队列里发送消息，消费者从队列中获取消息并消费**

##### 模式示意图

![](imagehttps://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

##### Sping AMQP实现

- **首先要在`pom.xml`中添加Spring AMQP的相关依赖**

```xml
<!--Spring AMQP依赖-->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

- **然后修改`application.yml`，添加RabbitMQ的相关配置**

```yaml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    virtual-host: /mall
    username: mall
    password: mall
    publisher-confirms: true #消息发送到交换器确认
    publisher-returns: true #消息发送到队列确认
```

- **添加`简单模式`相关JAVA配置，创建一个名为`simple.hello`的队列，一个生产者和一个消费者**

```java
@Configuration
public class SimpleRabbitConfig
{

	// 自动注入simple.hello队列
    @Bean
    public Queue hello()
    {
        return new Queue("simple.hello");
    }

    @Bean
    public SimpleSender simpleSender()
    {
        return new SimpleSender();
    }

    @Bean
    public SimpleReceiver simpleReceiver()
    {
        return new SimpleReceiver();
    }
}
```

- **生产者通过send方法向队列simple.hello中发送消息**

```java
public class SimpleSender
{
    private static final Logger LOGGER = LoggerFactory.getLogger(SimpleSender.class);

    @Resource
    private RabbitTemplate template;

    private static final String queueName = "simple.hello";

    public void send()
    {
        String message = "Hello World!";
        this.template.convertAndSend(queueName, message);
        LOGGER.info(" [x] Sent '{}'", message);
    }
}
```

- **消费者从队列simple.hello中获取消息**

```java
@RabbitListener(queues = "simple.hello")
public class SimpleReceiver
{
    private static final Logger LOGGER = LoggerFactory.getLogger(SimpleReceiver.class);

    @RabbitHandler
    public void receive(String in)
    {
        LOGGER.info(" [x] Received '{}'", in);
    }
}
```

- **在controller中添加测试接口，调用该接口开发发送消息**

```java
@Controller
@RequestMapping("/rabbit")
public class RabbitController
{
    @Resource
    private SimpleSender simpleSender;

    @RequestMapping(value = "/simple", method = RequestMethod.GET)
    @ResponseBody
    public CommonResult simpleTest()
    {
        for(int i = 0; i < 10; i++){
            simpleSender.send();
            ThreadUtil.sleep(1000);
        }
        return CommonResult.success(null);
    }
}
```

#### 工作模式

> **工作模式是指向多个互相竞争的消费者发送消息的模式，它包含一个生产者、两个消费者和一个队列，两个消费者同时绑定到一个队列上去，当消费者获取消息处理耗时任务时，空闲的消费者从队列中获取并消费消息**

##### 模式示意图

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

##### Spring AMQP实现

- **添加工作模式相关JAVA配置，创建一个名为work.hello的队列，一个生产者和两个消费者**

```java
@Configuration
public class WorkRabbitConfig
{
    @Bean
    public Queue workQueue()
    {
        return new Queue("work.hello");
    }

    @Bean
    public WorkReceiver workReceiver1()
    {
        return new WorkReceiver(1);
    }

    @Bean
    public WorkReceiver workReceiver2()
    {
        return new WorkReceiver(2);
    }

    @Bean
    public WorkSender workSender()
    {
        return new WorkSender();
    }
}
```

- **生产者通过send方法向队列work.hello中发送消息，消息中包含一定数量的`.`号**

```java
public class WorkSender
{
    private static final Logger LOGGER = LoggerFactory.getLogger(WorkSender.class);

    @Resource
    private RabbitTemplate template;

    private static final String queueName = "work.hello";

    public void send(int index)
    {
        StringBuilder builder = new StringBuilder("Hello");
        int limitIndex = index % 3 + 1;
        for(int i = 0; i < limitIndex; i++){
            builder.append('.');
        }
        builder.append(index + 1);
        String message = builder.toString();
        template.convertAndSend(queueName, message);
        LOGGER.info(" [x] Sent '{}'", message);
    }
}
```

- **两个消费者从队列work.hello中获取消息，名称分别为instance1和instance2，消息中包含`.`号越多，耗时越长**

```java
@RabbitListener(queues = "work.hello")
public class WorkReceiver
{
    private static final Logger LOGGER = LoggerFactory.getLogger(WorkReceiver.class);

    private final int instance;

    public WorkReceiver(int i)
    {
        this.instance = i;
    }

    @RabbitHandler
    public void receive(String in)
    {
        StopWatch watch = new StopWatch();
        watch.start();
        LOGGER.info("instance {} [x] Received '{}'", this.instance, in);
        doWork(in);
        watch.stop();
        LOGGER.info("instance {} [x] Done in {}s", this.instance, watch.getTotalTimeSeconds());
    }

    private void doWork(String in)
    {
        for(char ch : in.toCharArray()){
            if(ch == '.'){
                ThreadUtil.sleep(1000);
            }
        }
    }
}
```

- **在controller中添加测试接口，调用该接口开始发送消息**

```java
@RequestMapping(value = "/work", method = RequestMethod.GET)
@ResponseBody
public CommonResult workTest()
{
    for(int i = 0; i < 10; i++){
        workSender.send(i);
        ThreadUtil.sleep(1000);
    }
    return CommonResult.success(null);
}
```

- **运行后可以发现生产者往队列中发送包含不同数量`.`号的消息，instance1和instance2消费者互相竞争，分别消费了一部分消息**

#### 发布/订阅模式

> **发布/订阅模式是指同时向多个消费者发送消息的模式（类似广播的形式），它包含一个生产者、两个消费者、两个队列和一个交换机。两个消费者同时绑定到不同的队列上去，两个队列绑定到交换机上去，生产者通过发送消息到交换机，所有消费者接收并消费消息**

##### 模式示意图

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

##### Spring AMQP实现

- **添加发布/订阅模式相关JAVA配置，创建一个名为exchange.fanout的交换机、一个生产者、两个消费者和两个匿名队列，将两个匿名队列都绑定到交换机**

```java
@Configuration
public class FanoutRabbitConfig
{
    @Bean
    public FanoutExchange fanout()
    {
        return new FanoutExchange("exchange.fanout");
    }

    @Bean
    public Queue fanoutQueue1()
    {
        return new AnonymousQueue();
    }

    @Bean
    public Queue fanoutQueue2()
    {
        return new AnonymousQueue();
    }

    @Bean
    public Binding fanoutBinding1(FanoutExchange fanout, Queue fanoutQueue1)
    {
        return BindingBuilder.bind(fanoutQueue1).to(fanout);
    }

    @Bean
    public Binding fanoutBinding2(FanoutExchange fanout, Queue fanoutQueue2)
    {
        return BindingBuilder.bind(fanoutQueue2).to(fanout);
    }

    @Bean
    public FanoutReceiver fanoutReceiver()
    {
        return new FanoutReceiver();
    }

    @Bean
    public FanoutSender fanoutSender()
    {
        return new FanoutSender();
    }
}
```

- **生产者通过send方法向交换机exchange.fanout中发送消息，消息中包含一定数量的`.`号**

```java
public class FanoutSender
{
    private static final Logger LOGGER = LoggerFactory.getLogger(FanoutSender.class);

    @Resource
    private RabbitTemplate template;

    private static final String exchangeName = "exchange.fanout";

    public void send(int index)
    {
        StringBuilder builder = new StringBuilder("Hello");
        int limitIndex = index % 3 + 1;
        for(int i = 0; i < limitIndex; i++){
            builder.append('.');
        }
        builder.append(index + 1);
        String message = builder.toString();
        template.convertAndSend(exchangeName, "", message);
        LOGGER.info(" [x] Sent '{}'", message);
    }
}
```

- **消费者从绑定的匿名队列中获取消息，消息中包含`.`号越多，耗时越长，由于该消费者可以从两个队列中获取并消费消息，可以看做两个消费者，名称分别为instance1和instance2**

```java
public class FanoutReceiver
{
    private static final Logger LOGGER = LoggerFactory.getLogger(FanoutReceiver.class);

    @RabbitListener(queues = "#{fanoutQueue1.name}")
    public void receive1(String in)
    {
        receive(in, 1);
    }

    @RabbitListener(queues = "#{fanoutQueue2.name}")
    public void receive2(String in)
    {
        receive(in, 2);
    }

    private void receive(String in, int receiver)
    {
        StopWatch watch = new StopWatch();
        watch.start();
        LOGGER.info("instance {} [x] Received '{}'", receiver, in);
        doWork(in);
        watch.stop();
        LOGGER.info("instance {} [x] Done in {}s", receiver, watch.getTotalTimeSeconds());
    }

    private void doWork(String in)
    {
        for(char ch : in.toCharArray()){
            if(ch == '.'){
                ThreadUtil.sleep(1000);
            }
        }
    }
}
```

- **在controller中添加测试接口，调用该接口开始发送消息**

```java
@RequestMapping(value = "/fanout", method = RequestMethod.GET)
@ResponseBody
public CommonResult fanoutTest()
{
    for(int i = 0; i < 10; i++){
        fanoutSender.send(i);
        ThreadUtil.sleep(1000);
    }
    return CommonResult.success(null);
}
```

#### 路由模式

> **路由模式是可以根据路由键选择性给多个消费者发送消息的模式，它包含一个生产者、两个消费者、两个队列和一个交换机。两个消费者同时绑定到不同的队列上去，两个队列通过路由键绑定到交换机上去，生产者发送消息到交换机，交换机通过路由键转发到不同队列，队列绑定的消费者接收并消费消息**

##### 模式示意图

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

##### Spring AMQP实现

- **添加路由模式相关JAVA配置，创建一个名为exchange.direct的交换机、一个生产者、两个消费者和两个匿名队列，队列通过路由键都绑定到交换机，队列1的路由键为info、error和warning，队列2的路由键为error和warning**

```java
@Configuration
public class DirectRabbitConfig
{
    @Bean
    public DirectExchange direct()
    {
        return new DirectExchange("exchange.direct");
    }

    @Bean
    public Queue directQueue1()
    {
        return new AnonymousQueue();
    }

    @Bean
    public Queue directQueue2()
    {
        return new AnonymousQueue();
    }

    @Bean
    public Binding directBinding1a(DirectExchange direct, Queue directQueue1)
    {
        return BindingBuilder.bind(directQueue1).to(direct).with("info");
    }

    @Bean
    public Binding directBinding1b(DirectExchange direct, Queue directQueue1)
    {
        return BindingBuilder.bind(directQueue1).to(direct).with("warning");
    }

    @Bean
    public Binding directBinding1c(DirectExchange direct, Queue directQueue1)
    {
        return BindingBuilder.bind(directQueue1).to(direct).with("error");
    }

    @Bean
    public Binding directBinding2a(DirectExchange direct, Queue directQueue2)
    {
        return BindingBuilder.bind(directQueue2).to(direct).with("warning");
    }

    @Bean
    public Binding directBinding2b(DirectExchange direct, Queue directQueue2)
    {
        return BindingBuilder.bind(directQueue2).to(direct).with("error");
    }

    @Bean
    public DirectReceiver receiver()
    {
        return new DirectReceiver();
    }

    @Bean
    public DirectSender directSender()
    {
        return new DirectSender();
    }
}
```

- **生产者通过send方法像交换机exchange.direct中发送消息，发送时使用不同的路由键，根据路由键会被转发到不同的队列**

```java
public class DirectSender
{
    @Resource
    private RabbitTemplate template;

    private static final String exchangeName = "exchange.direct";

    private final String[] keys = {"info", "warning", "error"};

    private static final Logger LOGGER = LoggerFactory.getLogger(DirectSender.class);

    public void send(int index)
    {
        StringBuilder builder = new StringBuilder("Hello to ");
        int limitIndex = index % 3;
        String key = keys[limitIndex];
        builder.append(key).append(' ');
        builder.append(index + 1);
        String message = builder.toString();
        template.convertAndSend(exchangeName, key, message);
        LOGGER.info(" [x] Sent '{}'", message);
    }
}
```

- **消费者从自己绑定的匿名队列中获取消息，由于该消费者可以从两个队列中获取并消费消息，可以看做两个消费者，名称分别为instance1和instance2**

```java
public class DirectReceiver
{
    private static final Logger LOGGER = LoggerFactory.getLogger(DirectReceiver.class);

    @RabbitListener(queues = "#{directQueue1.name}")
    public void receive1(String in)
    {
        receive(in, 1);
    }

    @RabbitListener(queues = "#{directQueue2.name}")
    public void receive2(String in)
    {
        receive(in, 2);
    }

    private void receive(String in, int receiver)
    {
        StopWatch watch = new StopWatch();
        watch.start();
        LOGGER.info("instance {} [x] Received '{}'", receiver, in);
        doWork(in);
        watch.stop();
        LOGGER.info("instance {} [x] Done in {}s", receiver, watch.getTotalTimeSeconds());
    }

    private void doWork(String in)
    {
        for(char ch : in.toCharArray()){
            if(ch == '.'){
                ThreadUtil.sleep(1000);
            }
        }
    }
}
```

- **在controller中添加测试接口，调用该接口开始发送消息**

```java
@RequestMapping(value = "/direct", method = RequestMethod.GET)
@ResponseBody
public CommonResult directTest()
{
    for(int i = 0; i < 10; i++){
        directSender.send(i);
        ThreadUtil.sleep(1000);
    }
    return CommonResult.success(null);
}
```

#### 通配符模式

> **通配符模式是可以根据路由键匹配规则选择性给多个消费者发送消息的模式，它包含一个生产者、两个消费者、两个队列和一个交换机。两个消费者同时绑定到不同的队列上去，两个队列通过路由键匹配规则绑定到交换机上去，生产者发送消息到交换机，交换机通过路由键匹配规则转发到不同队列，队列绑定的消费者接收并消费消息**

##### 特殊匹配福豪

- **\*：只能匹配一个单词**
- **#：可以匹配零个或多个单词**

##### 模式示意图

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

##### Spring AMQP实现

- **添加通配符模式相关JAVA配置，创建一个名为exchange.topic的交换机、一个生产者、两个消费者和两个匿名队列，匹配\*.orange.\*和\*.\*.rabbit发送到队列1，匹配lazy.#发送到队列2**

```java
@Configuration
public class TopicRabbitConfig
{
    @Bean
    public TopicExchange topic()
    {
        return new TopicExchange("exchange.topic");
    }

    @Bean
    public Queue topicQueue1()
    {
        return new AnonymousQueue();
    }

    @Bean
    public Queue topicQueue2()
    {
        return new AnonymousQueue();
    }

    @Bean
    public Binding topicBinding1a(TopicExchange topic, Queue topicQueue1)
    {
        return BindingBuilder.bind(topicQueue1).to(topic).with("*.orange.*");
    }

    @Bean
    public Binding topicBinding1b(TopicExchange topic, Queue topicQueue1)
    {
        return BindingBuilder.bind(topicQueue1).to(topic).with("*.*.rabbit");
    }

    @Bean
    public Binding topicBinding2a(TopicExchange topic, Queue topicQueue2)
    {
        return BindingBuilder.bind(topicQueue2).to(topic).with("lazy.#");
    }

    @Bean
    public TopicReceiver topicReceiver()
    {
        return new TopicReceiver();
    }

    @Bean
    public TopicSender topicSender()
    {
        return new TopicSender();
    }
}
```

- **生产者通过`send方法`向交换机`exchange.topic`中发送消息，消息中包含不同的`路由键`**

```java
public class TopicSender
{
    @Resource
    private RabbitTemplate template;

    private static final String exchangeName = "exchange.topic";

    private static final Logger LOGGER = LoggerFactory.getLogger(TopicSender.class);

    private final String[] keys = {"quick.orange.rabbit", "lazy.orange.elephant",
                                   "quick.orange.fox", "lazy.brown.fox", "lazy.pink.rabbit",
                                   "quick.brown.fox"};

    public void send(int index)
    {
        StringBuilder builder = new StringBuilder("Hello to ");
        int limitIndex = index % keys.length;
        String key = keys[limitIndex];
        builder.append(key).append(' ');
        builder.append(index + 1);
        String message = builder.toString();
        template.convertAndSend(exchangeName, key, message);
        LOGGER.info(" [x] Sent '{}'", message);
        System.out.println(" [x] Sent '" + message + "'");
    }
}
```

- **消费者从自己绑定的匿名队列中获取消息，由于该消费者可以从两个队列中获取并消费消息，可以看做两个消费者，名称分别为`instance 1`和`instance 2`**

```java
public class TopicReceiver
{
    private static final Logger LOGGER = LoggerFactory.getLogger(TopicReceiver.class);

    @RabbitListener(queues = "#{topicQueue1.name}")
    public void receive1(String in)
    {
        receive(in, 1);
    }

    @RabbitListener(queues = "#{topicQueue2.name}")
    public void receive2(String in)
    {
        receive(in, 2);
    }

    public void receive(String in, int receiver)
    {
        StopWatch watch = new StopWatch();
        watch.start();
        LOGGER.info("instance {} [x] Received '{}'", receiver, in);
        doWork(in);
        watch.stop();
        LOGGER.info("instance {} [x] Done in {}s", receiver, watch.getTotalTimeSeconds());
    }

    private void doWork(String in)
    {
        for(char ch : in.toCharArray()){
            if(ch == '.'){
                ThreadUtil.sleep(1000);
            }
        }
    }
}
```

- **在controller中添加测试接口，调用该接口开始发送消息**

```java
@RequestMapping(value = "/topic", method = RequestMethod.GET)
@ResponseBody
public CommonResult topicTest()
{
    for(int i = 0; i < 10; i++){
        topicSender.send(i);
        ThreadUtil.sleep(1000);
    }
    return CommonResult.success(null);
}
```

