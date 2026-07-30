---
title: ElasticSearch
abbrlink: d48132d3
tags: ["ES"]
categories: ["封档"]
description: "封档"
publishDate: 2023-03-05 19:43:10
---

# ElasticSearch

## 基本操作

### 索引

#### 查看索引

```markdown
# 查看所有索引
GET /_cat/indices
# 查看所有索引，并且有字段说明
GET /_cat/indices?v

# 查看某个映射的索引 mapping
GET /products/_mapping
```

#### 创建索引

```markdown
# 创建一个名字为products的索引
PUT /products

# number_of_shards 指定主分片的数量
# number_of_replicas 指定副分片的数量
# 设置配置创建索引
PUT /orders
{
  "settings": {
    "number_of_shards": 1, 
    "number_of_replicas": 0 
  }
}

# 创建商品索引products，指定mapping {id, title, price, created_at, description}
PUT /products 
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  
  "mappings": {
    "properties": {
      "id":{
        "type": "integer"
      },
      "title":{
        "type": "keyword"
      },
      "price":{
        "type": "double"
      },
      "created_at":{
        "type": "date"
      },
      "description":{
        "type": "text"
      }
    }
  }
}
```

#### 删除索引

```markdown
# 删除名为products的索引
DELETE /products
```

### 文档

#### 创建文档

```markdown
# 创建文档，指定_id
POST /products/_doc/1
{
  "id": 1,
  "title": "小浣熊",
  "price": "0.5",
  "created_at": "2023-03-03",
  "description": "小浣熊真好吃"
}

# 创建文档，自动生成_id Pkmop4YBHIQlzHh1b96_
POST /products/_doc/
{
  "title": "康师傅",
  "price": "2.5",
  "created_at": "2023-03-03",
  "description": "康师傅也不错"
}
```

#### 查看文档

```markdown
# 查看文档
GET /products/_doc/1
GET /products/_doc/Pkmop4YBHIQlzHh1b96_
```

#### 删除文档

```markdown
# 删除文档
DELETE /products/_doc/Pkmop4YBHIQlzHh1b96_
```

#### 更新文档

```markdown
# 更新文档 （注意：该方式会删除原始文档，再重新添加，可以传递全部字段进行更新）
PUT /products/_doc/Pkmop4YBHIQlzHh1b96_
{
  "title": "统一",
  "price": "2.5",
  "created_at": "2023-03-03",
  "description": "统一也不错"
}

# 更新文档，指定字段进行更新
POST /products/_doc/Pkmop4YBHIQlzHh1b96_/_update
{
  "doc":{
    "description":"统一也还行"
  }
}
```

#### 文档批量操作

```markdown
# 文档批量操作，_bulk，数据必须放在同一行
POST /products/_doc/_bulk
{"index": {"_id": 2}}
  {"id": 2,"title": "中浣熊","price": "0.5","created_at": "2023-03-03","description": "中浣熊真好吃"}
{"index": {"_id": 3}}
  {"id": 3,"title": "大浣熊","price": "0.5","created_at": "2023-03-03","description": "大浣熊真好吃"}
  
# 文档批量操作 添加 更新 删除
POST /products/_doc/_bulk
{"index": {"_id": 4}}
  {"id": 2,"title": "超大浣熊","price": "0.5","created_at": "2023-03-03","description": "超大浣熊真好吃"}
{"update": {"_id": 3}}
  {"doc": {"title": "浣熊"}}
{"delete": {"_id": 2}}
```

**注意：在文档批量操作中，每条语句之间是独立运行的，一条语句失败不会影响后续语句的执行结果**

## 高级查询

### 说明

> **ES中提供了一种强大的检索数据方式，这种检索方式称之为`Query DSL`<Domain Specified Language>，`Query DSL`是利用`Rest API传递JSON格式的请求体(Request Body)数据`与ES进行交互，这种方式的`丰富查询语法`让ES检索变得`更强大，更简洁`**

### 语法

```markdown	
# GET /索引名/_doc/_search {json格式请求体数据}
# GET /索引名/_search {json格式请求体数据}
```

- **测试数据**

```markdown
# Query DSL 语法
# 查询所有 match_all
GET /products/_doc/_search
{
  "query": {
    "match_all": {}
  }
}

GET /products/_search
{
  "query": {
    "match_all": {}
  }
}
```

- **返回结果**

```markdown
{
  "took" : 5, # 从执行到返回的时间，单位ms
  "timed_out" : false, # 代表是否超时
  "_shards" : { # 当前索引的分片信息
    "total" : 1,
    "successful" : 1,
    "skipped" : 0,
    "failed" : 0
  },
  "hits" : { # 查询的结果对象
    "total" : {
      "value" : 4, # 符合条件的总记录数
      "relation" : "eq"
    },
    "max_score" : 1.0, # 搜索文档的最大得分
    "hits" : [ # 返回的结果数据数组
      {
        "_index" : "products",
        "_type" : "_doc",
        "_id" : "1",
        "_score" : 1.0,
        "_source" : {
          "id" : 1,
          "title" : "小浣熊",
          "price" : "0.5",
          "created_at" : "2023-03-03",
          "description" : "小浣熊真好吃"
        }
      },
      {
        "_index" : "products",
        "_type" : "_doc",
        "_id" : "Pkmop4YBHIQlzHh1b96_",
        "_score" : 1.0,
        "_source" : {
          "title" : "统一",
          "price" : "2.5",
          "created_at" : "2023-03-03",
          "description" : "统一也还行"
        }
      },
      {
        "_index" : "products",
        "_type" : "_doc",
        "_id" : "4",
        "_score" : 1.0,
        "_source" : {
          "id" : 2,
          "title" : "超大浣熊",
          "price" : "0.5",
          "created_at" : "2023-03-03",
          "description" : "超大浣熊真好吃"
        }
      },
      {
        "_index" : "products",
        "_type" : "_doc",
        "_id" : "3",
        "_score" : 1.0,
        "_source" : {
          "id" : 3,
          "title" : "浣熊",
          "price" : "0.5",
          "created_at" : "2023-03-03",
          "description" : "大浣熊真好吃"
        }
      }
    ]
  }
}
```

#### 常见检索

##### 查询所有[match_all]

> **match_all关键字：返回索引中的全部文档**

```markdown
GET /products/_search
{
	"query":{
		"match_all": {}
	}
}
```

##### 关键词查询[term]

> **term关键字：用来使用关键词查询**

```markdown
GET /products/_search
{
	"query": {
		"term": {
			"price": {
				"value": 0.5
			}
		}
	}
}
```

> **NOTE1：通过使用term查询得知ES中默认使用分词器为`标准分词器（StandardAnalyzer），标准分词器对于英文单词分词，对于中文单字分词`**
>
> **NOTE2：通过使用term查询得知，`在ES的Mapping Type中Keyword、date、integer、long、double、boolean、or、ip这些类型不分词，只有text类型分词`**

##### 范围查询[range]

> **range 关键字：用来指定查询指定范围内的文档**

```markdown
# gte >=
# lte <=
GET /products/_search
{
  "query": {
    "range": {
      "price": {
        "gte": 1,
        "lte": 3
      }
    }
  }
}
```

##### 前缀查询[prefix]

> **prefix关键字：用来检索含有指定前缀的关键词的相关文档**

```markdown
GET /products/_search
{
  "query": {
    "prefix": {
      "title": {
        "value": "小"
      }
    }
  }
}
```

##### 通配符查询[wildcard]

> **wildcard关键字：通配符查询，?用来匹配一个任意字符，*用来匹配多个任意字符 **

```markdown
GET /products/_search
{
  "query": {
    "wildcard": {
      "description": {
        "value": "go*"
      }
    }
  }
}
```

##### 多id查询[ids]

> **ids关键字：值为数组类型，用来根据一组id获取多个对应的文档**

```markdown
GET /products/_search
{
  "query": {
    "ids": {
      "values": [1, 3, 4]
    }
  }
}
```

##### 模糊查询[fuzzy]

> **fuzzy关键字：用来模糊查询含有指定关键字的文档**

```markdown
GET /products/_search
{
  "query": {
    "fuzzy": {
      "title": {
        "value": "小浣豆"
      }
    }
  }
}
```

> **注意：fuzzy 模糊查询，最大模糊错误必须在0-2之间**
>
> - **搜索关键词长度为2，不允许存在模糊**
> - **搜索关键词长度为3-5，允许一次模糊**
> - **搜索关键词长度大于5，允许最大两次模糊**

##### 布尔查询[bool]

```markdown
# must：相当于&&同时成立
# should：相当于||成立一个就行
# must_not：相当于!，不能满足任何一个
GET /products/_search
{
  "query": {
    "bool": {
      "should": [
        {
          "ids": {
            "values": [1]
          }
        }, 
        {
          "term": {
            "title": {
              "value": "小熊猫"
            }
          }  
        }
      ]
    }
  }
}
```

##### 多字段查询[multi_match]

```markdown
# 字段类型分词，将查询条件分词之后进行查询该字段，如果该字段不分词就会将查询条件作为整体进行查询
GET /products/_search
{
  "query": {
    "multi_match": {
      "query": "小浣熊",
      "fields": ["title", "description"]
    }
  }
}
```

##### 默认字段分词查询[query_string]

```markdown
# 查询字段分词就将查询条件分词查询
# 查询字段不分词将查询条件不分词查询
GET /products/_search
{
  "query": {
    "query_string": {
      "default_field": "description",
      "query": "浣熊"
    }
  }
}
```

##### 高亮查询[highlight]

```markdown
# "require_field_match": "false", 对指定字段匹配关闭
# size 返回指定条数，默认返回10条
# from 用来指定起始返回位置，和size关键字连用可实现分页效果
# sort 将文档对指定字段进行排序
# _source 指定哪些字段进行返回
GET /products/_search
{
  "query": {
    "query_string": {
      "default_field": "description",
      "query": "浣熊"
    }
  },
  "highlight": {
    "pre_tags": ["<span style='color:red;'>"],
    "post_tags": ["</span>"],
    "require_field_match": "false",
    "fields": {
      "*": {}
    }
  },
  "from": 0, 
  "size": 10,
  "sort": [
    {
      "price": {
        "order": "desc"
      }
    }
  ], 
  "_source": ["title", "price"]
}
```

## 索引原理

### 倒排索引

**倒排索引（Inverted Index）也叫反向索引，有反向索引必有正向索引。通俗地来讲，正向索引是通过key找value，反向索引则是通过value找key，ES底层在检索时底层使用的就是倒排索引**

### 索引模型

**现有索引和映射如下**

```markdown
PUT /test
{
    "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "title":{
        "type": "keyword"
      },
      "price":{
        "type": "double"
      },
      "description":{
        "type": "text"
      }
    }
  }
}
```

**先录入如下数据，有三个字段title、price、description等**

|  _id  |      title       |   price    |       description        |
| :---: | :--------------: | :--------: | :----------------------: |
| **1** | **蓝月亮洗衣液** | **`19.9`** | **蓝月亮洗衣液`很`高效** |
| **2** |   **iphone13**   | **`19.9`** |    **`很`不错的手机**    |
| **3** | **小浣熊干脆面** |  **1.5**   |    **小浣熊`很`好吃**    |

 **在ES中除了text类型分词，其它类型不分词，因此根据不同字段创建索引如下：**

- **title字段**

|       term       | _id(文档id) |
| :--------------: | :---------: |
| **蓝月亮洗衣液** |    **1**    |
|   **iphone13**   |    **2**    |
| **小浣熊干脆面** |    **3**    |

- **price字段**

|   term   | _id(文档id) |
| :------: | :---------: |
| **19.9** | **[1, 2]**  |
| **1.5**  |    **3**    |

- **description字段**

> **[1(文档id):1(在字段中出现的次数):9(字段数据长度)]**

|  term  |            _id            |  term  | \_id  |  term  | \_id  |
| :----: | :-----------------------: | :----: | :---: | :----: | :---: |
| **蓝** |           **1**           | **不** | **2** | **小** | **3** |
| **月** |           **1**           | **错** | **2** | **浣** | **3** |
| **亮** |           **1**           | **的** | **2** | **熊** | **3** |
| **洗** |           **1**           | **手** | **2** | **好** | **3** |
| **衣** |           **1**           | **机** | **2** | **吃** | **3** |
| **液** |           **1**           |        |       |        |       |
| **很** | **[1:1:9, 2:1:5, 3:1:5]** |        |       |        |       |
| **高** |           **1**           |        |       |        |       |
| **效** |           **1**           |        |       |        |       |

**注意：ElasticSearch分别为每个字段都建立了一个倒排索引，因此查询时查询字段的term，就能知道文档ID，就能快速找到文档**

## IK使用

**IK有两种颗粒度的拆分：**

- **ik_smart：会做最粗粒度的拆分**
- **ik_max_word：会将文本做最细粒度的拆分**

```markdown
# 分词器测试
POST /_analyze
{
  "analyzer": "ik_smart",
  "text": "中华人民共和国国歌"
}
```

## 过滤查询<Filter Query>

### 过滤查询

**过滤查询<filter query>，其实准确来说，ES中的查询操作分为两种：`查询(query)`和`过滤(filter)`，查询即是之前提到的`query查询`，它（查询）默认会计算每个返回文档的得分，然后根据得分排序；而`过滤(filter)`只会筛选出符合的文档，并不计算得分，而且它可以缓存文档。所以，单从性能考虑，过滤比查询更快。换句话说`过滤适合在大范围筛选数据，而查询则适合精度匹配数据。一般应用时，应先使用过滤操作过滤数据，然后使用查询匹配数据`**

### 使用

```markdown
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "description": {
              "value": "浣熊"
          }
        }}
      ],
      "filter": [
        {
          "term": {
            "description": "好吃"
          }
        }
      ]
    }
  }
}
```

## SpringBoot整合ElasticSearch

### 引入依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>
```

### 配置客户端

```java
@Configuration
public class RestClientConfig extends AbstractElasticsearchConfiguration
{
    @Value("${myElasticSearch.host}")
    private String host;

    @Bean
    @Override
    public RestHighLevelClient elasticsearchClient()
    {
        ClientConfiguration clientConfiguration = ClientConfiguration.builder()
                                                                     .connectedTo(host)
                                                                     .build();
        return RestClients.create(clientConfiguration).rest();
    }
}
```

### 客户端对象

- **ElasticsearchOperations**

- **RestHighLevelClient 推荐**

### ElasticsearchOperations

- **特点：始终使用面向对象方式操作ES**
    - **索引：用来存放相似文档的集合**
    - **映射：用来决定放入文档的每个字段以什么方式录入到ES中的字段类型，字段分词器等**
    - **文档：可以被索引的最小单元，以json数据格式表示**

### 相关注解

```java
/**
 * 1. @Document(indexName = "products", createIndex = true)，作用在类上，代表一个对象为一个文档
 * 	-- indexName：索引的名称
 * 	-- createIndex：索引不存在时是否创建索引
 * 2. @Id用在属性上，将对象id字段与ES中文档的_id对应
 * 3. @Field(type = FieldType.Keyword, analyzer = "ik_max_word")
 * 	-- type：用来指定字段类型
 * 	-- analyzer：用来指定分词器
 */
@Document(indexName = "products", createIndex = true)
public class Product
{
    @Id
    private Integer id;
    @Field(type = FieldType.Keyword)
    private String title;
    @Field(type = FieldType.Double)
    private Double price;
    @Field(type = FieldType.Text, analyzer = "ik_max_word")
    private String description;
}
```

### 插入/更新文档

```java
/**
 * save方法 索引一条文档，更新一条文档
 *  -- 当文档id不存在时添加文档
 *  -- 当文档id存在时更新文档
 */
@Test
public void testSave()
{
    Product product = new Product(1, "小浣熊", 1.0, "小浣熊真好吃");
    Product product1 = new Product();
    product1.setId(1);
    product1.setPrice(1.5);
    Product save = getElasticsearchOperations().save(product);
    LOGGER.info("save result = {}", save);
}
```

### 删除文档

```java
/**
 * 删除一条文档
 */
@Test
public void testDelete()
{
    Product product = new Product();
    product.setId(1);
    String delete = getElasticsearchOperations().delete(product);
    LOGGER.info("delete result = {}", delete);
}
```

### 查询文档

```java
/**
 * 查询一条文档
 */
@Test
public void testGet()
{
    Product product = getElasticsearchOperations().get("1", Product.class);
    LOGGER.info("get result = {}", product);
}
```

### 删除所有文档

```java
/**
 * 删除所有文档
 */
@Test
public void testDeleteAll()
{
    ByQueryResponse delete = getElasticsearchOperations().delete(Query.findAll(), Product.class);
    try{
        LOGGER.info("deleteAll result = {}", new ObjectMapper().writeValueAsString(delete));
    }catch(JsonProcessingException e){
        e.printStackTrace();
    }
}
```

### 查询所有文档

```java
/**
 * 查询所有文档
 */
@Test
public void testFindAll()
{
    SearchHits<Product> search = getElasticsearchOperations().search(Query.findAll(), Product.class);
    LOGGER.info("总分数： result = {}", search.getMaxScore());
    LOGGER.info("符合条件总条数： result = {}", search.getTotalHits());
    search.stream()
        .forEach(productSearchHit -> LOGGER.info("findAll result = {}", productSearchHit.getContent()));
}
```

## RestHighLevelClient

### 索引相关操作

#### 创建索引映射

```java
/**
 * 创建索引、创建映射
 */
@Test
public void testIndexAndMapping()
{

    CreateIndexRequest createIndexRequest = new CreateIndexRequest("products");
    createIndexRequest.mapping("{\n" + "    \"properties\": {\n" + "      \"title\":{\"type\":\"keyword\"},\n" + "      \"price\":{\"type\":\"double\"},\n" + "      \"created_at\":{\"type\": \"date\"},\n" + "      \"description\":{\"type\": \"text\", \"analyzer\": \"ik_max_word\"}\n" + "    }\n" + "  }", XContentType.JSON);
    try{
        CreateIndexResponse createIndexResponse =
            restHighLevelClient.indices().create(createIndexRequest, RequestOptions.DEFAULT);
        LOGGER.info("response result = {}", createIndexResponse.isAcknowledged());
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 删除索引

```java
/**
 * 删除索引
 */
@Test
public void testDeleteIndex()
{
    try{
        AcknowledgedResponse acknowledgedResponse =
                restHighLevelClient.indices().delete(new DeleteIndexRequest("products"), RequestOptions.DEFAULT);
        LOGGER.info("response result = {}", acknowledgedResponse.isAcknowledged());
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

### 文档相关操作

#### 创建文档

```java
/**
 * 创建一条文档
 */
@Test
public void testCreate()
{
    IndexRequest indexRequest = new IndexRequest("products");
    indexRequest.id("3") // 手动指定文档id
                .source("{\"title\": \"香辣木瓜丝\", \"price\": \"2.5\", \"description\": \"香辣木瓜丝真好吃\", \"created_at\": \"2023-03-03\"}", XContentType.JSON);
    try{
        // 参数1：索引请求对象，参数2：请求配置对象
        IndexResponse index = getRestHighLevelClient().index(indexRequest, RequestOptions.DEFAULT);
        LOGGER.info("Index result = {}", index.status());
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 更新文档

```java
/**
 * 更新文档
 */
@Test
public void testUpdate()
{
    // 参数1：去哪个索引更新，参数2：更新文档id
    UpdateRequest updateRequest = new UpdateRequest("products","2");
    updateRequest.doc("{\"title\": \"香辣土豆丝\"}", XContentType.JSON);

    try{
        // 参数1：更新请求对象，参数2：请求配置对象
        UpdateResponse updateResponse = restHighLevelClient.update(updateRequest, RequestOptions.DEFAULT);
        LOGGER.info("Update result = {}", updateResponse.status());
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 删除文档

```java
/**
 * 删除文档
 */
@Test
public void testDelete()
{
    try{
        // 参数1：删除请求对象，参数2：请求配置对象
        DeleteResponse deleteResponse =
                getRestHighLevelClient().delete(new DeleteRequest("products", "3"), RequestOptions.DEFAULT);
        LOGGER.info("Delete result = {}", deleteResponse.status());
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 基于id查询文档

```java
/**
 * 基于id查询文档
 */
@Test
public void testGet()
{
    try{
        // 参数1：查询请求对象，参数2：请求配置对象，返回：查询响应对象
        GetResponse getResponse =
                getRestHighLevelClient().get(new GetRequest("products", "1"), RequestOptions.DEFAULT);
        LOGGER.info("Get result = {}", getResponse.getSourceAsString());
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 查询所有文档

```java
/**
 * 查询所有
 */
@Test
public void testGetAll()
{
    SearchRequest searchRequest = new SearchRequest("products");
    SearchSourceBuilder sourceBuilder = new SearchSourceBuilder();
    sourceBuilder.query(QueryBuilders.matchAllQuery()); // 查询所有
    searchRequest.source(sourceBuilder); // 指定查询条件
    try{
        // 参数1：查询请求对象，参数2：请求配置对象，返回：查询响应对象
        SearchResponse searchResponse =
                getRestHighLevelClient().search(searchRequest, RequestOptions.DEFAULT);
        LOGGER.info("总条数 result = {}", searchResponse.getHits().getTotalHits().value);
        LOGGER.info("最大得分 result = {}", searchResponse.getHits().getMaxScore());
        // 获取结果
        SearchHit[] hits = searchResponse.getHits().getHits();
        Arrays.stream(hits)
              .forEach(hit -> LOGGER.info("id = {}, result = {}", hit.getId(), hit.getSourceAsString()));
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 不同条件查询文档

```java
/**
 * 不同条件查询文档
 *  -- term(关键词查询)
 *  -- range(范围查询)
 */
@Test
public void testQuery()
{
    // 1. term 关键词查询
    query(QueryBuilders.termQuery("description", "土豆"));
    // 2. range 范围查询
    query(QueryBuilders.rangeQuery("price").gt(0).lte(3));
    // 3. prefix 前缀查询
    query(QueryBuilders.prefixQuery("description", "香"));
    // 4. wildcard 通配符查询 ?匹配一个字符，*匹配任意字符
    query(QueryBuilders.wildcardQuery("description", "香*"));
    // 5. ids 多个指定id查询
    query(QueryBuilders.idsQuery().addIds("1").addIds("2"));
    // 6. multi_match 多字段查询
    query(QueryBuilders.multiMatchQuery("香辣小浣熊", "description", "title"));
}

public void query(QueryBuilder queryBuilder)
{
    SearchRequest searchRequest = new SearchRequest("products");
    SearchSourceBuilder builder = new SearchSourceBuilder();

    builder.query(queryBuilder);

    searchRequest.source(builder);
    try{
        SearchResponse searchResponse = getRestHighLevelClient()
                .search(searchRequest, RequestOptions.DEFAULT);
        LOGGER.info("符合条件总条数 result = {}", searchResponse.getHits().getTotalHits().value);
        LOGGER.info("获取文档最大得分 result = {}", searchResponse.getHits().getMaxScore());
        SearchHit[] hits = searchResponse.getHits().getHits();
        Arrays.stream(hits)
              .forEach(hit -> LOGGER.info("id = {}, result = {}", hit.getId(), hit.getSourceAsString()));
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 分页查询

```java
/**
 * 分页查询
 *  -- from 起始位置
 *  -- size 每页展示记录数
 *  排序 sort
 *  指定哪些字段返回 source
 *  高亮结果 highlighter
 */
@Test
public void testSearch()
{
    SearchRequest searchRequest = new SearchRequest("products");
    SearchSourceBuilder sourceBuilder = new SearchSourceBuilder();
    HighlightBuilder highlightBuilder = new HighlightBuilder();
    highlightBuilder.requireFieldMatch(false) // 对搜索字段匹配关闭
                    .field("description")
                    .field("title")
                    .preTags("<span style='color:red'>")
                    .postTags("</span>");
    sourceBuilder.query(QueryBuilders.termQuery("description", "好吃"))
                 .from(0)
                 .size(3)
                 // 参数1：根据哪个字段排序，参数2：排序方式，desc降序，asc升序
                 .sort("price", SortOrder.DESC)
                 // 参数1：包含字段数组，参数2：排除字段数组
                 .fetchSource(new String[]{"title", "price"}, new String[]{})
                 .highlighter(highlightBuilder);
    searchRequest.source(sourceBuilder);
    try{
        SearchResponse searchResponse = getRestHighLevelClient().search(searchRequest, RequestOptions.DEFAULT);
        LOGGER.info("符合条件总条数 result = {}", searchResponse.getHits().getTotalHits().value);
        LOGGER.info("获取文档最大得分 result = {}", searchResponse.getHits().getMaxScore());
        SearchHit[] hits = searchResponse.getHits().getHits();
        Arrays.stream(hits)
              .forEach(hit -> LOGGER.info("id = {}, result = {}, highlighter = {}", hit.getId(), hit.getSourceAsString(), hit.getHighlightFields()));
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 过滤查询

```java
/**
 * query        ：精确查询，会计算文档得分，并根据文档得分进行返回
 * filter query ：过滤查询，用来在大量数据中筛选出本地查询相关数据，
 *               过滤不会计算文档得分，经常使用的filter query的结果会进行缓存
 * 注意：一旦同时使用query和filterQuery，ES会优先执行filter query然后再执行query
 */
@Test
public void testFilterQuery()
{
    SearchRequest searchRequest = new SearchRequest("products");
    SearchSourceBuilder sourceBuilder = new SearchSourceBuilder();
    sourceBuilder.query(QueryBuilders.matchAllQuery())
                 // 指定过滤条件
                 .postFilter(QueryBuilders.termQuery("description", "香"));
//                     .postFilter(QueryBuilders.rangeQuery("price").gt(0).lte(2));
    searchRequest.source(sourceBuilder);
    try{
        SearchResponse searchResponse = getRestHighLevelClient().search(searchRequest, RequestOptions.DEFAULT);
        LOGGER.info("符合条件总条数 result = {}", searchResponse.getHits().getTotalHits().value);
        LOGGER.info("获取文档最大得分 result = {}", searchResponse.getHits().getMaxScore());
        SearchHit[] hits = searchResponse.getHits().getHits();
        Arrays.stream(hits)
              .forEach(hit -> LOGGER.info("id = {}, result = {}", hit.getId(), hit.getSourceAsString()));
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 应用使用

##### 实体类

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class Product1
{
    private Integer id;
    private String title;
    private Double price;
    private String description;
}
```

##### 将对象放入ES中

```java
/**
 * 将对象放入ES中
 */
@Test
public void testIndex()
{
    Product1 product1 = new Product1();
    product1.setId(4);
    product1.setTitle("红烧肉");
    product1.setPrice(10.5);
    product1.setDescription("红烧肉肥而不腻");
    try{
        IndexRequest indexRequest = new IndexRequest("products");
        // 将对象以json格式录入ES
        indexRequest.id(product1.getId().toString())
                    .source(new ObjectMapper().writeValueAsString(product1), XContentType.JSON);
        IndexResponse indexResponse = restHighLevelClient.index(indexRequest, RequestOptions.DEFAULT);
        LOGGER.info("status = {}", indexResponse.status());
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

##### 从ES中获取数据并转换为对象

```java
@Test
public void testSearch()
{
    SearchRequest searchRequest = new SearchRequest("products");
    SearchSourceBuilder sourceBuilder = new SearchSourceBuilder();
    HighlightBuilder highlightBuilder = new HighlightBuilder();
    highlightBuilder.requireFieldMatch(false)
                    .field("description")
                    .preTags("<span style='color:red;'>")
                    .postTags("</span>");
    sourceBuilder.query(QueryBuilders.termQuery("description", "好吃"))
                 .from(0)
                 .size(3)
                 .highlighter(highlightBuilder);
    searchRequest.source(sourceBuilder);
    try{
        SearchResponse searchResponse = getRestHighLevelClient().search(searchRequest, RequestOptions.DEFAULT);
        LOGGER.info("总条数 result = {}", searchResponse.getHits().getTotalHits().value);
        LOGGER.info("最大得分 result = {}", searchResponse.getHits().getMaxScore());
        // 获取结果
        SearchHit[] hits = searchResponse.getHits().getHits();
        Arrays.stream(hits)
              .forEach(hit -> LOGGER.info("id = {}, result = {}", hit.getId(), hit.getSourceAsString()));
        List<Product1> product1s = Arrays.stream(hits).map(hit -> {
            Product1 product1 = null;
            try{
                // 将json转换为对象
                product1 = new ObjectMapper().readValue(hit.getSourceAsString(), Product1.class);
                product1.setId(Integer.valueOf(hit.getId()));
                // 处理高亮结果
                Map<String, HighlightField> highlightFields = hit.getHighlightFields();
                if(highlightFields.containsKey("description")){
                    product1.setDescription(highlightFields.get("description").fragments()[0].toString());
                }
            }catch(JsonProcessingException e){
                e.printStackTrace();
            }
            return product1;
        }).collect(Collectors.toList());
        product1s.forEach(product1 -> LOGGER.info("result = {}", product1));


    }catch(IOException e){
        e.printStackTrace();
    }
}
```

## 聚合查询

### 简介

**聚合：Aggregation，简称Aggs，是ES除搜索功能外提供的针对ES数据做统计分析的功能。聚合有助于根据搜索查询提供聚合数据，聚合查询是数据库中重要的功能特性，ES作为搜索引擎兼数据库，同样提供了强大的聚合分析能力，它基于查询条件来对数据进行分桶、计算的方法。有点类似于SQL中的group by再加一些函数方法的操作**

> **注意：text类型是不支持聚合的**

### 测试数据

```markdown
# 创建索引及映射
PUT /fruit
{
  "mappings": {
    "properties": {
      "title": {
        "type": "keyword"
      },
      "price":{
        "type": "double"
      },
      "description":{
        "type": "text",
        "analyzer": "ik_max_word"
      }
    }
  }
}

# 插入数据
PUT /fruit/_bulk
{"index": {}}
{"title": "面包", "price": 19.9, "description": "小面包非常好吃"}
{"index": {}}
{"title": "旺仔牛奶", "price": 29.9, "description": "非常好喝"}
{"index": {}}
{"title": "日本豆", "price": 19.9, "description": "日本豆非常好吃"}
{"index": {}}
{"title": "小馒头", "price": 19.9, "description": "小馒头非常好吃"}
{"index": {}}
{"title": "大辣片", "price": 39.9, "description": "大辣片非常好吃"}
{"index": {}}
{"title": "透心凉", "price": 9.9, "description": "透心凉非常好喝"}
{"index": {}}
{"title": "小浣熊", "price": 19.9, "description": "童年的味道"}
{"index":{}}
{"title": "海苔", "price": 19.9, "description": "海的味道"}
```

### 基本操作

#### 根据某个字段分组

```markdown
# 根据某个字段进行分组，统计数量
GET /fruit/_search
{
  "query": {
    "term": {
      "description": {
        "value": "好吃"
      }
    }
  },
  "aggs": {
    "price_group": {
      "terms": {
        "field": "price",
        "size": 10
      }
    }
  }
}

GET /fruit/_search
{
  "query": {
    "match_all": {}
  },
  "size": 0, 
  "aggs": {
    "price_group": {
      "terms": {
        "field": "price",
        "size": 10
      }
    }
  }
}
```

#### 求最大值

```markdown
# 求最大值
GET /fruit/_search
{
  "query": {
    "match_all": {} 
  },
  "size": 0,
  "aggs": {
    "max_price": {
      "max": {
        "field": "price"
      }
    }
  }
}
```

#### 求最小值

```markdown
# 求最小值
GET /fruit/_search
{
  "query": {
    "match_all": {}
  },
  "size": 0,
  "aggs": {
    "min_price": {
      "min": {
        "field": "price"
      }
    }
  }
}
```

#### 求平均值

```markdown
# 求平均值
GET /fruit/_search
{
  "query": {
    "match_all": {}
  },
  "size": 0,
  "aggs": {
    "avg_price": {
      "avg": {
        "field": "price"
      }
    }
  }
}
```

#### 求和

```markdown
# 求和
GET /fruit/_search
{
  "query": {
    "match_all": {}
  },
  "size": 0,
  "aggs": {
    "sum_price": {
      "sum": {
        "field": "price"
      }
    }
  }
}
```

### 整合应用

#### 基于terms类型进行聚合

```java
/**
 * 基于 terms 类型进行聚合，基于字段进行分组聚合
 */
@Test
public void testTermsAggs()
{
    SearchRequest searchRequest = new SearchRequest("fruit");
    SearchSourceBuilder sourceBuilder = new SearchSourceBuilder();
    sourceBuilder.query(QueryBuilders.matchAllQuery())
                 .size(0)
                 .aggregation(AggregationBuilders.terms("price_group")
                                                 .field("price")); // 用来设置聚合处理
    searchRequest.source(sourceBuilder);
    try{
        SearchResponse searchResponse =
                getRestHighLevelClient().search(searchRequest, RequestOptions.DEFAULT);
        ParsedDoubleTerms price_group = searchResponse.getAggregations().get("price_group");
        price_group.getBuckets().forEach(bucket ->
                                                 LOGGER.info("key = {}, doc_count = {}",
                                                             bucket.getKey(), bucket.getDocCount()));
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

#### 聚合函数

```java
/**
 * max(ParsedMax) min(ParsedMin) sum(ParsedSum) avg(ParsedAvg) 聚合函数
 */
@Test
public void testFunctionAvgAggs()
{
    SearchRequest searchRequest = new SearchRequest("fruit");
    SearchSourceBuilder sourceBuilder = new SearchSourceBuilder();
    sourceBuilder.query(QueryBuilders.matchAllQuery())
                 .size(0)
//                      .aggregation(AggregationBuilders.avg("avg_price").field("price")); // 求平均值
//                     .aggregation(AggregationBuilders.sum("sum_price").field("price")); // 求和
//                     .aggregation(AggregationBuilders.min("min_price").field("price")); // 求最小值
                 .aggregation(AggregationBuilders.max("max_price").field("price")); // 求最大值
    searchRequest.source(sourceBuilder);
    try{
        SearchResponse searchResponse =
                getRestHighLevelClient().search(searchRequest, RequestOptions.DEFAULT);
        Aggregations aggregations = searchResponse.getAggregations();
        ParsedMax max_price = aggregations.get("max_price");
        LOGGER.info("value = {}", max_price.getValue());
    }catch(IOException e){
        e.printStackTrace();
    }
}
```

## 相关概念

### 集群(cluster)

**一个集群就是由一个或多个节点组织在一起，`它们共同持有你整个的数据，并一起提供索引和搜索功能`。一个集群由一个唯一的名字标识，这个名字默认就是`elasticsearch`。这个名字是很重要的，因为一个节点只能通过指定某个集群的名字，来加入这个集群**

### 节点(node)

**一个节点是你集群中的一个服务器，作为集群的一部分，它存储你的数据，参与集群的索引和搜索功能。和集群类似，一个节点也是由一个名字来标识的，默认情况下，这个名字是一个随机的漫威漫画角色的名字，这个名字会在启动的时候赋予节点**

### 索引(Index)

**一组相似文档的集合**

### 映射(Mapping)

**用来定义索引存储文档的结构如：字段、类型等**

### 文档(Document)

**索引中的一条记录，可以被索引的最小单元**

### 分片(shards)

**Elasticsearch提供了将索引划分成多份的能力，被划分为的多份就叫做分片，当你创建一个索引的时候，你可以指定你想要的分片的数量。每个分片本身也是一个功能完善并且独立的“索引”，**

### 复制(replicas)

**索引的分片中一份或多份副本**

## 搭建集群

```markdown
# 1.准备3个ES节点 ES 9200 9300
- web: 9201 tcp: 9301 node-1 elasticsearch.yml
- web: 9202 tcp: 9302 node-2 elasticsearch.yml
- web: 9203 tcp: 9303 node-3 elasticsearch.yml
```

- **注意**
    - **所有节点集群名称必须一致，cluster.name**
    - **每个节点必须有一个唯一名字，node.name**
    - **开启每个节点远程连接，netword.host: 0.0.0.0**
    - **指定使用IP地址进行集群节点通信，network.publish_host**
    - **修改web端口、tcp端口，http.port: transport.tcp.port**
    - **指定集群中所有节点通信列表，discovery.seed_hosts: node-1，node-2和node-3相同**
    - **允许集群初始化master节点节点数：cluster.initial_master_nodes: ["node-1", "node-2", "node-3"]**
    - **集群最少几个节点可以，getway.recover_after_nodes: 2**
    - **开启每个节点跨域访问，http.cors.enabled: true，http.cors.allow-origin: "*"**
