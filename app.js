const express = require('express')
const mailer = require('./mailer.js')
const app = express()
const sqlite = require('sqlite')
const port = 3000

const cookieParser = require('cookie-parser')

// const users = [{
//   name: 'a',
//   email:'zhangyu_2324@163.com',
//   password:'123'
// },{
//   name: 'b',
//   email:'b.qq.com',
//   password:'123'
// }]

const changePasswordTokenMap = {}

const dbPromise = sqlite.open(__dirname + './static/voting-site.sqlite3')



app.use((req, res , next) => {
  res.set('Content-Type','text/html; charset= UTF-8')
  next()
})

app.use(cookieParser('my secret'))

app.use(express.static(__dirname + '/static'))

app.use(express.urlencoded({
  extended: true
}))

app.get('/', (req, res ,next)=> {
  console.log(req.cookies)
  console.log(req.signedCookies)
  if(req.signedCookies.user) {
    res.send(`
      <div>
      <span>Welcome ,${req.signedCookies.user}</span>
        <a href="/create">创建投票</a>
        <a href="/logout">登出  </a>
      </div>
    `)
  } else {
    res.send(`
      <div>
        <a href="/register">注册</a>
        <a href="/login">登录</a>
      </div>
    `)
  }
})
app.get('/create', (req, res ,next)=> {
  
})


app.get('/vote/:id',(req, res ,next)=> {
  
})


app.route('/register')
  .get((req, res,next) => {
    res.send(`
      <form action="/register" method="post">
        用户名：<input type="text" name="name"/>
        邮箱：<input type="text" name="email"/>
        密码：<input type="password" name="password" />
        <button>注册</button>
      </form> 
    `)
  }).post((req, res, next)=> {
    var userInfo = req.body
    console.log(userInfo)
    if(users.findIndex(it =>it.name == userInfo.name) >= 0) {
      res.end('用户名已被占用')
    } else {
      res.end(`
        注册成功，<span id="countDown">3</span>秒后将跳转登录页面...
        <script>
          var remain = 2
          setInterval(() => {
            countDown.textContent = remain--
          }, 1000)
          setTimeout(()=>{
            location.href = '/login'
          },3000)
        </script>
      `)
      users.push(userInfo)
    }
  })

  app.route('/login')
  .get((req, res, next) => {
    res.send(`
      <form id="loginForm" action="/login" method="post">
        用户名：<input type="text" name="name"/>
        密码：<input type="password" name="password" />
        <a href="/forgot">忘记密码</a>
        <button>登录</button>
      </form> 

      <script>
        loginForm.onsubmit = e => {
          e.preventDefault()
          var name = document.querySelector('[name="name"]').value
          var password = document.querySelector('[name="password"]').value

          var xhr = new XMLHttpRequest()
          xhr.open('POST', '/login')
          xhr.onload = ()=> {
            var data = JSON.parse(xhr.responseText)
            if(data.code == 0) {
              alert('login success,will redirect home')
              location.href = '/'
            } else {
               alert('login failed')
            }
          }
          xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded; charset=UTF-8')
          xhr.send('name=' + name + '&password=' + password)

        }
      </script>
    `)})
    .post((req, res, next) => {
      var tryloginUser = req.body
      if(users.findIndex(it => it.name == tryloginUser.name && it.password == tryloginUser.password ) >= 0) {
        res.cookie('user', tryloginUser.name, {
          signed: true
        })
        res.json({
          code: 0
        })
        return 
        // res.end(`
        //   登陆成功，<span id="countDown">3</span>秒后将跳转首页...
        //   <script>
        //     var remain = 2
        //     setInterval(() => {
        //       countDown.textContent = remain--
        //     }, 1000)
        //     setTimeout(()=>{
        //       location.href = '/'
        //     },3000)
        //   </script>
        // `)
        // // res.redirect('/')
      } else {
        res.json({coed:-1})
        // res.end('用户名或密码错误')
      }
    }) 

app.route('/forgot')
  .get((req, res ,next)=> {
    res.end(`
      <form action="/forgot" method="post">
        请输入您的邮箱：<input type="text" name="email"/>
        <button>确定</button>
      </form>
    `)
  }).post((req, res, next)=> {
    var email = req.body.email
    var token = Math.random().toString().slice(2)

    changePasswordTokenMap[token] = email

    var link = `http://localhost:3000/change-password/${token}`

    setTimeout(()=>{
      delete changePasswordTokenMap[token]
    }, 60*1000*20)//20分钟后删除 
    
    
    console.log(link)

    mailer.sendMail({
      from:'2022430475@qq.com',
      to: email,
      subject:'密码修改',
      text: link
    }, (err, info)=> {
      console.log(info.messageId)
      res.end('已向您的邮箱发送密码重置链接')
    })
    // EmailSystem.send(email, link)
  })

app.route('/change-password/:token')
  .get((req, res, next) => {
    var token =  req.params.token
    var user = users.find(it=> it.email == changePasswordTokenMap[token])
    res.end(`
      此页面可以重置${user.name}的密码
      <form action=" " method="post" >
        新密码<input type="password" name= "password"/>
        <button>提交</button>
      </form> 
    `)
  })
  .post((req,res,next)=> {
    var token =  req.params.token
    var user = users.find(it=> it.email == changePasswordTokenMap[token])
    var password = req.body.password
    if(user) {
      user.password = password

      delete changePasswordTokenMap[token]

      res.end('密码修改成功')
    } else {
      res.end('此链接已失效')
    }
  })


app.get('/logout', (req, res, next) => {
  res.clearCookie('user')
  res.redirect('/')
})



dbPromise.then(dbObject=> {
  db = dbObject
  app.listen(port, ()=> {
    console.log('server listening on ', port)
  })
})