---
title: MyBatis Generator
abbrlink: bed8b4fb
date: 2023-02-18 08:07:10
tags: ["工具"]
categories: ["封档"]
description: "封档"
publishDate: 2023-02-18 08:07:10
---

# MyBatis Generator

> **MyBatis Generator（简称MBG）是MyBatis官方提供的代码生成工具，可以通过数据库表直接生成实体类、单表CRUD代码、mapper.xml文件**

## SpringBoot继承MBG

- **在`pom.xml`中添加如下依赖**

```xml
<!--SpringBoot整合MyBatis-->
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>2.1.3</version>
</dependency>
<!--MyBatis分页插件-->
<dependency>
    <groupId>com.github.pagehelper</groupId>
    <artifactId>pagehelper-spring-boot-starter</artifactId>
    <version>1.4.2</version>
</dependency>
<!--集成druid连接池-->
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid-spring-boot-starter</artifactId>
    <version>1.1.10</version>
</dependency>
<!-- MyBatis生成器 -->
<dependency>
    <groupId>org.mybatis.generator</groupId>
    <artifactId>mybatis-generator-core</artifactId>
    <version>1.4.0</version>
</dependency>
<!--Mysql数据库驱动-->
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>8.0.15</version>
</dependency>
<!--Swagger-UI API文档生产工具-->
<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-swagger2</artifactId>
    <version>2.7.0</version>
</dependency>
<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-swagger-ui</artifactId>
    <version>2.7.0</version>
</dependency>
```

- **在`application.yml`中对数据源和`MyBatis`的`mapper.xml`文件路径进行配置，这里进行约定，MBG生成的`xml`文件放在`resources/com/**/mapper`目录下，自定义的`xml`文件放在`resources/mapper`目录下**

```yml
# MyBatis mapper.xml路径配置
mybatis:
  mapper-locations:
    - classpath:mapper/*.xml
    - classpath*:com/**/mapper/*.xml
```

- **添加`Java`配置，用于扫描`Mapper`接口路径，这里进行约定，MBG生成的放在`com.**.mbg.mapper`包下，自定义的放在`com.**.mapper`包下**

```java
@Configuration
@MapperScan({"com.t1k.mall.mbg.mapper", "com.t1k.mall.mapper"})
public class MyBatisConfig {}
```

## 使用代码生成器

- **在使用MBG生成代码前，还需要对其进行一些配置，首先在`generator.properties`文件中配置好数据库连接信息**

```properties
jdbc.driverClass=com.mysql.cj.jdbc.Driver
jdbc.connectionURL=jdbc:mysql://localhost:3306/mall-test-1?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai
jdbc.userId=root
jdbc.password=123
```

- **然后在`generatorConfig.xml`文件中对MBG进行配置，配置属性说明直接参考注释即可**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE generatorConfiguration
        PUBLIC "-//mybatis.org//DTD MyBatis Generator Configuration 1.0//EN"
        "http://mybatis.org/dtd/mybatis-generator-config_1_0.dtd">

<generatorConfiguration>
    <properties resource="generator.properties"/>
    <context id="MySqlContext" targetRuntime="MyBatis3" defaultModelType="flat">
        <property name="beginningDelimiter" value="`"/>
        <property name="endingDelimiter" value="`"/>
        <property name="javaFileEncoding" value="UTF-8"/>
        <!--生成mapper.xml时覆盖原文件-->
        <plugin type="org.mybatis.generator.plugins.UnmergeableXmlMappersPlugin" />
        <!--为模型生成序列化方法-->
        <plugin type="org.mybatis.generator.plugins.SerializablePlugin"/>
        <!--为生成的Java模型创建一个toString方法 -->
        <plugin type="org.mybatis.generator.plugins.ToStringPlugin"/>
        <!--可以自定义生成model的代码注释-->
        <commentGenerator type="com.t1k.mall.mbg.CommentGenerator">
            <!-- 是否去除自动生成的注释 true：是 ： false:否 -->
            <property name="suppressAllComments" value="true"/>
            <property name="suppressDate" value="true"/>
            <property name="addRemarkComments" value="true"/>
        </commentGenerator>
        <!--配置数据库连接-->
        <jdbcConnection driverClass="${jdbc.driverClass}"
                        connectionURL="${jdbc.connectionURL}"
                        userId="${jdbc.userId}"
                        password="${jdbc.password}">
            <!--解决mysql驱动升级到8.0后不生成指定数据库代码的问题-->
            <property name="nullCatalogMeansCurrent" value="true" />
        </jdbcConnection>
        <!--指定生成model的路径-->
        <javaModelGenerator targetPackage="com.t1k.mall.mbg.model" targetProject="mall-test-mbg\src\main\java"/>
        <!--指定生成mapper.xml的路径-->
        <sqlMapGenerator targetPackage="com.t1k.mall.mbg.mapper" targetProject="mall-test-mbg\src\main\resources"/>
        <!--指定生成mapper接口的的路径-->
        <javaClientGenerator type="XMLMAPPER" targetPackage="com.t1k.mall.mbg.mapper"
                             targetProject="mall-test-mbg\src\main\java"/>
        <!--生成全部表tableName设为%-->
        <table tableName="ums_admin">
            <generatedKey column="id" sqlStatement="MySql" identity="true"/>
        </table>
        <table tableName="ums_role">
            <generatedKey column="id" sqlStatement="MySql" identity="true"/>
        </table>
        <table tableName="ums_admin_role_relation">
            <generatedKey column="id" sqlStatement="MySql" identity="true"/>
        </table>
        <table tableName="ums_resource">
            <generatedKey column="id" sqlStatement="MySql" identity="true"/>
        </table>
        <table tableName="ums_resource_category">
            <generatedKey column="id" sqlStatement="MySql" identity="true"/>
        </table>
    </context>
</generatorConfiguration>
```

- **值得一提的是`targetRuntime`属性，设置不同的属性生成的代码和生成代码的使用方式会有所不同，常用的有`MyBatis3`和`MyBatis3DynamicSql`两种，这里使用的是`Mybatis3`**

- **如果想自定义MBG生成的代码，可以自己写一个`CommentGenerator`来继承`DefaultCommentGenerator`，这里我自定义了实体类代码的生成，添加了`Swagger`注解的支持**

```java
package com.t1k.mall.mbg;

import org.mybatis.generator.api.IntrospectedColumn;
import org.mybatis.generator.api.IntrospectedTable;
import org.mybatis.generator.api.dom.java.CompilationUnit;
import org.mybatis.generator.api.dom.java.Field;
import org.mybatis.generator.api.dom.java.FullyQualifiedJavaType;
import org.mybatis.generator.internal.DefaultCommentGenerator;
import org.mybatis.generator.internal.util.StringUtility;

import java.util.Properties;

/**
 * 自定义注释生成器
 */
public class CommentGenerator extends DefaultCommentGenerator
{
    private boolean addRemarkComments = false;
    private static final String EXAMPLE_SUFFIX = "Example";
    private static final String MAPPER_SUFFIX = "Mapper";
    private static final String API_MODEL_PROPERTY_FULL_CLASS_NAME = "io.swagger.annotations.ApiModelProperty";

    /**
     * 设置用户配置的参数
     */
    @Override
    public void addConfigurationProperties(Properties properties)
    {
        super.addConfigurationProperties(properties);
        this.addRemarkComments = StringUtility.isTrue(properties.getProperty("addRemarkComments"));
    }

    /**
     * 给字段添加注释
     */
    @Override
    public void addFieldComment(Field field, IntrospectedTable introspectedTable, IntrospectedColumn introspectedColumn)
    {
        String remarks = introspectedColumn.getRemarks();
        //根据参数和备注信息判断是否添加备注信息
        if(addRemarkComments && StringUtility.stringHasValue(remarks))
        {
            //数据库中特殊字符需要转义
            if(remarks.contains("\""))
            {
                remarks = remarks.replace("\"", "'");
            }
            //给model的字段添加swagger注解
            field.addJavaDocLine("@ApiModelProperty(value = \"" + remarks + "\")");
        }
    }

    @Override
    public void addJavaFileComment(CompilationUnit compilationUnit)
    {
        super.addJavaFileComment(compilationUnit);
        //只在model中添加swagger注解类的导入
        String fullyQualifiedName = compilationUnit.getType().getFullyQualifiedName();
        if(!fullyQualifiedName.contains(MAPPER_SUFFIX) && !fullyQualifiedName.contains(EXAMPLE_SUFFIX))
        {
            compilationUnit.addImportedType(new FullyQualifiedJavaType(API_MODEL_PROPERTY_FULL_CLASS_NAME));
        }
    }
}
```

- **最后编写一个`Generator`类用于生成代码，直接运行`main`方法即可生成所有代码**

```java
package com.t1k.mall.mbg;

import org.mybatis.generator.api.MyBatisGenerator;
import org.mybatis.generator.config.Configuration;
import org.mybatis.generator.config.xml.ConfigurationParser;
import org.mybatis.generator.internal.DefaultShellCallback;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * 用于生产MBG的代码
 */
public class Generator
{
    public static void main(String[] args) throws Exception
    {
        //MBG 执行过程中的警告信息
        List<String> warnings = new ArrayList<>();
        //当生成的代码重复时，覆盖原代码
        boolean overwrite = true;
        //读取我们的 MBG 配置文件
        InputStream is = Generator.class.getResourceAsStream("/generatorConfig.xml");
        ConfigurationParser cp = new ConfigurationParser(warnings);
        Configuration config = cp.parseConfiguration(is);
        is.close();

        DefaultShellCallback callback = new DefaultShellCallback(overwrite);
        //创建 MBG
        MyBatisGenerator myBatisGenerator = new MyBatisGenerator(config, callback, warnings);
        //执行生成代码
        myBatisGenerator.generate(null);
        //输出警告信息
        for(String warning : warnings)
        {
            System.out.println(warning);
        }
    }
}
```

- **一切准备就绪，执行`main`方法，生成代码结构信息如下**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

## 基本CRUD操作

- **查看MBG生成的`Mapper`接口，发现已经包含了基本的CRUD方法，具体SQL实现也已经在`mapper.xml`中生成了，单表CRUD直接调用对应方法即可**

```java
public interface UmsAdminMapper {
    long countByExample(UmsAdminExample example);

    int deleteByExample(UmsAdminExample example);

    int deleteByPrimaryKey(Long id);

    int insert(UmsAdmin record);

    int insertSelective(UmsAdmin record);

    List<UmsAdmin> selectByExample(UmsAdminExample example);

    UmsAdmin selectByPrimaryKey(Long id);

    int updateByExampleSelective(@Param("record") UmsAdmin record, @Param("example") UmsAdminExample example);

    int updateByExample(@Param("record") UmsAdmin record, @Param("example") UmsAdminExample example);

    int updateByPrimaryKeySelective(UmsAdmin record);

    int updateByPrimaryKey(UmsAdmin record);
}public interface UmsAdminMapper {
    long countByExample(UmsAdminExample example);

    int deleteByExample(UmsAdminExample example);

    int deleteByPrimaryKey(Long id);

    int insert(UmsAdmin record);

    int insertSelective(UmsAdmin record);

    List<UmsAdmin> selectByExample(UmsAdminExample example);

    UmsAdmin selectByPrimaryKey(Long id);

    int updateByExampleSelective(@Param("record") UmsAdmin record, @Param("example") UmsAdminExample example);

    int updateByExample(@Param("record") UmsAdmin record, @Param("example") UmsAdminExample example);

    int updateByPrimaryKeySelective(UmsAdmin record);

    int updateByPrimaryKey(UmsAdmin record);
}
```

- **生成代码中有一些Example类，如`UmsAdminExample`，可以把它理解为一个条件构造器，用于构建SQL语句中的各种条件**

![image-20230218092234320](C:/Users/TAK/AppData/Roaming/Typora/typora-user-images/image-20230218092234320.png)

- **利用好MBG生成的代码即可完成单表的CRUD操作，如下**

```java
/**
 * @title UmsAdminServiceImpl
 * @description 后台用户管理Service实现类
 * @author T1k
 * @create 2023/2/18 10:18
 */
@Service
public class UmsAdminServiceImpl implements UmsAdminService
{
    @Resource
    private UmsAdminMapper mbgUmsAdminMapper;
    @Resource
    private MyUmsAdminMapper myUmsAdminMapper;

    @Override
    public void create(UmsAdmin entity)
    {
        // TODO 对参数进行校验
        mbgUmsAdminMapper.insert(entity);
    }

    @Override
    public void update(UmsAdmin entity)
    {
        mbgUmsAdminMapper.updateByPrimaryKeySelective(entity);
    }

    @Override
    public void delete(Long id)
    {
        mbgUmsAdminMapper.deleteByPrimaryKey(id);
    }

    @Override
    public UmsAdmin select(Long id)
    {
        return mbgUmsAdminMapper.selectByPrimaryKey(id);
    }

    @Override
    public List<UmsAdmin> listAll(Integer pageNum, Integer pageSize)
    {
        PageHelper.startPage(pageNum, pageSize);
        return mbgUmsAdminMapper.selectByExample(new UmsAdminExample());
    }
}
```

## 进阶使用

### 条件查询

> **使用Example类构建查询条件可以很方便地实现条件查询**

- **这里以用户名和状态查询后台用户并按创建时间降序排序为例，SQL实现如下**

```mysql
SELECT
	id,
	username,
	PASSWORD,
	icon,
	email,
	nick_name,
	note,
	create_time,
	login_time,
STATUS 
FROM
	ums_admin 
WHERE
	( username = 'macro' AND STATUS IN ( 0, 1 ) ) 
ORDER BY
	create_time DESC;
```

- **对应的Java代码实现如下**

```java
@Override
public List<UmsAdmin> list(Integer pageNum, Integer pageSize, String username, List<Integer> statusList)
{
    PageHelper.startPage(pageNum, pageSize);
    UmsAdminExample umsAdminExample = new UmsAdminExample();
    UmsAdminExample.Criteria criteria = umsAdminExample.createCriteria();
    if(StrUtil.isNotEmpty(username)){
        // where username = #{username}
        criteria.andUsernameEqualTo(username);
    }
    // where status in statusList
    criteria.andStatusIn(statusList);
    // order by create_time desc
    umsAdminExample.setOrderByClause("create_time desc");
    // select * from ums_admin where username = #{username}
    // and status in statusList order by create_time desc
    return mbgUmsAdminMapper.selectByExample(umsAdminExample);
}
```

### 子查询

> **使用MBG生成的代码并不能实现子查询，需要自己手写SQL实现**

- **这里以按角色id查询后台用户为例，首先定义一个`MyUmsAdminMapper`接口，这里约定`com.**.dao`包下存放的都是自定义SQL实现的`Mapper`文件，首先在`MyUmsAdminMapper`接口中添加`subList`方法**

```java
public interface MyUmsAdminMapper
{
    List<UmsAdmin> subList(@Param("roleId") Long roleId);
}
```

- **然后创建一个`MyUmsAdminMapper.xml`文件，对应`MyUmsAdminMapper`接口的SQL实现，注意使用的`BaseResultMap`MBG已经帮我们生成好了，无需自己手写**

```xml
<select id="subList" resultMap="com.t1k.mall.mbg.mapper.UmsAdminMapper.BaseResultMap">
    select * from ums_admin where id in
            (select admin_id from ums_admin_role_relation where role_id = #{roleId})
</select>
```

### Group和Join查询

> **Group和Join查询也不能使用MBG生成的代码实现**

- **这里以按角色统计后台用户数量为例，首先在`Mapper`接口中添加`groupList`方法**

```java
public interface MyUmsAdminMapper
{
    List<RoleStatDto> groupList();
}
```

- **然后在`mapper.xml`中添加对应的SQL实现，可以通过给查询出来的列起别名，直接把列映射到`resultType`所定义的对象中去**

```xml
<select id="groupList" resultType="com.t1k.mall.domain.RoleStatDto">
    select
    		ur.id as roleId,
            ur.name as roleName,
            count(ua.id) as count
    from
            ums_role ur
                left join ums_admin_role_relation uarr on ur.id = uarr.role_id
                left join ums_admin ua on uarr.admin_id = ua.id
    group by
            ur.id
</select>
```

### 条件删除

> **条件删除直接使用Example类构造删除条件即可**

- **这里以按用户名删除后台用户为例，SQL实现如下**

```mysql
delete from ums_admin where username = 'test'
```

- **对应的Java实现为**

```java
@Override
public void deleteByUsername(String username)
{
    UmsAdminExample umsAdminExample = new UmsAdminExample();
    if(StrUtil.isNotEmpty(username)){
        umsAdminExample.createCriteria().andUsernameEqualTo(username);
    }
    mbgUmsAdminMapper.deleteByExample(umsAdminExample);
}
```

### 条件修改

> **条件修改和条件删除类似，直接使用Example类构造修改条件，然后传入修改参数即可**

- **这里以按指定id修改后台用户的状态为例，SQL实现如下**

```mysql
update ums_admin set status = 1 where id in (1, 2)
```

- **对应Java实现为**

```java
@Override
public void updateByIds(List<Long> ids, Integer status)
{
    UmsAdminExample umsAdminExample = new UmsAdminExample();
    UmsAdminExample.Criteria criteria = umsAdminExample.createCriteria();
    criteria.andIdIn(ids);
    UmsAdmin umsAdmin = new UmsAdmin(){{
        setStatus(status);
    }};
    mbgUmsAdminMapper.updateByExample(umsAdmin, umsAdminExample);
}
```

### 一对多查询

> **一对多查询无法直接使用MBG生成的代码实现，需要手写SQL实现，并使用`resultMap`来进行结果集映射**

- **这里以按id查询后台用户信息（包含对应角色列表）为例，先在`mapper`接口中添加`selectWithRoleList`方法**

```java
public interface MyUmsAdminMapper
{
    AdminRoleDto selectWithRoleList(@Param("id") Long id);
}
```

- **然后在`mapper.xml`中添加对应的SQL实现，这里有个小技巧，可以给角色表查询出来的列取个别名，如添加一个`role_`前缀**

```xml
<select id="selectWithRoleList" resultMap="AdminWithRoleResult">
    select
            ua.*,
            ur.name as role_name,
            ur.description as role_description,
            ur.admin_count as role_adminCount,
            ur.create_time as role_createTime,
            ur.sort as role_sort,
            ur.status as role_status
    from
            ums_admin ua
                left join ums_admin_role_relation uarr on ua.id = uarr.admin_id
                left join ums_role ur on uarr.role_id = ur.id
    where
            ua.id = #{id}
</select>
```

- **然后定义一个叫`AdminRoleResult`的`resultMap`，通过`collection`标签直接将以`role_`开头的列映射到`UmsRole`对象中去即可**

```xml
<resultMap id="AdminWithRoleResult" type="com.t1k.mall.domain.AdminRoleDto"
           extends="com.t1k.mall.mbg.mapper.UmsAdminMapper.BaseResultMap">
    <collection property="roleList" resultMap="com.t1k.mall.mbg.mapper.UmsRoleMapper.BaseResultMap"
                columnPrefix="role_">
    </collection>
</resultMap>
```

### 一对一查询

> **一对一查询无法直接使用MBG生成的代码实现，需要手写SQL实现，并使用`resultMap`来进行结果集映射**

- **这里以按id查询资源信息（包括分类信息）为例，现在`mapper`接口中添加`selectResourceWithCate`方法**

```java
public interface MyUmsAdminMapper
{
    ResourceWithCateDto selectResourceWithCate(@Param("id")Long id);
}
```

- **然后在`mapper.xml`中添加对应SQL实现，可以给分类表查询出来的列取个别名，如添加一个`cate_`前缀**

```xml
<select id="selectResourceWithCate" resultMap="ResourceWithCateResult">
    select
            ur.*,
            urc.id as cate_id,
            urc.create_time as cate_createTime,
            urc.name as cate_name,
            urc.sort as cate_sort
    from
            ums_resource ur
                left join ums_resource_category urc on ur.category_id = urc.id
    where
            ur.id = #{id}
</select>
```

- **然后定义一个叫做`ResourceWithCateResult`的`resultMap`，通过`association`标签直接将以`cate_`开头的列映射到`UmsResourceCategory`对象中去即可**

```xml
<resultMap id="ResourceWithCateResult" type="com.t1k.mall.domain.ResourceWithCateDto"
           extends="com.t1k.mall.mbg.mapper.UmsResourceMapper.BaseResultMap">
    <association property="resourceCategory"
                 resultMap="com.t1k.mall.mbg.mapper.UmsResourceCategoryMapper.BaseResultMap"
                 columnPrefix="cate_">
    </association>
</resultMap>
```

