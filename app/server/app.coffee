express           = require('express')
json              = require('express-json')
methodOverride    = require('method-override')
morgan            = require('morgan')
Model 	          = require('./model/index')
Routes 	          = require('./routes/index')
Config            = require("./config").get(process.env.SERVER_ID)
mongoose          = require('mongoose')

app = module.exports = express()

configureApp = (env) ->
  app.enable 'trust proxy', 1
  app.use json()
  app.use methodOverride()

  switch env
    when 'development' then configureDevelopment()
    when 'production' then configureProduction()
    when 'test' then configureTest()

configureDevelopment = ->
  Config.env 'dev'
  app.set 'db-uri', "mongodb://#{Config.mongoUrl.dev}/#{Config.app.code}-dev"
  app.use morgan 'short'
  app.set 'port', Config.listenPort.dev

configureProduction = ->
  Config.env 'prod'
  app.set 'db-uri', "mongodb://#{Config.mongoUrl.prod}/#{Config.app.code}-prod"
  app.use morgan 'combined'
  app.set 'port',  Config.listenPort.prod

configureTest = ->
  Config.env 'test'
  app.set 'db-uri', "mongodb://#{Config.mongoUrl.test}/#{Config.app.code}-test"
  app.use morgan 'combined'
  app.set 'port', Config.listenPort.test

configureApp app.get 'env'

app.db = mongoose.connect app.get('db-uri')
app.db.connection.on "connected", ->
  console.log "#{Config.app.title} listening on port %d in %s mode.", app.get('port'), app.settings.env

  Model.init()
  Routes.init(app)
  app.server = app.listen app.set 'port'

