const nodemailer = require('nodemailer')

let transporter = nodemailer.createTransport({
  service:'qq',
  // port:465,
  // secureConnection: true,
  auth: {
    user:'2022430475@qq.com',
    pass:'rfuqxgflniticbgi'
  }
})

module.exports= transporter