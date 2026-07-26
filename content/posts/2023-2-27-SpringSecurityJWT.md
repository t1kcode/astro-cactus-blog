---
title: SpringSecurity-JWT
abbrlink: ed4aca2b
tags: ["JWT"]
categories: ["封档"]
description: "封档"
publishDate: 2023-02-27 20:24:10
---

# SpringSecurity-JWT

## 简介

**SpringSecurity是Spring家族中的一个安全管理框架，相比于另一个安全框架Shiro，它提供了更丰富的功能，社区资源也比Shiro丰富。**

**一般来说中大型的项目都是使用SpringSecurity来做安全框架，小项目用Shiro的比较多。因为相比于SpringSecurity，Shiro上手更加简单**

**一般Web应用需要进行认证和授权：**

​	**认证：验证当前访问系统的用户是不是本系统用户，并且要确认具体是哪个用户**

​	**授权：经过认证后判断当前用户是否有权限进行某个操作**

**而认证和授权也是SpringSecurity作为安全框架的核心功能**

## 快速入门

### 准备工作

**首先搭建一个简单的SpringBoot工程**

- **添加依赖**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

- **创建Controller**

```java
@RestController
public class testController
{
    @RequestMapping("/hello")
    public String hello()
    {
        return "hello";
    }
}
```

### 引入SpringSecurity

**在SpringBoot项目中使用SpringSecurity只需要添加相应依赖即可**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

**引入依赖后我们尝试去访问之前定义的接口会自动跳转到SpringSecurity的默认登录页面，默认用户名是user，密码会输出在控制台，必须进行登录之后才能对接口进行访问**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

![image-20230227101133806](C:/Users/TAK/AppData/Roaming/Typora/typora-user-images/image-20230227101133806.png)

## 认证

### 本项目登录校验流程

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

### 原理初探

#### SpringSecurity完整流程

<div align=center>
<img src="https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png" style="zoom:50%;"/>
</div>

**图中只展示了核心过滤器，其它的非核心过滤器并没有在图中展示**

- **UsernamePasswordAuthenticationFilter：负责处理我们在登录页面填写了用户名和密码后的登录请求**
- **ExceptionTranslationFilter：处理过滤器链中抛出的任何AccessDeniedException（无权限）和AuthenticationException（认证失败）**
- **FilterSecurityInterceptor：负责权限校验的过滤器**

**我们可以通过Debug查看当前系统中SpringSecurity过滤器链中有哪些过滤器及它们的顺序**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

#### 认证流程详解

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

**概念速查：**

**Authentication接口：它的实现类封装了用户相关信息**

**AuthenticationManager接口：定义了认证Authentication的方法**

**UserDetailsService接口：加载用户特定数据的核心接口，里面定义了一个根据用户名查询用户信息的方法**

**UserDetails接口：提供核心用户信息，通过UserDetailsService根据用户名获取处理的用户信息要封装成UserDetails对象返回，然后将这些信息封装到Authentication对象中**

### 解决问题

#### 思路分析

##### 登录

- **自定义登录接口**
    1. **调用ProviderManager的方法进行认证，如果认证通过生成JWT**
    2. **把用户信息存入redis中**

- **自定义UserDetailsService**
    1. **在其实现类中查询数据库中的用户信息**		

##### 校验

- **定义JWT认证过滤器**
    1. **获取token**
    2. **解析token获取其中的userId**
    3. **从redis中获取用户信息**
    4. **存入SecurityContextHolder**

#### 准备工作

##### 添加依赖

```xml
<!--redis依赖-->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<!--fastjson依赖-->
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>fastjson</artifactId>
    <version>1.2.33</version>
</dependency>
<!--jwt依赖-->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt</artifactId>
    <version>0.9.0</version>
</dependency>
```

##### 添加Redis相关配置

```java
/**
 * Redis使用FastJson序列化
 */
public class FastJsonRedisSerializer<T> implements RedisSerializer<T>
{

    public static final Charset DEFAULT_CHARSET = StandardCharsets.UTF_8;

    private final Class<T> clazz;

    static{
        ParserConfig.getGlobalInstance().setAutoTypeSupport(true);
    }

    public FastJsonRedisSerializer(Class<T> clazz)
    {
        super();
        this.clazz = clazz;
    }

    @Override
    public byte[] serialize(T t) throws SerializationException
    {
        if(t == null){
            return new byte[0];
        }
        return JSON.toJSONString(t, SerializerFeature.WriteClassName).getBytes(DEFAULT_CHARSET);
    }

    @Override
    public T deserialize(byte[] bytes) throws SerializationException
    {
        if(bytes == null || bytes.length <= 0){
            return null;
        }
        String str = new String(bytes, DEFAULT_CHARSET);

        return JSON.parseObject(str, clazz);
    }
    
    protected JavaType getJavaType(Class<?> clazz)
    {
        return TypeFactory.defaultInstance().constructType(clazz);
    }
}
```

```java
@EnableCaching
@Configuration
public class RedisConfig {

    @Bean
    // 忽略unchecked和rawtypes信息
    @SuppressWarnings(value = { "unchecked", "rawtypes" })
    public RedisTemplate<Object, Object> redisTemplate(RedisConnectionFactory connectionFactory)
    {
        RedisTemplate<Object, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        FastJsonRedisSerializer serializer = new FastJsonRedisSerializer(Object.class);

        // 使用StringRedisSerializer来序列化和反序列化redis的key值
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(serializer);

        // Hash的key也采用StringRedisSerializer的序列化方式
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(serializer);

        template.afterPropertiesSet();
        return template;
    }
}
```

##### 响应类

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResponseResult<T> {
    /**
     * 状态码
     */
    private Integer code;
    /**
     * 提示信息，如果有错误时，前端可以获取该字段进行提示
     */
    private String msg;
    /**
     * 查询到的结果数据，
     */
    private T data;

    public ResponseResult(Integer code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public ResponseResult(Integer code, T data) {
        this.code = code;
        this.data = data;
    }

    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public String getMsg() {
        return msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public ResponseResult(Integer code, String msg, T data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }
}
```

##### 工具类

```java
/**
 * JWT工具类
 */
public class JwtUtil {

    //有效期为
    public static final Long JWT_TTL = 60 * 60 *1000L;// 60 * 60 *1000  一个小时
    //设置秘钥明文
    public static final String JWT_KEY = "sangeng";

    public static String getUUID(){
        String token = UUID.randomUUID().toString().replaceAll("-", "");
        return token;
    }
    
    /**
     * 生成jtw
     * @param subject token中要存放的数据（json格式）
     * @return
     */
    public static String createJWT(String subject) {
        JwtBuilder builder = getJwtBuilder(subject, null, getUUID());// 设置过期时间
        return builder.compact();
    }

    /**
     * 生成jtw
     * @param subject token中要存放的数据（json格式）
     * @param ttlMillis token超时时间
     * @return
     */
    public static String createJWT(String subject, Long ttlMillis) {
        JwtBuilder builder = getJwtBuilder(subject, ttlMillis, getUUID());// 设置过期时间
        return builder.compact();
    }

    private static JwtBuilder getJwtBuilder(String subject, Long ttlMillis, String uuid) {
        SignatureAlgorithm signatureAlgorithm = SignatureAlgorithm.HS256;
        SecretKey secretKey = generalKey();
        long nowMillis = System.currentTimeMillis();
        Date now = new Date(nowMillis);
        if(ttlMillis==null){
            ttlMillis=JwtUtil.JWT_TTL;
        }
        long expMillis = nowMillis + ttlMillis;
        Date expDate = new Date(expMillis);
        return Jwts.builder()
                .setId(uuid)              //唯一的ID
                .setSubject(subject)   // 主题  可以是JSON数据
                .setIssuer("sg")     // 签发者
                .setIssuedAt(now)      // 签发时间
                .signWith(signatureAlgorithm, secretKey) //使用HS256对称加密算法签名, 第二个参数为秘钥
                .setExpiration(expDate);
    }

    /**
     * 创建token
     * @param id
     * @param subject
     * @param ttlMillis
     * @return
     */
    public static String createJWT(String id, String subject, Long ttlMillis) {
        JwtBuilder builder = getJwtBuilder(subject, ttlMillis, id);// 设置过期时间
        return builder.compact();
    }

    public static void main(String[] args) throws Exception {
        String token = "eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJkMzk3MTNmM2E0ZDU0ZTM4YjNjZTJmZjUzOGJhNjY0YSIsInN1YiI6IjEyMyIsImlzcyI6InNnIiwiaWF0IjoxNjc3Mzk2NjA3LCJleHAiOjE2Nzc0MDAyMDd9.UHpbEoNVslzF52C6P1dRgUc8W4OkmDbaLXRxgBInhk4";
        Claims claims = parseJWT(token);
        System.out.println(claims);
    }

    /**
     * 生成加密后的秘钥 secretKey
     * @return
     */
    public static SecretKey generalKey() {
        byte[] encodedKey = Base64.getDecoder().decode(JwtUtil.JWT_KEY);
        SecretKey key = new SecretKeySpec(encodedKey, 0, encodedKey.length, "AES");
        return key;
    }
    
    /**
     * 解析
     * @param jwt
     * @return
     * @throws Exception
     */
    public static Claims parseJWT(String jwt) throws Exception {
        SecretKey secretKey = generalKey();
        return Jwts.parser()
                .setSigningKey(secretKey)
                .parseClaimsJws(jwt)
                .getBody();
    }
}
```

```java
@SuppressWarnings(value = { "unchecked", "rawtypes" })
@Component
public class RedisCache
{
    @Resource
    public RedisTemplate redisTemplate;

    /**
     * 缓存基本的对象，Integer、String、实体类等
     * @param key 缓存的键值
     * @param value 缓存的值
     */
    public <T> void setCacheObject(final String key, final T value)
    {
        redisTemplate.opsForValue().set(key, value);
    }

    /**
     * 缓存基本的对象，Integer、String、实体类等
     * @param key 缓存的键值
     * @param value 缓存的值
     * @param timeout 时间
     * @param timeUnit 时间颗粒度
     */
    public <T> void setCacheObject(final String key, final T value, final Integer timeout, final TimeUnit timeUnit)
    {
        redisTemplate.opsForValue().set(key, value, timeout, timeUnit);
    }

    /**
     * 设置有效时间
     * @param key Redis键
     * @param timeout 超时时间
     * @return true=设置成功；false=设置失败
     */
    public boolean expire(final String key, final long timeout)
    {
        return expire(key, timeout, TimeUnit.SECONDS);
    }

    /**
     * 设置有效时间
     * @param key Redis键
     * @param timeout 超时时间
     * @param unit 时间单位
     * @return true=设置成功；false=设置失败
     */
    public boolean expire(final String key, final long timeout, final TimeUnit unit)
    {
        return redisTemplate.expire(key, timeout, unit);
    }

    /**
     * 获得缓存的基本对象。
     * @param key 缓存键值
     * @return 缓存键值对应的数据
     */
    public <T> T getCacheObject(final String key)
    {
        ValueOperations<String, T> operation = redisTemplate.opsForValue();
        return operation.get(key);
    }

    /**
     * 删除单个对象
     * @param key
     */
    public boolean deleteObject(final String key)
    {
        return redisTemplate.delete(key);
    }

    /**
     * 删除集合对象
     * @param collection 多个对象
     * @return
     */
    public Long deleteObject(final Collection collection)
    {
        return redisTemplate.delete(collection);
    }

    /**
     * 缓存List数据
     * @param key 缓存的键值
     * @param dataList 待缓存的List数据
     * @return 缓存的对象
     */
    public <T> long setCacheList(final String key, final List<T> dataList)
    {
        Long count = redisTemplate.opsForList().rightPushAll(key, dataList);
        return count == null ? 0 : count;
    }

    /**
     * 获得缓存的list对象
     * @param key 缓存的键值
     * @return 缓存键值对应的数据
     */
    public <T> List<T> getCacheList(final String key)
    {
        return redisTemplate.opsForList().range(key, 0, -1);
    }

    /**
     * 缓存Set
     * @param key 缓存键值
     * @param dataSet 缓存的数据
     * @return 缓存数据的对象
     */
    public <T> BoundSetOperations<String, T> setCacheSet(final String key, final Set<T> dataSet)
    {
        BoundSetOperations<String, T> setOperation = redisTemplate.boundSetOps(key);
        Iterator<T> it = dataSet.iterator();
        while (it.hasNext())
        {
            setOperation.add(it.next());
        }
        return setOperation;
    }

    /**
     * 获得缓存的set
     * @param key
     * @return
     */
    public <T> Set<T> getCacheSet(final String key)
    {
        return redisTemplate.opsForSet().members(key);
    }

    /**
     * 缓存Map
     * @param key
     * @param dataMap
     */
    public <T> void setCacheMap(final String key, final Map<String, T> dataMap)
    {
        if (dataMap != null) {
            redisTemplate.opsForHash().putAll(key, dataMap);
        }
    }

    /**
     * 获得缓存的Map
     * @param key
     * @return
     */
    public <T> Map<String, T> getCacheMap(final String key)
    {
        return redisTemplate.opsForHash().entries(key);
    }

    /**
     * 往Hash中存入数据
     * @param key Redis键
     * @param hKey Hash键
     * @param value 值
     */
    public <T> void setCacheMapValue(final String key, final String hKey, final T value)
    {
        redisTemplate.opsForHash().put(key, hKey, value);
    }

    /**
     * 获取Hash中的数据
     * @param key Redis键
     * @param hKey Hash键
     * @return Hash中的对象
     */
    public <T> T getCacheMapValue(final String key, final String hKey)
    {
        HashOperations<String, String, T> opsForHash = redisTemplate.opsForHash();
        return opsForHash.get(key, hKey);
    }

    /**
     * 删除Hash中的数据
     * @param key
     * @param hkey
     */
    public void delCacheMapValue(final String key, final String hkey)
    {
        HashOperations hashOperations = redisTemplate.opsForHash();
        hashOperations.delete(key, hkey);
    }

    /**
     * 获取多个Hash中的数据
     * @param key Redis键
     * @param hKeys Hash键集合
     * @return Hash对象集合
     */
    public <T> List<T> getMultiCacheMapValue(final String key, final Collection<Object> hKeys)
    {
        return redisTemplate.opsForHash().multiGet(key, hKeys);
    }

    /**
     * 获得缓存的基本对象列表
     * @param pattern 字符串前缀
     * @return 对象列表
     */
    public Collection<String> keys(final String pattern)
    {
        return redisTemplate.keys(pattern);
    }
}
```

```java
public class WebUtils
{
    /**
     * 将字符串渲染到客户端
     * @param response 渲染对象
     * @param string 待渲染的字符串
     */
    public static void renderString(HttpServletResponse response, String string)
    {
        try{
            response.setStatus(200);
            response.setContentType("application/json");
            response.setCharacterEncoding("utf-8");
            response.getWriter().print(string);
        }catch(IOException e){
            e.printStackTrace();
        }
    }
}
```

##### 实体类

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
@TableName("sys_user")
public class User implements Serializable {
    private static final long serialVersionUID = -40356785423868312L;
    
    /**
    * 主键
    */
    @TableId(type = IdType.AUTO)
    private Long id;
    /**
    * 用户名
    */
    private String userName;
    /**
    * 昵称
    */
    private String nickName;
    /**
    * 密码
    */
    private String password;
    /**
    * 账号状态（0正常 1停用）
    */
    private String status;
    /**
    * 邮箱
    */
    private String email;
    /**
    * 手机号
    */
    private String phonenumber;
    /**
    * 用户性别（0男，1女，2未知）
    */
    private String sex;
    /**
    * 头像
    */
    private String avatar;
    /**
    * 用户类型（0管理员，1普通用户）
    */
    private String userType;
    /**
    * 创建人的用户id
    */
    private Long createBy;
    /**
    * 创建时间
    */
    private Date createTime;
    /**
    * 更新人
    */
    private Long updateBy;
    /**
    * 更新时间
    */
    private Date updateTime;
    /**
    * 删除标志（0代表未删除，1代表已删除）
    */
    private Integer delFlag;
}
```

#### 实现

##### 数据库校验用户

**从之前分析中可知道，我们可以自定义一个UserDetailsService，让SpringSecurity使用我们的UserDetailsService，其可以实现从数据库中查询用户名和密码**

###### 准备工作

```mysql
CREATE TABLE `sys_user` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_name` VARCHAR(64) NOT NULL DEFAULT 'NULL' COMMENT '用户名',
  `nick_name` VARCHAR(64) NOT NULL DEFAULT 'NULL' COMMENT '昵称',
  `password` VARCHAR(64) NOT NULL DEFAULT 'NULL' COMMENT '密码',
  `status` CHAR(1) DEFAULT '0' COMMENT '账号状态（0正常 1停用）',
  `email` VARCHAR(64) DEFAULT NULL COMMENT '邮箱',
  `phonenumber` VARCHAR(32) DEFAULT NULL COMMENT '手机号',
  `sex` CHAR(1) DEFAULT NULL COMMENT '用户性别（0男，1女，2未知）',
  `avatar` VARCHAR(128) DEFAULT NULL COMMENT '头像',
  `user_type` CHAR(1) NOT NULL DEFAULT '1' COMMENT '用户类型（0管理员，1普通用户）',
  `create_by` BIGINT(20) DEFAULT NULL COMMENT '创建人的用户id',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` BIGINT(20) DEFAULT NULL COMMENT '更新人',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `del_flag` INT(11) DEFAULT '0' COMMENT '删除标志（0代表未删除，1代表已删除）',
  PRIMARY KEY (`id`)
) ENGINE=INNODB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COMMENT='用户表'
```

**引入MybatisPlus和MySQL驱动的依赖**

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <version>3.4.3</version>
</dependency>
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
</dependency>
```

**定义Mapper接口**

```java
public interface UserMapper extends BaseMapper<User> {}
```

###### 核心代码实现

**创建一个类实现UserDetailsService接口，重写其中的方法，根据用户名从数据库中查询用户信息**

```java
public class UserDetailsServiceImpl implements UserDetailsService
{
    @Resource
    private UserMapper userMapper;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException
    {
        // 根据用户名查询用户信息
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUserName, username);
        User user = userMapper.selectOne(wrapper);
        // 若查询不到则抛出异常
        if(Objects.isNull(user)) throw new RuntimeException("用户名或密码错误");
        //TODO 根据用户id查询权限信息，并封装到LoginUser中

        // 封装成UserDetails对象返回
        return new LoginUser(user);
    }
}
```

**因为UserDetailsService方法的返回值是UserDetails类型，所以需要定义一个类，实现该接口，并把用户信息封装在其中**

```java
@Data
@NoArgsConstructor
public class LoginUser implements UserDetails
{

    private User user;

    private List<String> permissions;

    // 忽略序列化
    @JSONField(serialize = false)
    private List<GrantedAuthority> authorities;

    public LoginUser(User user, List<String> permissions)
    {
        this.user = user;
        this.permissions = permissions;
    }

    public LoginUser(User user)
    {
        this.user = user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities()
    {
        // 把permissions中string类型的权限信息封装成SimpleGrantedAuthority对象
        if(ObjectUtils.isEmpty(authorities)){
            authorities = permissions.stream()
                                     .map(SimpleGrantedAuthority::new)
                                     .collect(Collectors.toList());
        }
        return authorities;
    }

    @Override
    public String getPassword()
    {
        return user.getPassword();
    }

    @Override
    public String getUsername()
    {
        return user.getUserName();
    }

    @Override
    public boolean isAccountNonExpired()
    {
        return true;
    }

    @Override
    public boolean isAccountNonLocked()
    {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired()
    {
        return true;
    }

    @Override
    public boolean isEnabled()
    {
        return true;
    }
}
```

**注：在数据库中如果用户的密码是明文存储，需要在密码前加{noop}**

##### 密码加密存储

**实际项目中我们不会把密码明文存储在数据库中，默认使用的PasswordEncoder要求数据库中的密码格式为：{id}password，它会根据id去判断密码的加密方式，但是我们一般不会采用这种方式，所以就需要替换PasswordEncoder**

**我们一般使用SpringSecurity为我们提供的BCryptPasswordEncoder**

**我们只需要将BCryptPasswordEncoder对象注入Spring容器中，SpringSecurity就会使用该PasswordEncoder来进行密码校验**

**我们可以定义一个SpringSecurity的配置类，SpringSecurity要求这个配置类要继承WebSecurityConfigurerAdapter**

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter 
{
    @Bean
    public PasswordEncoder passwordEncoder()
    {
        return new BCryptPasswordEncoder();
    }
}
```

##### 登录接口

**接下来我们需要自定义登录接口，然后让SpringSecurity对这个接口放行，让用户访问这个接口的时候不用登录也能访问**

**在接口中我们通过AuthenticationManager的authenticate方法来进行用户认证，所以需要在SecurityCongfig中配置AuthenticationManager注入容器**

**认证成功的话要生成一个JWT，放入响应中返回，并且为了让用户下次请求时能通过JWT识别出具体是哪个用户，我们需要把用户信息存入redis，可以把用户id作为key**

```java
@PostMapping("/user/login")
public ResponseResult<Map<String, String>> login(@RequestBody User user)
{
    return loginService.login(user);
}
```

```java
@Configuration
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig extends WebSecurityConfigurerAdapter
{
    @Resource
    private JwtAuthenticationTokenFilter jwtAuthenticationTokenFilter;

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Override
    @Bean
    public AuthenticationManager authenticationManagerBean() throws Exception
    {
        return super.authenticationManagerBean();
    }

    @Override
    protected void configure(HttpSecurity http) throws Exception
    {
        http
                //关闭csrf
                .csrf().disable()
                //不通过Session获取SecurityContext
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authorizeRequests()
                // 对于登录接口 允许匿名访问
                .antMatchers("/user/login").anonymous()
                // 除上面外的所有请求全部需要鉴权认证
                .anyRequest().authenticated();

        http.addFilterBefore(jwtAuthenticationTokenFilter, UsernamePasswordAuthenticationFilter.class);
    }
}
```

```java
@Service
public class LoginServiceImpl implements LoginService
{
    @Resource
    private AuthenticationManager authenticationManager;

    @Resource
    private RedisCache redisCache;

    @Override
    public ResponseResult<Map<String, String>> login(User user)
    {

        // AuthenticationManager authenticate进行用户认证
        // 因为其认证需要Authentication对象，UsernamePasswordAuthenticationToken是其一个实现类
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(user.getUserName(), user.getPassword());
        Authentication authenticate = authenticationManager.authenticate(authenticationToken);
        // 如果authenticate为空则没有通过认证，则抛出异常
        if(Objects.isNull(authenticate)) {
            throw new RuntimeException("用户名或密码错误");
        }

        // 如果认证通过了，使用userid生成一个jwt jwt存入ResponseResult返回
        LoginUser loginUser = (LoginUser) authenticate.getPrincipal();
        Long id = loginUser.getUser().getId();
        String jwt = JwtUtil.createJWT(id.toString());
        Map<String, String> map = new HashMap<String, String>(){{
            put("token", jwt);
        }};

        // 将用户信息存入redis
        redisCache.setCacheObject("login:" + id, loginUser);

        return new ResponseResult<>(200, "登录成功", map);
    }
}
```

**注：实际上SecurityConfig继承WebSecurityConfigurerAdapter这种方式已经过时了，更推荐下面这种方式**

```java
@Configuration
@EnableGlobalMethodSecurity(prePostEnabled = true)
@EnableWebSecurity
public class SecurityConfig
{
    @Resource
    private JwtAuthenticationTokenFilter jwtAuthenticationTokenFilter;

    @Resource
    private AccessDeniedHandlerImpl accessDeniedHandler;

    @Resource
    private AuthenticationEntryPointImpl authenticationEntryPoint;

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception
    {
        return configuration.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception
    {
        http
                //关闭csrf
                .csrf().disable()
                //不通过Session获取SecurityContext
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authorizeRequests()
                // 对于登录接口 允许匿名访问
                .antMatchers("/user/login").anonymous()
                // 除上面外的所有请求全部需要鉴权认证
                .anyRequest().authenticated();

        // 将jwt过滤链放到UsernamePassword过滤链前
        http.addFilterBefore(jwtAuthenticationTokenFilter, UsernamePasswordAuthenticationFilter.class);

        // 自定义权限异常和认证异常处理类
        http.exceptionHandling()
            .accessDeniedHandler(accessDeniedHandler)
            .authenticationEntryPoint(authenticationEntryPoint);

        // 开启跨域
        http.cors();
        return http.build();
    }
}
```

##### 认证过滤器

**我们需要自定义一个过滤器，这个过滤器会去获取请求头中的token，对token进行解析取出其中的userId**

**使用userId去redis中获取对应的LoginUser对象**

**然后封装Authentication对象存入SecurityContextHolder**

```java
@Component
public class JwtAuthenticationTokenFilter extends OncePerRequestFilter
{
    @Resource
    private RedisCache redisCache;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
    throws ServletException, IOException
    {
        // 获取token
        String token = request.getHeader("token");

        // 如果请求头中没有token，则放行
        if(!StringUtils.hasText(token)){
            filterChain.doFilter(request, response);
            return;
        }

        // 根据JWT获取用户id
        String userId;
        try{
            Claims claims = JwtUtil.parseJWT(token);
            userId = claims.getSubject();
        }catch(Exception e){
            e.printStackTrace();
            throw new RuntimeException("token非法");
        }

        // 从redis中获取用户信息
        LoginUser loginUser = redisCache.getCacheObject("login:" + userId);
        if(Objects.isNull(loginUser)){
            throw new RuntimeException("用户未登录");
        }

        // 存入SecurityContextHolder
        // 这里必须使用三个构造参数的构造方法，因为其有super.setAuthenticated(true);
        // 代表该用户是否为已认证的状态
        // 获取权限信息封装到Authentication中
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(loginUser, null, null);
        SecurityContextHolder.getContext().setAuthentication(authenticationToken);

        // 放行
        filterChain.doFilter(request, response);
    }
}
```

**在SecurityConfig中引用该过滤链，并将其添加到UsernamePassword过滤链前面**

##### 退出登录

**我们只需要定义一个登出接口，然后获取SecurityContextHolder中的认证信息，删除redis中对应的数据即可**

```java
public ResponseResult<Void> logout()
{
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    LoginUser loginUser = (LoginUser) authentication.getPrincipal();
    Long id = loginUser.getUser().getId();
    redisCache.deleteObject("login:" + id);
    return new ResponseResult<>(200, "登出成功");
}
```

## 授权

### 权限系统的作用

**不同的用户可以使用不同的功能，这就是权限系统要实现的效果**

### 授权基本流程

**在SpringSecurity中，会使用默认的FilterSecurityInterceptor来进行权限校验。在FilterSecurityInterceptor中会从SecurityContextHolder获取其中的Authentication，然后获取其中的权限信息，当前用户是否拥有访问当前资源所需的权限**

**所以我们在项目中只需要把当前登录用户的权限信息也存入Authentication**

**然后设置我们的资源所需要的权限即可**

### 授权实现

#### 限制访问资源所需权限

**SpringSecurity为我们提供了基于注解的权限控制方案，这也是我们项目中主要采用的方式，我们可以使用注解去指定访问对应的资源所需权限**

**但是使用它需要先开启配置**

```java
@EnableGlobalMethodSecurity(prePostEnabled = true)
```

**然后就可以使用对应注解，如`@PreAuthorize`**

```java
@PreAuthorize("hasAuthority('user')")
@RequestMapping("/hello")
public String hello()
{
    return "hello";
}
```

#### 封装权限信息

**我们前面在写UserDetailsServiceImpl时说过，在查询出用户后还要获取对应的权限信息，封装到UserDetails对象中返回**

**我们之前定义了UserDetails的实现类LoginUser，想要让其能封装权限信息需要对其进行修改**

```java
@Data
@NoArgsConstructor
public class LoginUser implements UserDetails
{

    private User user;

    private List<String> permissions;

    // 忽略序列化
    @JSONField(serialize = false)
    private List<GrantedAuthority> authorities;

    public LoginUser(User user, List<String> permissions)
    {
        this.user = user;
        this.permissions = permissions;
    }

    public LoginUser(User user)
    {
        this.user = user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities()
    {
        // 把permissions中string类型的权限信息封装成SimpleGrantedAuthority对象
        if(ObjectUtils.isEmpty(authorities)){
            authorities = permissions.stream()
                                     .map(SimpleGrantedAuthority::new)
                                     .collect(Collectors.toList());
        }
        return authorities;
    }

    @Override
    public String getPassword()
    {
        return user.getPassword();
    }

    @Override
    public String getUsername()
    {
        return user.getUserName();
    }

    @Override
    public boolean isAccountNonExpired()
    {
        return true;
    }

    @Override
    public boolean isAccountNonLocked()
    {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired()
    {
        return true;
    }

    @Override
    public boolean isEnabled()
    {
        return true;
    }
}
```

**LoginUser修改完后就可以在UserDetailsServiceImpl中将权限信息封装到LoginUser中了**

##### 从数据库查询权限信息

###### RBAC权限模型

**RBAC权限模型（Role-Based Access Control）即：基于角色的权限控制，这是目前最常被开发者使用也是相对易用的通用权限模型**

###### 准备工作

```mysql
DROP TABLE IF EXISTS `sys_menu`;

CREATE TABLE `sys_menu` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `menu_name` varchar(64) NOT NULL DEFAULT 'NULL' COMMENT '菜单名',
  `path` varchar(200) DEFAULT NULL COMMENT '路由地址',
  `component` varchar(255) DEFAULT NULL COMMENT '组件路径',
  `visible` char(1) DEFAULT '0' COMMENT '菜单状态（0显示 1隐藏）',
  `status` char(1) DEFAULT '0' COMMENT '菜单状态（0正常 1停用）',
  `perms` varchar(100) DEFAULT NULL COMMENT '权限标识',
  `icon` varchar(100) DEFAULT '#' COMMENT '菜单图标',
  `create_by` bigint(20) DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint(20) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `del_flag` int(11) DEFAULT '0' COMMENT '是否删除（0未删除 1已删除）',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COMMENT='菜单表';

/*Table structure for table `sys_role` */

DROP TABLE IF EXISTS `sys_role`;

CREATE TABLE `sys_role` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(128) DEFAULT NULL,
  `role_key` varchar(100) DEFAULT NULL COMMENT '角色权限字符串',
  `status` char(1) DEFAULT '0' COMMENT '角色状态（0正常 1停用）',
  `del_flag` int(1) DEFAULT '0' COMMENT 'del_flag',
  `create_by` bigint(200) DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_by` bigint(200) DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

/*Table structure for table `sys_role_menu` */

DROP TABLE IF EXISTS `sys_role_menu`;

CREATE TABLE `sys_role_menu` (
  `role_id` bigint(200) NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `menu_id` bigint(200) NOT NULL DEFAULT '0' COMMENT '菜单id',
  PRIMARY KEY (`role_id`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;

/*Table structure for table `sys_user` */

DROP TABLE IF EXISTS `sys_user`;

CREATE TABLE `sys_user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_name` varchar(64) NOT NULL DEFAULT 'NULL' COMMENT '用户名',
  `nick_name` varchar(64) NOT NULL DEFAULT 'NULL' COMMENT '昵称',
  `password` varchar(64) NOT NULL DEFAULT 'NULL' COMMENT '密码',
  `status` char(1) DEFAULT '0' COMMENT '账号状态（0正常 1停用）',
  `email` varchar(64) DEFAULT NULL COMMENT '邮箱',
  `phonenumber` varchar(32) DEFAULT NULL COMMENT '手机号',
  `sex` char(1) DEFAULT NULL COMMENT '用户性别（0男，1女，2未知）',
  `avatar` varchar(128) DEFAULT NULL COMMENT '头像',
  `user_type` char(1) NOT NULL DEFAULT '1' COMMENT '用户类型（0管理员，1普通用户）',
  `create_by` bigint(20) DEFAULT NULL COMMENT '创建人的用户id',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `update_by` bigint(20) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `del_flag` int(11) DEFAULT '0' COMMENT '删除标志（0代表未删除，1代表已删除）',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

/*Table structure for table `sys_user_role` */

DROP TABLE IF EXISTS `sys_user_role`;

CREATE TABLE `sys_user_role` (
  `user_id` bigint(200) NOT NULL AUTO_INCREMENT COMMENT '用户id',
  `role_id` bigint(200) NOT NULL DEFAULT '0' COMMENT '角色id',
  PRIMARY KEY (`user_id`,`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```mysql
SELECT
    DISTINCT t4.perms
FROM
    sys_user_role t1
        LEFT JOIN sys_role t2 ON t1.role_id = t2.id
        LEFT JOIN sys_role_menu t3 ON t1.role_id = t3.role_id
        LEFT JOIN sys_menu t4 ON t3.menu_id = t4.id
WHERE
    t1.user_id = #{userId}
    AND t2.`status` = 0
    AND t4.`status` = 0
```

```java
@TableName(value = "sys_menu")
@Data
@AllArgsConstructor
@NoArgsConstructor
// 某些字段为空时该字段不会被序列化
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Menu implements Serializable
{
    private static final long serialVersionUID = -54979041104113736L;

    @TableId
    private Long id;
    /**
     * 菜单名
     */
    private String menuName;
    /**
     * 路由地址
     */
    private String path;
    /**
     * 组件路径
     */
    private String component;
    /**
     * 菜单状态（0显示 1隐藏）
     */
    private String visible;
    /**
     * 菜单状态（0正常 1停用）
     */
    private String status;
    /**
     * 权限标识
     */
    private String perms;
    /**
     * 菜单图标
     */
    private String icon;

    private Long createBy;

    private Date createTime;

    private Long updateBy;

    private Date updateTime;
    /**
     * 是否删除（0未删除 1已删除）
     */
    private Integer delFlag;
    /**
     * 备注
     */
    private String remark;
}
```

###### 代码实现

```java
public interface MenuMapper extends BaseMapper<Menu>
{
    List<String> selectPermsByUserId(Long userId);
}
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.t1k.mall.mapper.MenuMapper">

    <select id="selectPermsByUserId" resultType="java.lang.String">
        SELECT
            DISTINCT t4.perms
        FROM
            sys_user_role t1
                LEFT JOIN sys_role t2 ON t1.role_id = t2.id
                LEFT JOIN sys_role_menu t3 ON t1.role_id = t3.role_id
                LEFT JOIN sys_menu t4 ON t3.menu_id = t4.id
        WHERE
            t1.user_id = #{userId}
              AND t2.`status` = 0
              AND t4.`status` = 0
    </select>

</mapper>
```

**然后在UserDetailsServiceImpl中调用mapper中的方法查询权限信息封装到LoginUser对象中即可**

## 自定义异常处理

**我们还希望在认证失败或者是授权失败的情况下也能和我们的接口一样返回相同结构的JSON，这样可以让前端能对响应进行统一的处理，要实现这个功能我们需要知道SpringSecurity的异常处理机制**

**在SpringSecurity中，如果我们在认证或者授权的过程中出现了异常会被ExceptionTranslationFilter捕获到，在ExceptionTranslationFilter中会去判断是认证失败还是授权失败出现的异常**

- **如果是认证过程中出现的异常会被封装成AuthenticationException，然后调用AuthenticationEntryPoint对象的方法去进行异常处理**

- **如果是授权过程中出现的异常会被封装AccessDeniedException，然后调用AccessDeniedHandler对象的方法去进行异常处理**

**所以如果我们需要自定义异常处理，我们只需要自定义AuthenticationEntryPoint和AccessDeniedHandler然后配置给SpringSecurity即可**

```java
@Component
public class AccessDeniedHandlerImpl implements AccessDeniedHandler
{
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException, ServletException
    {
        ResponseResult<Void> result = new ResponseResult<>(HttpStatus.FORBIDDEN.value(), "权限不足");
        String json = JSON.toJSONString(result);
        WebUtils.renderString(response, json);
    }
}
```

```java
@Component
public class AuthenticationEntryPointImpl implements AuthenticationEntryPoint
{
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws
                                                                                                                          IOException,
                                                                                                                          ServletException
    {
        ResponseResult<Void> result = new ResponseResult<>(HttpStatus.UNAUTHORIZED.value(), "认证失败请重新登录");
        String json = JSON.toJSONString(result);
        WebUtils.renderString(response, json);
    }
}

```

**再配置给SpringSecurity即可**

```java
// 自定义权限异常和认证异常处理类
http.exceptionHandling()
    .accessDeniedHandler(accessDeniedHandler)
    .authenticationEntryPoint(authenticationEntryPoint);
```

## 跨域

**浏览器出于安全的考虑，使用XMLHttpRequest对象发起HTTP请求时必须遵守同源策略，否则就是跨域的HTTP请求，默认情况下是被禁止的，同源策略要求源相同才能正常进行通信，即协议、域名、端口号都完全一致**

**前后端分离项目，前端项目和后端项目一般都不是同源的，所以肯定会存在跨域请求的问题**

**所以我们要让前端能进行跨域请求**

- **先对SpringBoot配置，允许跨域请求**

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer
{

    @Override
    public void addCorsMappings(CorsRegistry registry) {
      	// 设置允许跨域的路径
        registry.addMapping("/**")
                // 设置允许跨域请求的域名
                .allowedOriginPatterns("*")
                // 是否允许cookie
                .allowCredentials(true)
                // 设置允许的请求方式
                .allowedMethods("GET", "POST", "DELETE", "PUT")
                // 设置允许的header属性
                .allowedHeaders("*")
                // 跨域允许时间
                .maxAge(3600);
    }
}
```

- **开启SpringSecurity的跨域访问**

**由于我们的资源都会收到SpringSecurity的保护，所以想要跨域访问还要让SpringSecurity允许跨域访问**

```java
http.cors();
```

## 遗留小问题

### 其它权限校验方法

**我们前面都是使用@PreAuthorize注解，然后在其中使用的是hasAuthority方法进行校验，SpringSecurity还为我们提供了其它方法例如：hasAnyAuthority，hasRole，hasAnyRole等**

**hasAuthority方法实际是执行到了SecurityExpressionRoot的hasAuthority，它内部其实是调用authentication的getAuthorities方法获取用户的权限列表，然后判断我们存入的方法参数数据是否在权限列表中**

**hasAnyAuthority方法可以传入多个权限，只要用户有其中任意一个权限都可以访问对应资源**

```java
@PreAuthorize("hasAnyAuthority('admin','test','system:dept:list')")
public String hello(){
    return "hello";
}
```

**hasRole要求有对应的角色才可以访问，但是它内部会把我们传入的参数拼接上`ROLE_`后再去比较，所以这种情况下要用户对应的权限也要有`ROLE_`这个前缀才可以**

```java
@PreAuthorize("hasRole('system:dept:list')")
public String hello(){
    return "hello";
}
```

**hasAnyRole有任意的角色就可以访问，它内部也会把我们传入的参数拼接上`ROLE_`后再去比较。所以这种情况下要用用户对应的权限也要有`ROLE_`这个前缀才可以**

```java
@PreAuthorize("hasAnyRole('admin','system:dept:list')")
public String hello(){
    return "hello";
}
```

**也可以在SecurityConfig中使用权限校验方法，方法与之前基本一致，但不需要用户的权限中有字段`ROLE_`，因为它内部自动在我们的权限上拼接了该字段**

```java
http.authorizeRequests()
            .antMatchers("/user/login")
            .hasRole("user");
```

### 自定义权限校验方法

**我们也可以定义自己的权限校验方法，在@PreAuthorize注解中使用我们的方法**

```java
@Component("ex")
public class ExpressionRoot
{

    public boolean hasAuthority(String authority){
        //获取当前用户的权限
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        List<String> permissions = loginUser.getPermissions();
        //判断用户权限集合中是否存在authority
        return permissions.contains(authority);
    }
}
```

**在SPEL表达式中使用@ex相当于获取容器中bean的名字为ex的对象，然后再调用这个对象的hasAuthority方法**

```java
@RequestMapping("/hello")
@PreAuthorize("@ex.hasAuthority('system:dept:list')")
public String hello(){
    return "hello";
}
```

### CSRF

**CSRF是指跨站请求伪造（Cross-site request forgery），是web常见的攻击之一**

https://blog.csdn.net/freeking101/article/details/86537087

**SpringSecurity去防止CSRF攻击的方式就是通过csrf_token，后端会生成一个csrf_token，前端发起请求的时候需要携带这个csrf_token，后端会有过滤器进行校验，如果没有携带或者是伪造的就不允许访问**

**我们可以发现CSRF攻击依靠的是cookie中所携带的认证信息，但是在前后端分离的项目中我们的认证信息其实是token，而token并不是存储在cookie中，并且需要前端代码去把token设置到请求头中才可以，所以CSRF攻击也就不用担心了**

### 认证成功处理器

**实际上在UsernamePasswordAuthenticationFilter进行登录认证的时候，如果登录成功了是会调用AuthenticationSuccessHandler的方法进行认证成功后的处理，AuthenticationSuccessHandler就是登录成功处理器**

**我们也可以自己自定义成功处理器进行成功后的相应处理**

```java
@Component
public class SGSuccessHandler implements AuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        System.out.println("认证成功了");
    }
}
```

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Autowired
    private AuthenticationSuccessHandler successHandler;

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.formLogin().successHandler(successHandler);

        http.authorizeRequests().anyRequest().authenticated();
    }
}

```

### 认证失败处理器

**实际上在UsernamePasswordAuthenticationFilter进行登录认证的时候，如果认证失败了会调用AuthenticationFailureHandler的方法进行认证失败后的处理的，AuthenticationFailureHandler就是登录失败处理器**

**我们也可以定义自己的自定义失败处理器进行失败后的相应处理**

```java
@Component
public class SGFailureHandler implements AuthenticationFailureHandler {
    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
        System.out.println("认证失败了");
    }
}
```

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Autowired
    private AuthenticationSuccessHandler successHandler;

    @Autowired
    private AuthenticationFailureHandler failureHandler;

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.formLogin()
				// 配置认证成功处理器
                .successHandler(successHandler)
				// 配置认证失败处理器
                .failureHandler(failureHandler);

        http.authorizeRequests().anyRequest().authenticated();
    }
}

```

### 登出成功处理器

```java
@Component
public class SGLogoutSuccessHandler implements LogoutSuccessHandler {
    @Override
    public void onLogoutSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        System.out.println("注销成功");
    }
}
```

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Autowired
    private AuthenticationSuccessHandler successHandler;

    @Autowired
    private AuthenticationFailureHandler failureHandler;

    @Autowired
    private LogoutSuccessHandler logoutSuccessHandler;

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.formLogin()
				// 配置认证成功处理器
                .successHandler(successHandler)
				// 配置认证失败处理器
                .failureHandler(failureHandler);

        http.logout()
                //配置注销成功处理器
                .logoutSuccessHandler(logoutSuccessHandler);

        http.authorizeRequests().anyRequest().authenticated();
    }
}
```

**实际上当配置JwtAuthenticationTokenFilter之后，SpringSecurity过滤链就不经过UsernamePassword过滤器了，所以这些自定义处理器在本方案不适用**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)
