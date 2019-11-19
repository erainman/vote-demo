const express = require('express')
const mailer = require('./mailer.js')
const app = express()
app.locals.pretty = true //美化模板
// const pug = require('pug')
app.set('views', __dirname + '\\tpl')
app.set('view engine', 'pug')

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

const dbPromise = sqlite.open(__dirname + './db/voting-site.sqlite3')
let db


app.use((req, res , next) => {
  res.set('Content-Type','text/html; charset= UTF-8')
  next()
})

app.use(cookieParser('my secret'))

app.use(express.static(__dirname + '/static'))
//解析json中间体编码
app.use(express.json()) 
//解析url中间体编码
app.use(express.urlencoded({
  extended: true
}))

app.get('/', (req, res ,next)=> {
  console.log(req.cookies)
  console.log(req.signedCookies)
  if(req.signedCookies.userid) {
    res.send(`
      <div>
      <span>Welcome ,${req.signedCookies.userid}</span>
        <a href="/create.html">创建投票</a>
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
app.post('/create-vote',async(req, res ,next)=> {
  // console.log(req.body)
  // console.log(req.signedCookies.userid)
  var userid = req.signedCookies.userid
  var voteInfo = req.body
  await  db.run('INSERT INTO votes (title, desc, userid, singleSelection, deadline, anonymouse) VALUES (?,?,?,?,?,?)',voteInfo.title, voteInfo.desc, userid, voteInfo.singleSelection, new Date(voteInfo.deadline).getTime(), voteInfo.anonymouse)
  var vote = await db.get('SELECT * FROM votes ORDER BY id DESC LIMIT 1')
  voteInfo.options.map(option=> {
    return db.run('INSERT INTO options (content,voteid) VALUES (?,?)',option,vote.id)
  })
  // res.end('投票已创建！编号为' + vote.id)
  res.redirect('/vote/' + vote.id)
})


app.get('/vote/:id',async(req, res ,next)=> {
  var votePromise = db.get('SELECT * FROM votes WHERE id=?', req.params.id)
  var optionsPromise = db.all('SELECT * FROM options WHERE voteid=?',req.params.id)

  var vote = await votePromise
  var options = await optionsPromise

  res.render('vote.pug', {
    vote : vote,
    options : options
  })



  // res.end(`
  //   <h1>${vote.title}</h1>
  //   <h3>${vote.desc}</h3>
  //   ${
  //     options.map(option => {
  //       return `
  //         <div data-option-id = "${option.id}">
  //           <span>${option.content}</span>
  //         </div>
  //       `
  //     }).join('')
  //   }
  // `)
})
//某个用户获取某个投票的数量
app.get('/voteup/:voteid/info',async(req, res , next)=> {
  var userid = req.signedCookies.userid
  var voteid = req.params.voteid
  var userVoteupInfo = await db.get('SELECT * FROM voteups WHERE userid=? AND voteid=?' , userid, voteid)
  if(userVoteupInfo) {
    var voteups = db.all('SELECT * FROM voteups WHERE voteid=?', voteid)
    res.json(voteups)
  } else {
    res.json(null)
  }
})

app.post('/voteup', async(req,res, next)=> {
  // console.log(req.body)
  // console.log(req.signedCookies.userid)  
  var userid = req.signedCookies.userid
  var body = req.body
  var voteupInfo = await db.get('SELECT * FROM voteups WHERE userid=? AND voteid=?',userid, body.voteid)


  if(voteupInfo) {
    await db.run('UPDATE voteups SET optionid=? WHERE userid=? AND voteid=?',body.optionid,userid, body.voteid)
  } else {
    await db.run('INSERT INTO voteups (userid, optionid, voteid) VALUES (?,?,?)',req.signedCookies.userid, req.body.optionid,req.body.voteid)
  }

  var voteups = await db.all('SELECT * FROM voteups WHERE voteid=?',req.body.voteid)
  res.json(voteups)
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
  }).post(async (req, res, next)=> {
    var regInfo = req.body
    var user = await db.get('SELECT * FROM users WHERE name=?',regInfo.name )
    if(user) {
      res.end('用户名已被占用')
    } else {
      await db.run('INSERT INTO users (name, email, password) VALUES (?,?,?)',regInfo.name, regInfo.email, regInfo.password)
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
    .post(async(req, res, next) => {
      var tryloginUser = req.body
      var user = await db.get('SELECT * FROM users WHERE name=? AND password=?',tryloginUser.name, tryloginUser.password )
      if(user) {
        res.cookie('userid', user.id, {
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
  }).post(async(req, res, next)=> {
    var email = req.body.email
    var user = await db.get('SELECT * FROM users WHERE email=?',email)
    if(!user) {
      res.end('不存在此用户')
    }
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
  .get(async(req, res, next) => {
    var token =  req.params.token
    var name = changePasswordTokenMap[token]
    if(!name) {
      res.end('链接已失效')
      return 
    }
    res.end(` 
      此页面可以重置密码
      <form action=" " method="post" >
        新密码<input type="password" name= "password"/>
        <button>提交</button>
      </form> 
    `)
  })
  .post(async(req,res,next)=> {
    var token =  req.params.token
    var email = changePasswordTokenMap[token]
    var password = req.body.password
    if(!email) {
      res.end('链接已失效')
      return
    }
      delete  changePasswordTokenMap[token]
      await db.run('UPDATE users SET password=? WHERE email=?', password, email)
      res.end('密码修改成功')
  })


app.get('/logout', (req, res, next) => {
  res.clearCookie('userid')
  res.redirect('/')
})



dbPromise.then(dbObject=> {
  db = dbObject
  app.listen(port, ()=> {
    console.log('server listening on ', port)
  })
})