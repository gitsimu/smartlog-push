// * reference
// https://firebase.google.com/docs/cloud-messaging/send-message?hl=ko

var express = require('express')
var bodyParser = require('body-parser')
var logger = require('./config/logger')

const admin = require('firebase-admin')
const serviceAccount = require('./smartlog-a3eed-firebase-adminsdk-mekw7-a877ecf549.json')


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://smartlog-a3eed.firebaseio.com/'
})

var app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static('public'))

app.post('/', function(req,res) {
  const title = req.body.title
  const body = req.body.body
  // const color = req.body.color
  const tokens = req.body.token.split('|')
  const msid = req.body.msid
  const type = req.body.type
  const svid = req.body.svid

  const message = {
      data: {
        type: type,
        svid: svid
      },
      notification: {
        title: title,
        body: body,
      },
      android: { // 안드로이드 전용 속성
          ttl: 3600 * 1000, // 1 hour in milliseconds, 수명
          priority: 'normal',
          // notification: {
          //   color: color,
          // }
      },
      tokens: tokens,
  }

  let log = ' target[' + tokens.length + ']:' + req.body.token

  admin.messaging().sendMulticast(message)
  .then((response) => {
    let failedTokens = []
    let failedTokenToString = ''
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx])
          log += tokens[idx]
          failedTokenToString += tokens[idx] + '|'
        }
      })
    }

    log += ' failed[' + failedTokens.length + ']:' + failedTokenToString

    if (response.responses[0].success) {
      logger.info('msid:'+ msid + ' messageId:' + response.responses[0].messageId + log)
    }
    else {
      logger.error('msid:'+ msid + ' message:' + response.responses[0].error.message + log)
    }
    res.json({result: 1, failedTokens:failedTokens ,message: response})
  })
  .catch((error) => {
    logger.error('msid:'+ msid + ' message:' + error + log)
    res.json({result: 0, message: error})
  })
})

app.listen(3000, function(){
    console.log(`Connect 3000 port`)
})
