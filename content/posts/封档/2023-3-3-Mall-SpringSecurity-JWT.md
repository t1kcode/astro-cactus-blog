---
title: Mall-SpringSecurity-JWT
abbrlink: 8aebab8e
tags: ["JWT"]
categories: ["封档"]
description: "封档"
publishDate: 2023-03-02 10:57:10
---

# Mall-SpringSecurity-JWT

> **本文主要讲解mall通过整合SpringSecurity和JWT实现后台用户的登录和授权功能，同时改造Swagger-UI的配置使其可以自动记住登录令牌进行发送**
>
> **[](https://cloud.tencent.com/developer/article/1822546)**

## 项目使用框架介绍

### SpringSecurity

> **SpringSecurity是一个强大的可高度定制的认证和授权框架，对于Spring应用来说它是一套Web安全标准。SpringSecurity注重于为Java应用提供认证和授权功能，像所有的Spring项目一样，它对自定义需求具有强大的扩展性**

### JWT

> **JWT是JSON WEB TOKEN的缩写，它是基于RFC 7519标准定义的一种可以安全传输的JSON对象，由于使用了数字签名，所以是可信任和安全的**

#### JWT的组成

- **JWT token的格式：header.payload.signature**
- **header中用于存放签名的生成算法**

```json
{"alg": "HS512"}
```

- **payload中用于存放用户名、token的生成时间和过期时间**

```json
{"sub": "admin", "created": 1489079981393, "exp": 1489684781}
```

- **signature为以header和payload生成的签名，一旦header和payload被篡改，验证将失败**

```java
//secret为加密算法的密钥
String signature = HMACSHA512(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
```

#### JWT实例

**这是一个JWT的字符串**

```java
eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsImNyZWF0ZWQiOjE1NTY3NzkxMjUzMDksImV4cCI6MTU1NzM4MzkyNX0.d-iki0193X0bBOETf2UN3r3PotNIEAV7mzIxxeI5IxFyzzkOZxS0PGfF_SK6wxCv2K8S0cZjMkv6b5bCqc0VBw
```

**可以在该网站上获得解析结果：https://jwt.io/**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

#### JWT实现认证和授权的原理

- **用户调用登录接口，登录成功后获取到JWT的token**

- **之后用户每次调用接口都在http的header中添加一个叫Authorization的头，值为JWT的token**
- **后台程序通过对Authorization头中信息的解码及数字签名校验来获取其中的用户信息，从而实现认证和授权**

### Hutool

> **Hutool是一个丰富的Java开源工具，它帮助我们简化每一行代码，减少每一个方法，mall项目采用此工具包**

## 项目使用表说明

- **ums_admin：后台用户表**

- **ums_role：后台用户角色表**

- **ums_permission：后台用户权限表**

- **ums_admin_role_relation：后台用户和角色关系表，用户和角色是多对多关系**

- **ums_role_permission_relation：后台用户角色和权限关系表（除角色中定义的权限以外的加减权限），加权限是指用户比角色多出的权限，减权限是指用户比角色少的权限**

## 整合SpringSecurity及JWT

### 在pom.xml中添加项目依赖

```xml
<!--SpringSecurity依赖配置-->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<!--Hutool Java工具包-->
<dependency>
    <groupId>cn.hutool</groupId>
    <artifactId>hutool-all</artifactId>
    <version>4.5.7</version>
</dependency>
<!--JWT(Json Web Token)登录支持-->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt</artifactId>
    <version>0.9.0</version>
</dependency>
```

### 添加JWT token的工具类

> **用于生成和解析JWT token的工具类**

```java
@Component
public class JwtTokenUtil
{
    private static final Logger LOGGER = LoggerFactory.getLogger(JwtTokenUtil.class);
    private static final String CLAIM_KEY_USERNAME = "sub";
    private static final String CLAIM_KEY_CREATED = "created";
    @Value("${jwt.secret}")
    private String secret;
    @Value("${jwt.expiration}")
    private Long expiration;

    /**
     * 根据负责生成JWT的token
     */
    private String generateToken(Map<String, Object> claims) {
        return Jwts.builder()
                .setClaims(claims)
                .setExpiration(generateExpirationDate())
                .signWith(SignatureAlgorithm.HS512, secret)
                .compact();
    }

    /**
     * 从token中获取JWT中的负载
     */
    private Claims getClaimsFromToken(String token) {
        Claims claims = null;
        try {
            claims = Jwts.parser()
                    .setSigningKey(secret)
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            LOGGER.info("JWT格式验证失败:{}",token);
        }
        return claims;
    }

    /**
     * 生成token的过期时间
     */
    private Date generateExpirationDate() {
        return new Date(System.currentTimeMillis() + expiration * 1000);
    }

    /**
     * 从token中获取登录用户名
     */
    public String getUserNameFromToken(String token) {
        String username;
        try {
            Claims claims = getClaimsFromToken(token);
            username =  claims.getSubject();
        } catch (Exception e) {
            username = null;
        }
        return username;
    }

    /**
     * 验证token是否还有效
     *
     * @param token       客户端传入的token
     * @param userDetails 从数据库中查询出来的用户信息
     */
    public boolean validateToken(String token, UserDetails userDetails) {
        String username = getUserNameFromToken(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    /**
     * 判断token是否已经失效
     */
    private boolean isTokenExpired(String token) {
        Date expiredDate = getExpiredDateFromToken(token);
        return expiredDate.before(new Date());
    }

    /**
     * 从token中获取过期时间
     */
    private Date getExpiredDateFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        return claims.getExpiration();
    }

    /**
     * 根据用户信息生成token
     */
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_KEY_USERNAME, userDetails.getUsername());
        claims.put(CLAIM_KEY_CREATED, new Date());
        return generateToken(claims);
    }

    /**
     * 判断token是否可以被刷新
     */
    public boolean canRefresh(String token) {
        return !isTokenExpired(token);
    }

    /**
     * 刷新token
     */
    public String refreshToken(String token) {
        Claims claims = getClaimsFromToken(token);
        claims.put(CLAIM_KEY_CREATED, new Date());
        return generateToken(claims);
    }
}
```

#### 相关方法说明：

- **generateToken(UserDetails userDetails)：用于根据登录用户信息生成token**

- **getUserNameFromToken(String token)：从token中获取登录用户的信息**

- **validateToken(String token, UserDetails userDetails)：判断token是否还有效**

### 添加SpringSecurity的配置类

```java
/**
 * SpringSecurity的配置
 */
@Configuration
@EnableWebSecurity
// 允许注解权限控制
@EnableGlobalMethodSecurity(prePostEnabled=true)
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Resource
    private UmsAdminService adminService;
    @Resource
    private RestfulAccessDeniedHandler restfulAccessDeniedHandler;
    @Resource
    private RestAuthenticationEntryPoint restAuthenticationEntryPoint;

    @Override
    protected void configure(HttpSecurity httpSecurity) throws Exception {
        httpSecurity.csrf().disable()// 由于使用的是JWT，我们这里不需要csrf
                .sessionManagement()// 基于token，所以不需要session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authorizeRequests()
                .antMatchers(HttpMethod.GET, // 允许对于网站静态资源的无授权访问
                        "/",
                        "/*.html",
                        "/favicon.ico",
                        "/**/*.html",
                        "/**/*.css",
                        "/**/*.js",
                        "/swagger-resources/**",
                        "/v2/api-docs/**"
                )
                .permitAll()
                .antMatchers("/admin/login", "/admin/register")// 对登录注册要允许匿名访问
                .permitAll()
                .antMatchers(HttpMethod.OPTIONS)//跨域请求会先进行一次options请求
                .permitAll()
//                .antMatchers("/**")//测试时全部运行访问
//                .permitAll()
                .anyRequest()// 除上面外的所有请求全部需要鉴权认证
                .authenticated();
        // 禁用缓存
        httpSecurity.headers().cacheControl();
        // 添加JWT filter
        httpSecurity.addFilterBefore(jwtAuthenticationTokenFilter(), UsernamePasswordAuthenticationFilter.class);
        //添加自定义未授权和未登录结果返回
        httpSecurity.exceptionHandling()
                .accessDeniedHandler(restfulAccessDeniedHandler)
                .authenticationEntryPoint(restAuthenticationEntryPoint);
    }

    @Override
    protected void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth.userDetailsService(userDetailsService())
                .passwordEncoder(passwordEncoder());
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        //获取登录用户信息
        return username -> {
            UmsAdmin admin = adminService.getAdminByUsername(username);
            if (admin != null) {
                List<UmsPermission> permissionList = adminService.getPermissionList(admin.getId());
                return new AdminUserDetails(admin, permissionList);
            }
            throw new UsernameNotFoundException("用户名或密码错误");
        };
    }

    @Bean
    public JwtAuthenticationTokenFilter jwtAuthenticationTokenFilter(){
        return new JwtAuthenticationTokenFilter();
    }

    @Bean
    @Override
    public AuthenticationManager authenticationManagerBean() throws Exception {
        return super.authenticationManagerBean();
    }
}
```

#### 相关依赖及方法说明

- **configure(HttpSecurity httpSecurity)：用于配置需要拦截的url路径、jwt过滤器及异常处理器**

- **configure(AuthenticationManagerBulder auth)：用于配置UserDetailsService及PasswordEncoder**

- **RestfulAccessDeniedHandler：当用户没有访问权限时的处理器，用于返回JSON格式的处理结果**

- **RestAuthenticationEntryPoint：当未登录或token失效时，返回JSON格式的结果**

- **UserDetailsService：SpringSecurity定义的核心接口，用户根据用户名获取用户信息，可自定义实现类**

- **UserDetails：SpringSecurity定义用于封装用户信息的类（主要是用户信息和权限），可自定义实现类**

- **PasswordEncoder：SpringSecurity定义的用于对密码进行编码及比对的接口，目前使用的是BCryptPasswordEncoder**

- **JwtAuthenticationTokenFilter：在用户名和密码校验前添加的过滤器，如果有jwt的token，会自行根据token信息进行登录**

#### 添加RestfulAccessDeniedHandler

```java
/**
 * 当访问接口没有权限时，自定义的返回结果
 */
@Component
public class RestfulAccessDeniedHandler implements AccessDeniedHandler{
    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException e) throws IOException, ServletException {
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        // 将CommonResult转换为JSON格式
        response.getWriter().println(JSONUtil.parse(CommonResult.forbidden(e.getMessage())));
        response.getWriter().flush();
    }
}
```

#### 添加RestAuthenticationEntryPoint

```java
/**
 * 当未登录或者token失效访问接口时，自定义的返回结果
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.getWriter().println(JSONUtil.parse(CommonResult.unauthorized(authException.getMessage())));
        response.getWriter().flush();
    }
}
```

#### 添加AdminUserDetails

```java
/**
 * SpringSecurity需要的用户详情
 */
public class AdminUserDetails implements UserDetails {
    // 用户信息
    private UmsAdmin umsAdmin;

    // 用户权限信息
    private List<UmsPermission> permissions;

    private List<GrantedAuthority> authorities;

    public AdminUserDetails(UmsAdmin umsAdmin, List<UmsPermission> permissionList) {
        this.umsAdmin = umsAdmin;
        this.permissions = permissionList;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // 返回当前用户的权限
        // 每次访问都需要转换，应改为只转换一次即可
        //        return permissions.stream()
        //                          .filter(permission -> permission.getValue()!=null)
        //                          .map(permission ->new SimpleGrantedAuthority(permission.getValue()))
        //                          .collect(Collectors.toList());

        if(ObjectUtils.isEmpty(authorities)){
            // 挑选出权限值不为空的，权限为空则不需要权限
            authorities = permissions.stream()
                                     .filter(permission -> !Objects.isNull(permission.getValue()))
                                     .map(permission -> new SimpleGrantedAuthority(permission.getValue()))
                                     .collect(Collectors.toList());
        }
        return authorities;
    }

    @Override
    public String getPassword() {
        return umsAdmin.getPassword();
    }

    @Override
    public String getUsername() {
        return umsAdmin.getUsername();
    }

    // 账户是否未过期
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    // 账户是否未锁定
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    // 账户凭据是否未过期
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    // 表示用户是否被禁用，被禁用的用户无法被验证
    @Override
    public boolean isEnabled() {
        // 判断账号是否为启用状态
        return umsAdmin.getStatus().equals(1);
    }
}
```

#### 添加JwtAuthenticationTokenFilter

> **在用户名和密码校验前添加的过滤器，如果请求中有jwt的token且有效，会取出token中的用户名，然后调用SpringSecurity的API进行登录操作**

```java
/**
 * JWT登录授权过滤器
 */
public class JwtAuthenticationTokenFilter extends OncePerRequestFilter
{
    // 日志打印器
    private static final Logger LOGGER = LoggerFactory.getLogger(JwtAuthenticationTokenFilter.class);

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    // JWT存储的请求头，为Authorization
    @Value("${jwt.tokenHeader}")
    private String tokenHeader;

    // JWT负载中拿到开头，拼接在token字符串前面
    @Value("${jwt.tokenHead}")
    private String tokenHead;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException
    {
        // key为Authorization的token值
        String authHeader = request.getHeader(this.tokenHeader);
        LOGGER.info("checking authHeader:{}", authHeader);

        // 判断token值是否为空，和是否以Bearer开头
        if(StringUtils.hasText(authHeader) && authHeader.startsWith(this.tokenHead)){

            // 获取jwt token值
            String authToken = authHeader.substring(this.tokenHead.length());// The part after "Bearer "

            // 从token中获取用户名
            String username = jwtTokenUtil.getUserNameFromToken(authToken);
            LOGGER.info("checking username:{}", username);

            // 判断用户名是否为空和用户是否已登录，登录时会将jwt存入SecurityContextHolder中
            if(StringUtils.hasText(username) && SecurityContextHolder.getContext().getAuthentication() == null){
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                // 验证token是否还有效
                if(jwtTokenUtil.validateToken(authToken, userDetails)){
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    LOGGER.info("authenticated user:{}", username);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }
        chain.doFilter(request, response);
    }
}
```

## 登录注册功能实现

### 添加UmsAdminController类

> **实现了后台用户登录、注册及获取权限的接口**

```java
/**
 * 后台用户管理
 */
@Controller
@Api(tags = "UmsAdminController", description = "后台用户管理")
@RequestMapping("/admin")
public class UmsAdminController
{
    @Resource
    private UmsAdminService adminService;

    @Value("${jwt.tokenHeader}")
    private String tokenHeader;

    @Value("${jwt.tokenHead}")
    private String tokenHead;


    @ApiOperation(value = "登录以后返回token")
    @RequestMapping(value = "/login", method = RequestMethod.POST)
    @ResponseBody
    // BindingResult result这个参数是做什么的？
    public CommonResult login(@RequestBody UmsAdminLoginParam umsAdminLoginParam, BindingResult result)
    {
        // 没有在adminService中将token返回
        String token = adminService.login(umsAdminLoginParam.getUsername(), umsAdminLoginParam.getPassword());

        // 判断token是否为空
        if(!StringUtils.hasText(token)){
            return CommonResult.validateFailed("用户名或密码错误");
        }

        // 将token和tokenHead封装
        Map<String, String> tokenMap = new HashMap<String, String>(){{
            put("token", token);
            put("tokenHead", tokenHead);
        }};
        return CommonResult.success(tokenMap);
    }

    @ApiOperation(value = "用户注册")
    @RequestMapping(value = "/register", method = RequestMethod.POST)
    @ResponseBody
    public CommonResult<UmsAdmin> register(@RequestBody UmsAdmin umsAdminParam, BindingResult result)
    {
        UmsAdmin umsAdmin = adminService.register(umsAdminParam);
        if(Objects.isNull(umsAdmin)){
            CommonResult.failed();
        }
        return CommonResult.success(umsAdmin);
    }


    @ApiOperation("获取用户所有权限（包括+-权限）")
    @RequestMapping(value = "/permission/{adminId}", method = RequestMethod.GET)
    @ResponseBody
    public CommonResult<List<UmsPermission>> getPermissionList(@PathVariable Long adminId)
    {
        List<UmsPermission> permissionList = adminService.getPermissionList(adminId);
        return CommonResult.success(permissionList);
    }
}
```

### 添加UmsAdminService接口

```java
/**
 * 后台管理员Service
 */
public interface UmsAdminService
{
    /**
     * 根据用户名获取后台用户
     */
    UmsAdmin getAdminByUsername(String username);

    /**
     * 注册功能
     */
    UmsAdmin register(UmsAdmin umsAdminParam);

    /**
     * 登录功能
     * @param username 用户名
     * @param password 密码
     * @return 生成的JWT的token
     */
    String login(String username, String password);

    /**
     * 获取用户所有权限（包括角色权限和+-权限）
     */
    List<UmsPermission> getPermissionList(Long adminId);
}
```

### 添加UmsAdminServiceImpl类

```java
/**
 * UmsAdminService实现类
 */
@Service
public class UmsAdminServiceImpl implements UmsAdminService
{
    private static final Logger LOGGER = LoggerFactory.getLogger(UmsAdminServiceImpl.class);
    @Resource
    private UserDetailsService userDetailsService;
    @Resource
    private JwtTokenUtil jwtTokenUtil;
    @Resource
    private PasswordEncoder passwordEncoder;
    @Value("${jwt.tokenHead}")
    private String tokenHead;
    @Resource
    private UmsAdminMapper adminMapper;
    @Resource
    private UmsAdminRoleRelationDao adminRoleRelationDao;

    @Override
    public UmsAdmin getAdminByUsername(String username) {
        UmsAdminExample example = new UmsAdminExample();
        example.createCriteria().andUsernameEqualTo(username);
        List<UmsAdmin> adminList = adminMapper.selectByExample(example);
        if (!ObjectUtils.isEmpty(adminList)) {
            return adminList.get(0);
        }
        return null;
    }

    @Override
    public UmsAdmin register(UmsAdmin umsAdminParam) {
        UmsAdmin umsAdmin = new UmsAdmin();

        BeanUtils.copyProperties(umsAdminParam, umsAdmin);

        umsAdmin.setCreateTime(new Date());
        // 设置账号启用
        umsAdmin.setStatus(1);

        // mybatis-generator生成器，类似于条件构造器
        //查询是否有相同用户名的用户
        UmsAdminExample example = new UmsAdminExample();

        example.createCriteria().andUsernameEqualTo(umsAdmin.getUsername());
        List<UmsAdmin> umsAdminList = adminMapper.selectByExample(example);

        // 表示有相同用户名的用户
        if (umsAdminList.size() > 0) {
            return null;
        }

        //将密码进行加密操作
        String encodePassword = passwordEncoder.encode(umsAdmin.getPassword());
        umsAdmin.setPassword(encodePassword);
        adminMapper.insert(umsAdmin);
        return umsAdmin;
    }

    @Override
    public String login(String username, String password) {
        String token = null;
        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!passwordEncoder.matches(password, userDetails.getPassword())) {
                throw new BadCredentialsException("密码不正确");
            }
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            token = jwtTokenUtil.generateToken(userDetails);
        } catch (AuthenticationException e) {
            LOGGER.warn("登录异常:{}", e.getMessage());
        }
        return token;
    }

    @Override
    public List<UmsPermission> getPermissionList(Long adminId) {
        return adminRoleRelationDao.getPermissionList(adminId);
    }
}
```

### 修改Swagger配置

> **通过修改配置实现调用接口自带Authorization头，这样就可以访问需要登录的接口了**

```java
/**
 * Swagger2API文档的配置
 */
@Configuration
@EnableSwagger2
public class Swagger2Config
{
    @Bean
    public Docket createRestApi(){
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(apiInfo())
                .select()
                //为当前包下controller生成API文档
                .apis(RequestHandlerSelectors.basePackage("com.t1k.mall.controller"))
                .paths(PathSelectors.any())
                .build()
                //添加登录认证
                .securitySchemes(securitySchemes())
                .securityContexts(securityContexts());
    }

    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("SwaggerUI演示")
                .description("mall-test")
                .contact("t1k")
                .version("1.0")
                .build();
    }

    private List<ApiKey> securitySchemes() {
        //设置请求头信息
        List<ApiKey> result = new ArrayList<>();
        ApiKey apiKey = new ApiKey("Authorization", "Authorization", "header");
        result.add(apiKey);
        return result;
    }

    private List<SecurityContext> securityContexts() {
        //设置需要登录认证的路径
        List<SecurityContext> result = new ArrayList<>();
        result.add(getContextByPath("/brand/.*"));
        return result;
    }

    private SecurityContext getContextByPath(String pathRegex){
        return SecurityContext.builder()
                .securityReferences(defaultAuth())
                .forPaths(PathSelectors.regex(pathRegex))
                .build();
    }

    private List<SecurityReference> defaultAuth() {
        List<SecurityReference> result = new ArrayList<>();
        AuthorizationScope authorizationScope = new AuthorizationScope("global", "accessEverything");
        AuthorizationScope[] authorizationScopes = new AuthorizationScope[1];
        authorizationScopes[0] = authorizationScope;
        result.add(new SecurityReference("Authorization", authorizationScopes));
        return result;
    }
}
```

### 给PmsBrandController接口中的方法添加访问权限

- **给查询接口添加pms:brand:read权限**

- **给修改接口添加pms:brand:update权限**

- **给删除接口添加pms:brand:delete权限**

- **给添加接口添加pms:brand:create权限**

**例子：**

```java
@ApiOperation("获取所有品牌列表")
@RequestMapping(value = "listAll", method = RequestMethod.GET)
@ResponseBody
@PreAuthorize("hasAuthority('pms:brand:read')")
public CommonResult<List<PmsBrand>> getBrandList() {
    return CommonResult.success(brandService.listAllBrand());
}
```

## 认证与授权流程演示

### 运行项目，访问API

**Swagger api地址：http://localhost:8080/swagger-ui.html**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

### 未登录前访问接口

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

### 登录后访问接口

- **进行登录操作：登录账号admin 123**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

**在请求头中添加key为Authorization的token**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

### 访问需要权限的接口

> **由于test账号并没有设置任何权限，所以它无法访问具有pms:brand:read权限的获取品牌列表接口**

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

### 改用其它有权限的账号登录

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)

![](https://cdn.jsdmirror.com/gh/t1kcode/image@master/%E5%B7%B2%E5%A4%B1%E6%95%88/2026/07/25/50d9734a39-%E5%B7%B2%E5%A4%B1%E6%95%88.png)
