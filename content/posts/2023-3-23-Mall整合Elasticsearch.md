---
title: mall整合Elasticsearch实现商品搜索
abbrlink: 57e98fa8
tags: ["ES"]
categories: ["封档"]
description: "封档"
publishDate: 2023-03-23 12:17:10
---

# mall整合Elasticsearch实现商品搜索

## 项目使用框架介绍

### Elasticsearch

> **Elasticsearch是一个分布式、可扩展、实时的搜索与数据分析引擎。它能从项目一开始就赋予你的数据以搜索、分析和探索的能力，可用于实现全文 搜索和实时数据统计**

> **版本7.17.3**

### Spring Data Elasticsearch

> **Spring Data Elasticsearch是Spring提供的一种以Spring Data风格来操作数据存储的方式，它可以避免编写大量的样板代码**

#### 常用注解

##### @Document

```java
// 标示映射到Elasticsearch文档上的领域对象
public @interface Document {
  // 索引库名次，mysql中数据库的概念
	String indexName();
  // 文档类型，mysql中表的概念
	String type() default "";
  // 默认分片数
	short shards() default 5;
  // 默认副本数量
	short replicas() default 1;
}
```

##### @Id

```java
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.ANNOTATION_TYPE})
// 表示文档的id
public @interface Id {
}
```

##### @Field

```java
public @interface Field {
  // 文档中字段的类型
	FieldType type() default FieldType.Auto;
  // 是否建立倒排索引
	boolean index() default true;
  // 是否进行存储
	boolean store() default false;
  // 分词器名次
	String analyzer() default "";
}
```

```java
// 为文档自动指定元数据类型
public enum FieldType {
	Text, // 会进行分词并建了索引的字符类型
	Integer,
	Long,
	Date,
	Float,
	Double,
	Boolean,
	Object,
	Auto,// 自动判断字段类型
	Nested,// 嵌套对象类型
	Ip,
	Attachment,
	Keyword // 不会进行分词建立索引的类型
}
```

#### Spring Data方式的数据操作

**继承ElasticsearchRepository<T, ID>接口可以获得常用的数据操作方法，T类型为映射的类对象类型，ID为设置的文档id的类型**

**因为ElasticsearchRepository<T, ID>在源码中有一个SimpleElasticsearchRepository<T, ID>的实现类，该类已经实现了一些基础操作 **

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

##### 衍生查询

> **在继承接口的实现类中指定查询方法名称即可查询，无需进行实现，如商品表中有商品名称、标题和关键字，直接定义如下查询，就可以对这三个字段进行全文搜索findAllByName**

```java
/**
 * 搜索商品ES操作类
 */
public interface EsProductRepository extends ElasticsearchRepository<EsProduct, Long> 
{
    /**
     * 搜索查询
     * @param name              商品名称
     * @param subTitle          商品标题
     * @param keyword          商品关键字
     * @param page              分页信息
     */
    Page<EsProduct> findByNameOrSubTitleOrKeywords(String name, String subTitle, String keyword, Pageable page);
}
```

|        关键字        |                使用示例                |                        等同于的ES查询                        |
| :------------------: | :------------------------------------: | :----------------------------------------------------------: |
|       **And**        |         **findByNameAndPrice**         | **{"bool": {"must": [{"field": {"name": "?"}}, {"field": {"price": "?"}}]}}** |
|        **Or**        |         **findByNameOrPrice**          | **{"bool": {"should": [{"field": {"name": "?"}}, {"field": {"price": "?"}}]}}** |
|        **Is**        |             **findByName**             |      **{"bool": {"must": [{"field": {"name": "?"}}]}}**      |
|       **Not**        |           **findByNameNot**            |    **{"bool": {"must_not": [{"field": {"name": "?"}}]}}**    |
|     **Between**      |         **findByPriceBetween**         | **{"bool": {"must": {"range": {"price": {"from": ?, "to": ?, "include_lower": true, "include_upper": true}}}}}** |
|  **LessThanEqual**   |        **findByPriceLessThan**         | **{"bool": {"must": {"range": {"price": {"from": null, "to": ?, "include_lower": true, "include_upper": true}}}}** |
| **GreaterThanEqual** |       **findByPriceGreaterThan**       | **{"from": ?, "to": null, "include_lower": true, "include_upper": true}** |
|      **Before**      |         **findByPriceBefore**          | **{"bool": {"must": {"range": {"price": {"from": null, "to": ?, "include_lower": true, "include_upper": true}}}}}** |
|      **After**       |          **findByPriceAfter**          | **{"bool": {"must": {"range": {"price": {"from": ?, "to": null, "include_lower": true, "include_upper": true}}}}}** |
|       **Like**       |           **findByNameLike**           | **{"bool": {"must": {"field": {"name": {"query": ?, "analyze_wildcard": true}}}}}** |
|   **StartingWith**   |       **findByNameStartingWith**       | **{"bool": {"must": {"field": {"name": {"query": "?*", "analyze_wildcard": true}}}}}** |
|    **EndingWith**    |        **findByNameEndingWith**        | **{"bool": {"must": {"field": {"name": {"query": "*?", "analyze_wildcard": true}}}}}** |
|  **Contains/Conta**  |        **findByNameContaining**        | **{"bool": {"must": {"field": {"name": {"query": "?", "analyze_wildcard": true}}}}}** |
|        **In**        |   **findByNameIn(Collectionnames)**    | **{"bool": {"must": {"bool": {"should": [{"field": {"name": "?"}}, {"field": {"name": "?"}}]}}}}** |
|      **NotIn**       |  **findByNameNotIn(Collectionnames)**  | **{"bool": {"must_not": {"bool": {"should": {"field": {"name": "?"}}}}}}** |
|       **True**       |        **findByAvailableTrue**         |    **{"bool": {"must": {"field": {"available": true}}}}**    |
|      **False**       |        **findByAvailableFalse**        |   **{"bool": {"must": {"field": {"available": false}}}}**    |
|     **OrderBy**      | **findByAvailableTrueOrderByNameDesc** | **{"sort": [{"name": {"order": "desc"}}], "bool": {"must": {"field": {"available": true}}}}** |

##### 使用@Query注解可以用Elasticsearch的DSL语句进行查询

```java
@Query("{"bool" : {"must" : {"field" : {"name" : "?0"}}}}")
Page<EsProduct> findByName(String name,Pageable pageable);
```

## 项目使用表说明

- **`pms_product`：商品信息表**

- **`pms_product_attribute`：商品属性参数表**
- **`pms_product_attribute_value`：存储产品参数值表**

## 整合Elasticsearch实现商品搜索

### 在pom.xml中添加相关依赖

```xml
<!--Elasticsearch相关依赖-->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>
```

### 修改SpringBoot配置文件

```yaml
spring:  
  data:
    elasticsearch:
      repositories:
        enabled: true
  elasticsearch:
    uris: 127.0.0.1:9200
```

### 添加商品文档对象EsProduct

> **不需要中文分词的字段设置成@Field(type = FieldType.Keyword)类型，需要中文分词的设置成@Field(analyzer = "ik_max_word", type = FieldType.Text)类型**

```java
/**
 * 搜索商品的信息
 */
@Data
@EqualsAndHashCode
// 索引名称
@Document(indexName = "pms")
// shards 分片 replicas 副本
@Setting(shards = 1, replicas = 0)

public class EsProduct implements Serializable {
    private static final long serialVersionUID = -1L;
    @Id
    private Long id;
    @Field(type = FieldType.Keyword)
    private String productSn; // 货号
    private Long brandId; // 品牌id
    @Field(type = FieldType.Keyword)
    private String brandName; // 品牌名
    private Long productCategoryId; // 商品属性类别id
    @Field(type = FieldType.Keyword)
    private String productCategoryName; // 商品属性名称
    private String pic; // 商品图片链接
    @Field(analyzer = "ik_max_word",type = FieldType.Text)
    private String name; // 商品标题
    @Field(analyzer = "ik_max_word",type = FieldType.Text)
    private String subTitle; // 商品副标题
    @Field(analyzer = "ik_max_word",type = FieldType.Text)
    private String keywords; // 商品关键字
    private BigDecimal price; // 商品价格
    private Integer sale; // 商品销量
    private Integer newStatus; // 新品状态
    private Integer recommandStatus; // 推荐状态
    private Integer stock; // 库存
    private Integer promotionType; // 促销类型
    private Integer sort; // 排序
    // nested 允许对象数组以一种可以相互独立查询的方式进行索引，
    // 在nested内部，每个对象索引其实是一个单独的隐藏文档，
    // 意味着每个嵌套对象都可以独立于其它对象进行查询
    @Field(type = FieldType.Nested)
    private List<EsProductAttributeValue> attrValueList; // 商品属性信息列表
}
```

### 添加EsProductRepository接口用于操作Elasticsearch

```java
/**
 * 搜索商品ES操作类
 */
public interface EsProductRepository extends ElasticsearchRepository<EsProduct, Long> {
    /**
     * 搜索查询
     * @param name              商品名称
     * @param subTitle          商品标题
     * @param keyword          商品关键字
     * @param page              分页信息
     */
    Page<EsProduct> findByNameOrSubTitleOrKeywords(String name, String subTitle, String keyword, Pageable page);
}
```

### 添加EsProductService接口

```java
/**
 * 搜索商品管理Service
 */
public interface EsProductService
{
    /**
     * 从数据库中导入所有商品到ES
     */
    int importAll();

    /**
     * 根据id创建商品文档
     */
    EsProduct create(Long id);

    /**
     * 根据id删除商品文档
     */
    void delete(Long id);

    /**
     * 批量删除商品文档
     */
    void delete(List<Long> ids);

    /**
     * 根据关键字搜索商品名称或者副标题
     */
    Page<EsProduct> search(String keyword, Integer pageNum, Integer pageSize);

    /**
     * 根据关键字搜索名称或者副标题复合查询
     */
    Page<EsProduct> search(String keyword, Long brandId, Long productCategoryId, Integer pageNum, Integer pageSize,Integer sort);

    /**
     * 根据商品id推荐相关商品
     */
    Page<EsProduct> recommend(Long id, Integer pageNum, Integer pageSize);

    /**
     * 获取搜索词相关品牌、分类、属性
     */
    EsProductRelatedInfo searchRelatedInfo(String keyword);
}
```

### 添加EsProductService接口的实现类EsProductServiceImpl

```java
/**
 * 搜索商品管理Service实现类
 */
@Service
public class EsProductServiceImpl implements EsProductService
{
    private static final Logger LOGGER = LoggerFactory.getLogger(EsProductServiceImpl.class);
    @Resource
    private EsProductDao productDao;
    @Resource
    private EsProductRepository productRepository;
    @Resource
    private ElasticsearchRestTemplate elasticsearchRestTemplate;

    @Override
    public int importAll()
    {
        // 从数据库中获取所有商品信息
        List<EsProduct> esProductList = productDao.getAllEsProductList(null);
        // 将数据库中的数据存入ES中
        Iterable<EsProduct> esProductIterable = productRepository.saveAll(esProductList);
        // 获取响应对象的迭代器
        Iterator<EsProduct> iterator = esProductIterable.iterator();
        // 统计导入的数据条数
        int result = 0;
        while(iterator.hasNext()){
            result++;
            iterator.next();
        }
        return result;
    }

    @Override
    public void delete(Long id)
    {
        productRepository.deleteById(id);
    }

    @Override
    public EsProduct create(Long id)
    {
        EsProduct result = null;
        // 从数据库中根据id获取商品数据
        List<EsProduct> esProductList = productDao.getAllEsProductList(id);
        // 判断数据库中是否有该id商品数据
        if(esProductList.size() > 0){
            // 获取商品数据
            EsProduct esProduct = esProductList.get(0);
            // 存入ES
            result = productRepository.save(esProduct);
        }
        return result;
    }

    @Override
    public void delete(List<Long> ids)
    {
        // 判断参数是否为空，没有判断id是否合法
        if(!CollectionUtils.isEmpty(ids)){
            // 传入ES的参数要为对象
            List<EsProduct> esProductList = new ArrayList<>();
            ids.forEach(id -> {
                EsProduct esProduct = new EsProduct();
                esProduct.setId(id);
                esProductList.add(esProduct);
            });
            productRepository.deleteAll(esProductList);
        }
    }

    @Override
    public Page<EsProduct> search(String keyword, Integer pageNum, Integer pageSize)
    {
        // 获取分页信息包装类
        Pageable pageable = PageRequest.of(pageNum, pageSize);
        return productRepository.findByNameOrSubTitleOrKeywords(keyword, keyword, keyword, pageable);
    }

    @Override
    public Page<EsProduct> search(String keyword, Long brandId, Long productCategoryId, Integer pageNum,
                                  Integer pageSize, Integer sort)
    {
        // 获取分页信息包装类
        Pageable pageable = PageRequest.of(pageNum, pageSize);

        // NativeSearchQuery查询对象构造器
        NativeSearchQueryBuilder nativeSearchQueryBuilder = new NativeSearchQueryBuilder();
        //分页
        nativeSearchQueryBuilder.withPageable(pageable);
        //过滤
        if(!Objects.isNull(brandId) || !Objects.isNull(productCategoryId)){
            // 获取bool查询对象构造器
            BoolQueryBuilder boolQueryBuilder = QueryBuilders.boolQuery();
            if(!Objects.isNull(brandId)){
                // terms查询，基于关键字查询
                boolQueryBuilder.must(QueryBuilders.termQuery("brandId", brandId));
            }
            if(!Objects.isNull(productCategoryId)){
                boolQueryBuilder.must(QueryBuilders.termQuery("productCategoryId", productCategoryId));
            }
            // 加入过滤条件
            nativeSearchQueryBuilder.withFilter(boolQueryBuilder);
        }
        //搜索
        if(StrUtil.isEmpty(keyword)){
            // 如果关键词为空，则查询所有文档
            nativeSearchQueryBuilder.withQuery(QueryBuilders.matchAllQuery());
        }else{
            List<FunctionScoreQueryBuilder.FilterFunctionBuilder> filterFunctionBuilders = new ArrayList<>();
            // 过滤函数构造器
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("name", keyword),
                                           ScoreFunctionBuilders.weightFactorFunction(10))); // 设置多字段查询权重
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("subTitle", keyword),
                                           ScoreFunctionBuilders.weightFactorFunction(5)));
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("keywords", keyword),
                                           ScoreFunctionBuilders.weightFactorFunction(2)));
            FunctionScoreQueryBuilder.FilterFunctionBuilder[] builders = new FunctionScoreQueryBuilder.FilterFunctionBuilder[filterFunctionBuilders.size()];
            filterFunctionBuilders.toArray(builders); // 转换为数组形式
            FunctionScoreQueryBuilder functionScoreQueryBuilder = QueryBuilders.functionScoreQuery(builders)
                                                                               .scoreMode(FunctionScoreQuery.ScoreMode.SUM) // 对结果分数求和
                                                                               .setMinScore(2);
            nativeSearchQueryBuilder.withQuery(functionScoreQueryBuilder);
        }
        //排序
        if(sort == 1){
            //按新品从新到旧
            nativeSearchQueryBuilder.withSorts(SortBuilders.fieldSort("id").order(SortOrder.DESC));
        }else if(sort == 2){
            //按销量从高到低
            nativeSearchQueryBuilder.withSorts(SortBuilders.fieldSort("sale").order(SortOrder.DESC));
        }else if(sort == 3){
            //按价格从低到高
            nativeSearchQueryBuilder.withSorts(SortBuilders.fieldSort("price").order(SortOrder.ASC));
        }else if(sort == 4){
            //按价格从高到低
            nativeSearchQueryBuilder.withSorts(SortBuilders.fieldSort("price").order(SortOrder.DESC));
        }else{
            //按相关度
            nativeSearchQueryBuilder.withSorts(SortBuilders.scoreSort().order(SortOrder.DESC));
        }
        nativeSearchQueryBuilder.withSorts(SortBuilders.scoreSort().order(SortOrder.DESC));
        // NativeSearchQuery 查询对象
        NativeSearchQuery searchQuery = nativeSearchQueryBuilder.build();
        LOGGER.info("DSL:{}", searchQuery.getQuery().toString());
        // 查询结果Hit数组
        SearchHits<EsProduct> searchHits = elasticsearchRestTemplate.search(searchQuery, EsProduct.class);
        // 查询到的总条数
        if(searchHits.getTotalHits() <= 0){
            // 没有查询到，返回空
            return new PageImpl<>(ListUtil.empty(), pageable, 0);
        }
        // 获取查询到的对象
        List<EsProduct> searchProductList = searchHits.stream()
                                                      .map(SearchHit::getContent)
                                                      .collect(Collectors.toList());
        // 封装为分页对象返回
        return new PageImpl<>(searchProductList, pageable, searchHits.getTotalHits());
    }

    public Page<EsProduct> searchSub(String keyword, Long brandId, Long productCategoryId, Integer pageNum,
                                  Integer pageSize, Integer sort)
    {
        // 获取分页信息包装类
        PageRequest pageRequest = PageRequest.of(pageNum, pageSize);

        // NativeSearchQuery查询对象构造器
        NativeSearchQueryBuilder nativeSearchQueryBuilder = new NativeSearchQueryBuilder();
        //分页
        nativeSearchQueryBuilder.withPageable(pageRequest);
        //过滤，如果brandId或者productCategoryId不为空才构造过滤条件
        if(!Objects.isNull(brandId) || !Objects.isNull(productCategoryId)){
            // 获取bool查询对象构造器
            BoolQueryBuilder boolQueryBuilder = new BoolQueryBuilder();
            if(!Objects.isNull(brandId)){
                // terms查询，基于关键字查询
                boolQueryBuilder.must(QueryBuilders.termQuery("brandId", brandId));
            }
            if(!Objects.isNull(productCategoryId)){
                boolQueryBuilder.must(QueryBuilders.termQuery("productCategoryId", productCategoryId));
            }
            // 向构造器中加入过滤条件
            nativeSearchQueryBuilder.withFilter(boolQueryBuilder);
        }

        //构造搜索条件
        if(StrUtil.isEmpty(keyword)){
            // 如果关键词为空，则查询所有文档
            nativeSearchQueryBuilder.withQuery(QueryBuilders.matchAllQuery());
        } else{
            // 构造filterFunctionBuilderList
            List<FunctionScoreQueryBuilder.FilterFunctionBuilder> filterFunctionBuilders = new ArrayList<>();
            // 构造查询条件，并设置多字段查询权重
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("name", keyword),
                                       ScoreFunctionBuilders.weightFactorFunction(10)));
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("subTitle", keyword),
                                           ScoreFunctionBuilders.weightFactorFunction(5)));
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("keywords", keyword),
                                           ScoreFunctionBuilders.weightFactorFunction(2)));
            // 加入查询条件
            FunctionScoreQueryBuilder.FilterFunctionBuilder[] functionBuilders =
                    new FunctionScoreQueryBuilder.FilterFunctionBuilder[filterFunctionBuilders.size()];

            FunctionScoreQueryBuilder functionScoreQueryBuilder =
                    QueryBuilders.functionScoreQuery(functionBuilders)
                                 .scoreMode(FunctionScoreQuery.ScoreMode.SUM) // 对结果分数求和
                                 .setMinScore(2); // 设置最小权重分为2
            nativeSearchQueryBuilder.withQuery(functionScoreQueryBuilder);
        }

        // 排序
        if(sort == 1){
            // 按新品从新到旧
            nativeSearchQueryBuilder.withSorts(SortBuilders.fieldSort("id").order(SortOrder.DESC));
        } else if(sort == 2){
            // 按销量从高到低
            nativeSearchQueryBuilder.withSorts(SortBuilders.fieldSort("sale").order(SortOrder.DESC));
        } else if(sort == 3){
            // 按价格从低到高
            nativeSearchQueryBuilder.withSorts(SortBuilders.fieldSort("price").order(SortOrder.ASC));
        } else if(sort == 4){
            // 按价格从高到低
            nativeSearchQueryBuilder.withSorts(SortBuilders.fieldSort("price").order(SortOrder.DESC));
        } else{
            // 按相关度，即文档得分
            nativeSearchQueryBuilder.withSorts(SortBuilders.scoreSort().order(SortOrder.DESC));
        }
        // NativeSearchQuery 查询对象
        NativeSearchQuery searchQuery = nativeSearchQueryBuilder.build();
        LOGGER.info("DSL: {}", searchQuery.getQuery().toString());
        // 查询结果Hit数组
        SearchHits<EsProduct> searchHits = elasticsearchRestTemplate.search(searchQuery, EsProduct.class);
        // 查询到的总条数
        if(searchHits.getTotalHits() <= 0){
            // 没有查询到，返回空
            return new PageImpl<>(ListUtil.empty(), pageRequest, 0);
        }
        // 获取查询到的对象
        List<EsProduct> products = searchHits.stream()
                                             .map(SearchHit::getContent)
                                             .collect(Collectors.toList());

        // 封装为分页对象返回
        return new PageImpl<>(products, pageRequest, searchHits.getTotalHits());
    }


    @Override
    public Page<EsProduct> recommend(Long id, Integer pageNum, Integer pageSize)
    {
        // 封装分页信息对象
        Pageable pageable = PageRequest.of(pageNum, pageSize);
        // 从数据库中获取对应id商品
        List<EsProduct> esProductList = productDao.getAllEsProductList(id);
        // 如果获取到该商品
        if(esProductList.size() > 0){
            // 获取该商品对象
            EsProduct esProduct = esProductList.get(0);
            // 获取商品名
            String keyword = esProduct.getName();
            // 获取品牌id
            Long brandId = esProduct.getBrandId();
            // 获取商品属性类别id
            Long productCategoryId = esProduct.getProductCategoryId();
            //根据商品标题、品牌、分类进行搜索
            // 多字段权重排序
            List<FunctionScoreQueryBuilder.FilterFunctionBuilder> filterFunctionBuilders = new ArrayList<>();

            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("name", keyword),
                                           ScoreFunctionBuilders.weightFactorFunction(8)));
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("subTitle", keyword),
                                           ScoreFunctionBuilders.weightFactorFunction(2)));
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("keywords", keyword),
                                           ScoreFunctionBuilders.weightFactorFunction(2)));
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("brandId", brandId),
                                           ScoreFunctionBuilders.weightFactorFunction(5)));
            filterFunctionBuilders.add(new FunctionScoreQueryBuilder
                    .FilterFunctionBuilder(QueryBuilders.matchQuery("productCategoryId", productCategoryId),
                                           ScoreFunctionBuilders.weightFactorFunction(3)));
            FunctionScoreQueryBuilder.FilterFunctionBuilder[] builders =
                    new FunctionScoreQueryBuilder.FilterFunctionBuilder[filterFunctionBuilders.size()];
            filterFunctionBuilders.toArray(builders);

            // 允许自定评分的函数查询
            FunctionScoreQueryBuilder functionScoreQueryBuilder =
                    QueryBuilders.functionScoreQuery(builders)
                                 .scoreMode(FunctionScoreQuery.ScoreMode.SUM)
                                 .setMinScore(2);
            //用于过滤掉相同的商品
            BoolQueryBuilder boolQueryBuilder = new BoolQueryBuilder()
                    .mustNot(QueryBuilders.termQuery("id", id));

            //构建查询条件
            NativeSearchQueryBuilder builder =
                    new NativeSearchQueryBuilder().withQuery(functionScoreQueryBuilder)
                                                  .withFilter(boolQueryBuilder)
                                                  .withPageable(pageable);
            NativeSearchQuery searchQuery = builder.build();
            LOGGER.info("DSL: {}", searchQuery.getQuery().toString());

            SearchHits<EsProduct> searchHits = elasticsearchRestTemplate.search(searchQuery, EsProduct.class);
            if(searchHits.getTotalHits() <= 0){
                return new PageImpl<>(ListUtil.empty(), pageable, 0);
            }
            List<EsProduct> searchProductList =
                    searchHits.stream()
                              .map(SearchHit::getContent)
                              .collect(Collectors.toList());
            return new PageImpl<>(searchProductList, pageable, searchHits.getTotalHits());
        }
        return new PageImpl<>(ListUtil.empty());
    }

    public Page<EsProduct> recommendSub(Long id, Integer pageNum, Integer pageSize)
    {
        // 封装分页信息对象
        PageRequest pageRequest = PageRequest.of(pageNum, pageSize);
        // 从数据库中获取对应id商品
        List<EsProduct> esProducts = productDao.getAllEsProductList(id);
        // 如果获取到该商品
        if(esProducts.size() > 0){
            // 获取该商品对象
            EsProduct esProduct = esProducts.get(0);
            // 获取商品名
            String keyword = esProduct.getName();
            // 获取品牌id
            Long brandId = esProduct.getBrandId();
            // 获取商品属性类别id
            Long productCategoryId = esProduct.getProductCategoryId();
            // 根据商品标题、品牌、分类进行搜索
            // 多字段权重排序
            FunctionScoreQueryBuilder.FilterFunctionBuilder[] builders =
                    new FunctionScoreQueryBuilder.FilterFunctionBuilder[]{
                            new FunctionScoreQueryBuilder
                                    .FilterFunctionBuilder(QueryBuilders.matchQuery("name", keyword),
                                                           ScoreFunctionBuilders.weightFactorFunction(8)),
                            new FunctionScoreQueryBuilder
                                    .FilterFunctionBuilder(QueryBuilders.matchQuery("subTitle", keyword),
                                                           ScoreFunctionBuilders.weightFactorFunction(2)),
                            new FunctionScoreQueryBuilder
                                    .FilterFunctionBuilder(QueryBuilders.matchQuery("keywords", keyword),
                                                           ScoreFunctionBuilders.weightFactorFunction(2)),
                            new FunctionScoreQueryBuilder
                                    .FilterFunctionBuilder(QueryBuilders.matchQuery("brandId", brandId),
                                                           ScoreFunctionBuilders.weightFactorFunction(5)),
                            new FunctionScoreQueryBuilder
                                    .FilterFunctionBuilder(QueryBuilders.matchQuery("productCategoryId", productCategoryId),
                                                           ScoreFunctionBuilders.weightFactorFunction(3))
                    };
            // 构建QueryBuilder
            FunctionScoreQueryBuilder functionScoreQueryBuilder =
                    QueryBuilders.functionScoreQuery(builders) // 允许自定评分的函数查询
                                 .scoreMode(FunctionScoreQuery.ScoreMode.SUM)
                                 .setMinScore(2);
            //用于过滤掉相同的商品
            BoolQueryBuilder boolQueryBuilder = new BoolQueryBuilder()
                    .mustNot(QueryBuilders.termQuery("id", id));

            // 构建nativeSearchQuery
            NativeSearchQuery nativeSearchQuery =
                    new NativeSearchQueryBuilder().withQuery(functionScoreQueryBuilder)
                                                  .withFilter(boolQueryBuilder)
                                                  .withPageable(pageRequest)
                                                  .build();
            LOGGER.info("DSL: {}", nativeSearchQuery.getQuery().toString());
            SearchHits<EsProduct> searchHits = elasticsearchRestTemplate.search(nativeSearchQuery, EsProduct.class);
            LOGGER.info("最大得分：{}", searchHits.getMaxScore());
            LOGGER.info("文档总条数：{}", searchHits.getTotalHits());
            if(searchHits.getTotalHits() <= 0){
                return new PageImpl<>(ListUtil.empty(), pageRequest, 0);
            }
            List<EsProduct> esProductList = searchHits.stream()
                                                      .map(SearchHit::getContent)
                                                      .collect(Collectors.toList());
            return new PageImpl<>(esProductList, pageRequest, searchHits.getTotalHits());
        }
        return new PageImpl<>(ListUtil.empty());
    }

    @Override
    public EsProductRelatedInfo searchRelatedInfo(String keyword)
    {
        NativeSearchQueryBuilder builder = new NativeSearchQueryBuilder();
        //搜索条件
        if(StrUtil.isEmpty(keyword)){
            builder.withQuery(QueryBuilders.matchAllQuery());
        }else{
            builder.withQuery(QueryBuilders.multiMatchQuery(keyword, "name", "subTitle", "keywords"));
        }
        //聚合搜索品牌名称
        builder.withAggregations(AggregationBuilders.terms("brandNames").field("brandName"));
        //集合搜索分类名称
        builder.withAggregations(AggregationBuilders.terms("productCategoryNames").field("productCategoryName"));
        //聚合搜索商品属性，去除type=1的属性
        NestedAggregationBuilder aggregationBuilder =
                AggregationBuilders.nested("allAttrValues",
                                           "attrValueList")
                                   .subAggregation(AggregationBuilders
                                                           .filter("productAttrs",
                                                                   QueryBuilders.termQuery("attrValueList.type",1))
                                                           .subAggregation(AggregationBuilders.terms("attrIds")
                                                                                              .field("attrValueList.productAttributeId")
                                                                                              .subAggregation(AggregationBuilders.terms("attrValues")
                                                                                                                                 .field("attrValueList.value"))
                                                                                              .subAggregation(AggregationBuilders.terms("attrNames")
                                                                                                                                 .field("attrValueList.name"))));
        builder.withAggregations(aggregationBuilder);
        NativeSearchQuery searchQuery = builder.build();
        SearchHits<EsProduct> searchHits = elasticsearchRestTemplate.search(searchQuery, EsProduct.class);
        return convertProductRelatedInfo(searchHits);
    }

    // 这里也不对
    public EsProductRelatedInfo searchRelatedInfoSub(String keyword)
    {
        // 获取NativeSearchQueryBuilder
        NativeSearchQueryBuilder builder = new NativeSearchQueryBuilder();
        //搜索条件
        if(StrUtil.isEmpty(keyword)){
            // 如果关键词为空，就查询所有
            builder.withQuery(QueryBuilders.matchAllQuery());
        } else{
            // 进行多字段查询
            builder.withQuery(QueryBuilders.multiMatchQuery(keyword, "name", "subTitle", "keywords"));
        }
                //聚合搜索品牌名称
        builder.withAggregations(AggregationBuilders.terms("brandNames") // 给分组命名
                                                    .field("brandName")) // 对哪个字段进行聚合函数
               //聚合搜索分类名称
               .withAggregations(AggregationBuilders.terms("productCategoryNames") // 给分组命名
                                                    .field("productCategoryName"));
        //聚合搜索商品属性，去除type=1的属性
        NestedAggregationBuilder aggregationBuilder =
                AggregationBuilders.nested("allAttrValues",
                                           "attrValueList") // 对attrValueList进行聚合查询
                                   // 子聚合
                                   .subAggregations(new AggregatorFactories.Builder()
                                                            // 添加过滤器，取出type=1的attrValue
                                                            .addAggregator(AggregationBuilders.filter("productAttrs",
                                                                                           QueryBuilders.termQuery("attrValueList.type",1)))
                                                            .addAggregator(AggregationBuilders.terms("attrIds") // 使用该名称创建新的聚合
                                                                                              .field("attrValueList.productAttributeId"))
                                                            .addAggregator(AggregationBuilders.terms("attrValues")
                                                                                              .field("attrValueList.value"))
                                                            .addAggregator(AggregationBuilders.terms("attrNames")
                                                                                              .field("attrValueList.name")));
        // 针对前面子聚合，实际上是按这样一种方式聚合
        // "aggregations": { "attrIds": { "aggregations": { "attrValues": {}, "attrNames": {} } } }
        builder.withAggregations(aggregationBuilder);
        // 构建NativeSearchQuery对象
        NativeSearchQuery searchQuery = builder.build();
        SearchHits<EsProduct> searchHits = elasticsearchRestTemplate.search(searchQuery, EsProduct.class);
        return convertProductRelatedInfo(searchHits);
    }

    // 写得不对，当个错误示范
    public EsProductRelatedInfo searchRelatedInfoSub1(String keyword)
    {
        // 获取NativeSearchQueryBuilder
        NativeSearchQueryBuilder nativeSearchQueryBuilder = new NativeSearchQueryBuilder();
        //搜索条件
        if(StrUtil.isEmpty(keyword)){
            // 如果关键词为空，就查询所有
            nativeSearchQueryBuilder.withQuery(QueryBuilders.matchAllQuery());
        } else{
            // 进行多字段查询
            nativeSearchQueryBuilder.withQuery(QueryBuilders.multiMatchQuery(keyword,
                                                                             "name", "subTitle", "keywords"));
        }
                                 //聚合搜索品牌名称
        nativeSearchQueryBuilder.withAggregations(AggregationBuilders.terms("brandNames")
                                                 .field("brandName"))
                                //聚合搜索分类名称
                                .withAggregations(AggregationBuilders.terms("productCategoryNames")
                                                                     .field("productCategoryName"));
        //聚合搜索商品属性，去除type=1的属性
        NestedAggregationBuilder nestedAggregationBuilder = AggregationBuilders.nested("allAttrValues", "attrValueList")
                                                                               .subAggregations(
            																		   // 这里返回的是空
                                                                                       new AggregatorFactories.Builder()
                                                                                               .addAggregator(
                                                                                                       AggregationBuilders
                                                                                                               .filter("productAttrs",
                                                                                                                       QueryBuilders
                                                                                                                               .termQuery("attrValueList.type", 1)))
                                                                                               .addAggregator(
                                                                                                       AggregationBuilders
                                                                                                               .terms("attrIds") // 使用该名称创建新的聚合
                                                                                                               .field("attrValueList.productAttributeId"))
                                                                                               .addAggregator(
                                                                                                       AggregationBuilders
                                                                                                               .terms("attrValues")
                                                                                                               .field("attrValueList.value"))
                                                                                               .addAggregator(
                                                                                                       AggregationBuilders
                                                                                                               .terms("attrNames")
                                                                                                               .field("attrValueList.name")));
        nativeSearchQueryBuilder.withAggregations(nestedAggregationBuilder);
        // 构建NativeSearchQuery对象
        NativeSearchQuery nativeSearchQuery = nativeSearchQueryBuilder.build();
        LOGGER.info("DSL: {}",nativeSearchQuery.getQuery().toString());
        SearchHits<EsProduct> searchHits = elasticsearchRestTemplate.search(nativeSearchQuery, EsProduct.class);
        return convertProductRelatedInfo(searchHits);
    }

    /**
     * 将返回结果转换为对象
     */
    private EsProductRelatedInfo convertProductRelatedInfo(SearchHits<EsProduct> response)
    {
        // 创建EsProductRelatedInfo对象
        EsProductRelatedInfo productRelatedInfo = new EsProductRelatedInfo();
        // 将hits中的aggregations转换为map对象
        Map<String, Aggregation> aggregationMap =
                ((Aggregations) response.getAggregations()
                                        .aggregations()).asMap();
        LOGGER.info("aggregationMap：{}", aggregationMap.toString());
        //设置品牌
        Aggregation brandNames = aggregationMap.get("brandNames");
        List<String> brandNameList = new ArrayList<>();
        for(int i = 0; i < ((Terms) brandNames).getBuckets().size(); i++){
            brandNameList.add(((Terms) brandNames)
                                      .getBuckets()
                                      .get(i)
                                      .getKeyAsString());
        }
        productRelatedInfo.setBrandNames(brandNameList);
        //设置分类
        Aggregation productCategoryNames = aggregationMap.get("productCategoryNames");
        List<String> productCategoryNameList = new ArrayList<>();
        for(int i = 0; i < ((Terms) productCategoryNames).getBuckets().size(); i++){
            productCategoryNameList.add(((Terms) productCategoryNames)
                                                .getBuckets()
                                                .get(i)
                                                .getKeyAsString());
        }
        productRelatedInfo.setProductCategoryNames(productCategoryNameList);
        //设置参数
        Aggregation productAttrs = aggregationMap.get("allAttrValues");
        List<? extends Terms.Bucket> attrIds =
                ((ParsedLongTerms) ((ParsedFilter) ((ParsedNested) productAttrs)
                        .getAggregations()
                        .get("productAttrs"))
                        .getAggregations()
                        .get("attrIds"))
                        .getBuckets();
        List<EsProductRelatedInfo.ProductAttr> attrList = new ArrayList<>();
        for(Terms.Bucket attrId : attrIds){
            EsProductRelatedInfo.ProductAttr attr = new EsProductRelatedInfo.ProductAttr();
            attr.setAttrId((Long) attrId.getKey());
            List<String> attrValueList = new ArrayList<>();
            List<? extends Terms.Bucket> attrValues =
                    ((ParsedStringTerms) attrId.getAggregations()
                                               .get("attrValues"))
                            .getBuckets();
            List<? extends Terms.Bucket> attrNames =
                    ((ParsedStringTerms) attrId.getAggregations()
                                               .get("attrNames"))
                            .getBuckets();
            for(Terms.Bucket attrValue : attrValues){
                attrValueList.add(attrValue.getKeyAsString());
            }
            attr.setAttrValues(attrValueList);
            if(!CollectionUtils.isEmpty(attrNames)){
                String attrName = attrNames.get(0).getKeyAsString();
                attr.setAttrName(attrName);
            }
            attrList.add(attr);
        }
        productRelatedInfo.setProductAttrs(attrList);
        return productRelatedInfo;
    }

    /**
     * 将返回结果转换为对象
     */
    private EsProductRelatedInfo convertProductRelatedInfoSub(SearchHits<EsProduct> response)
    {
        // 创建EsProductRelatedInfo对象
        EsProductRelatedInfo productRelatedInfo = new EsProductRelatedInfo();
        // 将hits中的aggregations转换为map对象
        Map<String, Aggregation> aggregationMap = ((Aggregations) Objects
                .requireNonNull(response.getAggregations())
                .aggregations())
                .asMap();
        //设置品牌
        Terms brandNames = (Terms) aggregationMap.get("brandNames");
        List<String> brandNameList = new ArrayList<>();
        brandNames.getBuckets()
                  .forEach(brandName -> brandNameList.add(brandName.getKeyAsString()));
        productRelatedInfo.setBrandNames(brandNameList);

        //设置分类
        Terms productCategoryNames = (Terms) aggregationMap.get("productCategoryNames");
        List<String> productCategoryNameList = new ArrayList<>();
        productCategoryNames.getBuckets()
                            .forEach(productCategoryName ->
                                             productCategoryNameList
                                                     .add(productCategoryName.getKeyAsString()));
        productRelatedInfo.setProductCategoryNames(productCategoryNameList);

        // 获取nested
        ParsedNested allAttrValues = (ParsedNested) aggregationMap.get("allAttrValues");
        // 获取filter
        ParsedFilter productAttrs = allAttrValues.getAggregations().get("productAttrs");
        // 按照字段类型获取获取terms，attrId为Long类型
        ParsedLongTerms attrIds = productAttrs.getAggregations().get("attrIds");
        // 处理子聚合返回结果，构建为内部类对象
        // 针对前面子聚合，实际上是按这样一种方式聚合
        // "aggregations": { "attrIds": { "aggregations": { "attrValues": {}, "attrNames": {} } } }
        List<EsProductRelatedInfo.ProductAttr> productAttrList = new ArrayList<>();
        attrIds.getBuckets().forEach(attrId -> {
            EsProductRelatedInfo.ProductAttr productAttr = new EsProductRelatedInfo.ProductAttr();
            productAttr.setAttrId(Long.valueOf(attrId.getKey().toString()));
            ParsedStringTerms attrNames = attrId.getAggregations().get("attrNames");
            productAttr.setAttrName(Objects.requireNonNull(attrNames.getBuckets())
                                           .get(0)
                                           .getKeyAsString());
            ParsedStringTerms attrValues = attrId.getAggregations().get("attrValues");
            List<String> attrValueList =
                    attrValues.getBuckets()
                              .stream()
                              .map((MultiBucketsAggregation.Bucket::getKeyAsString))
                              .collect(Collectors.toList());
            productAttr.setAttrValues(attrValueList);
            productAttrList.add(productAttr);
        });
        productRelatedInfo.setProductAttrs(productAttrList);
        return productRelatedInfo;
    }
}
```

### 添加EsProductController定义接口

```java
/**
 * 搜索商品管理Controller
 */
@Controller
@Api(tags = "EsProductController")
@Tag(name = "EsProductController",description = "搜索商品管理")
@RequestMapping("/esProduct")
public class EsProductController
{
    @Resource
    private EsProductService esProductService;

    @ApiOperation(value = "导入所有数据库中商品到ES")
    @RequestMapping(value = "/importAll", method = {RequestMethod.GET, RequestMethod.POST})
    @ResponseBody
    public CommonResult<Integer> importAllList() {
        // 返回导入的数据条数
        int count = esProductService.importAll();
        return CommonResult.success(count);
    }

    @ApiOperation(value = "根据id删除商品")
    @RequestMapping(value = "/delete/{id}", method = RequestMethod.GET)
    @ResponseBody
    public CommonResult<Object> delete(@PathVariable Long id) {
        esProductService.delete(id);
        return CommonResult.success(null);
    }

    @ApiOperation(value = "根据id批量删除商品")
    @RequestMapping(value = "/delete/batch", method = RequestMethod.POST)
    @ResponseBody
    public CommonResult<Object> delete(@RequestParam("ids") List<Long> ids) {
        esProductService.delete(ids);
        return CommonResult.success(null);
    }

    @ApiOperation(value = "根据id创建商品")
    @RequestMapping(value = "/create/{id}", method = RequestMethod.POST)
    @ResponseBody
    public CommonResult<EsProduct> create(@PathVariable Long id) {
        EsProduct esProduct = esProductService.create(id);
        if (esProduct != null) {
            return CommonResult.success(esProduct);
        } else {
            return CommonResult.failed();
        }
    }

    // @RequestParam(required = false)，没有携带参数时将参数设置为空
    @ApiOperation(value = "简单搜索")
    @RequestMapping(value = "/search/simple", method = RequestMethod.GET)
    @ResponseBody
    public CommonResult<CommonPage<EsProduct>> search(@RequestParam(required = false) String keyword,
                                                      @RequestParam(required = false, defaultValue = "0") Integer pageNum,
                                                      @RequestParam(required = false, defaultValue = "5") Integer pageSize) {
        Page<EsProduct> esProductPage = esProductService.search(keyword, pageNum, pageSize);
        return CommonResult.success(CommonPage.restPage(esProductPage));
    }

    @ApiOperation(value = "综合搜索、筛选、排序")
    @ApiImplicitParam(name = "sort", value = "排序字段:0->按相关度；1->按新品；2->按销量；3->价格从低到高；4->价格从高到低",
            defaultValue = "0", allowableValues = "0,1,2,3,4", paramType = "query", dataType = "integer")
    @RequestMapping(value = "/search", method = RequestMethod.GET)
    @ResponseBody
    public CommonResult<CommonPage<EsProduct>> search(@RequestParam(required = false) String keyword,
                                                      @RequestParam(required = false) Long brandId,
                                                      @RequestParam(required = false) Long productCategoryId,
                                                      @RequestParam(required = false, defaultValue = "0") Integer pageNum,
                                                      @RequestParam(required = false, defaultValue = "5") Integer pageSize,
                                                      @RequestParam(required = false, defaultValue = "0") Integer sort) {
        Page<EsProduct> esProductPage = esProductService.search(keyword, brandId, productCategoryId, pageNum, pageSize, sort);
        return CommonResult.success(CommonPage.restPage(esProductPage));
    }

    @ApiOperation(value = "根据商品id推荐商品")
    @RequestMapping(value = "/recommend/{id}", method = RequestMethod.GET)
    @ResponseBody
    public CommonResult<CommonPage<EsProduct>> recommend(@PathVariable Long id,
                                                         @RequestParam(required = false, defaultValue = "0") Integer pageNum,
                                                         @RequestParam(required = false, defaultValue = "5") Integer pageSize) {
        Page<EsProduct> esProductPage = esProductService.recommend(id, pageNum, pageSize);
        return CommonResult.success(CommonPage.restPage(esProductPage));
    }

    @ApiOperation(value = "获取搜索的相关品牌、分类及筛选属性")
    @RequestMapping(value = "/search/relate", method = RequestMethod.GET)
    @ResponseBody
    public CommonResult<EsProductRelatedInfo> searchRelatedInfo(@RequestParam(required = false) String keyword) {
        EsProductRelatedInfo productRelatedInfo = esProductService.searchRelatedInfo(keyword);
        return CommonResult.success(productRelatedInfo);
    }
}
```

### 聚合搜索商品相关信息

> **在搜索商品时，经常会有一个筛选界面来帮助我们找到想要的商品，这里使用Elasticsearch来简单实现下**

- **首先来说下需求，可以根据搜索关键字获取到与关键字匹配商品相关的分类、品牌及属性，下面这张图有助于理解**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

- **这里我们可以使用Elasticsearch的聚合来实现，搜索出相关商品，聚合出商品的品牌、商品的分类以及商品的属性，只要出现次数最多的前十个即可**

- **使用Query DSL调用Elasticsearch的Restful API实现**

```
POST /pms/product/_search
{
  "query": {
    "multi_match": {
      "query": "小米",
      "fields": [
        "name",
        "subTitle",
        "keywords"
      ]
    }
  },
  "size": 0,
  "aggs": {
    "brandNames": {
      "terms": {
        "field": "brandName",
        "size": 10
      }
    },
    "productCategoryNames": {
      "terms": {
        "field": "productCategoryName",
        "size": 10
      }
    },
    "allAttrValues": {
      "nested": {
        "path": "attrValueList"
      },
      "aggs": {
        "productAttrs": {
          "filter": {
            "term": {
              "attrValueList.type": 1
            }
          },
          "aggs": {
            "attrIds": {
              "terms": {
                "field": "attrValueList.productAttributeId",
                "size": 10
              },
              "aggs": {
                "attrValues": {
                  "terms": {
                    "field": "attrValueList.value",
                    "size": 10
                  }
                },
                "attrNames": {
                  "terms": {
                    "field": "attrValueList.name",
                    "size": 10
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

- **在SpringBoot中实现聚合操作比较复杂，已经超出了ElasticsearchRepository的使用范围，需要直接使用ElasticsearchRestTemplate来实现**

```java
public EsProductRelatedInfo searchRelatedInfo(String keyword)
{
    NativeSearchQueryBuilder builder = new NativeSearchQueryBuilder();
    //搜索条件
    if(StrUtil.isEmpty(keyword)){
        // 如果关键词为空，就查询所有
        builder.withQuery(QueryBuilders.matchAllQuery());
    } else{
        // 进行多字段查询
        builder.withQuery(QueryBuilders.multiMatchQuery(keyword, "name", "subTitle", "keywords"));
    }
    //聚合搜索品牌名称
    builder.withAggregations(AggregationBuilders.terms("brandNames").field("brandName"));
    //集合搜索分类名称
    builder.withAggregations(AggregationBuilders.terms("productCategoryNames").field("productCategoryName"));
    //聚合搜索商品属性，去除type=1的属性
    NestedAggregationBuilder aggregationBuilder =
        AggregationBuilders.nested("allAttrValues", "attrValueList")
        .subAggregation(AggregationBuilders.filter("productAttrs", QueryBuilders.termQuery("attrValueList.type",1))
                        .subAggregation(AggregationBuilders.terms("attrIds").field("attrValueList.productAttributeId")
                                        .subAggregation(AggregationBuilders.terms("attrValues").field("attrValueList.value"))
                                        .subAggregation(AggregationBuilders.terms("attrNames").field("attrValueList.name"))));
    builder.withAggregations(aggregationBuilder);
    NativeSearchQuery searchQuery = builder.build();
    SearchHits<EsProduct> searchHits = elasticsearchRestTemplate.search(searchQuery, EsProduct.class);
    return convertProductRelatedInfo(searchHits);
}
```

### 参考资料

> **关于Spring Data Elasticsearch的具体使用可以参考官方文档**

https://docs.spring.io/spring-data/elasticsearch/docs/3.2.6.RELEASE/reference/html/#reference
