#######################################################################################################################
#######################################################################################################################

Config    = require("../config")
_         = require("underscore")
fs        = require("fs")
whenjs    = require("when")
Helpers   = require("../helpers")
Model     = require("../model/index")
OTP       = require("../otp")

#######################################################################################################################
#######################################################################################################################
class Route
  @app: null
#  @otp: OTP.create({length:12,mode:OTP.Constants.Mode.ALPHANUMERIC,salt:Config.auth.otp.salt,tolerance:3})

  @LogLevel:
    NONE: 0,
    VERBOSE: 1
    INFO: 2,
    WARN: 3,
    ERR: 4

  ##################################
  constructor: (@req, @res, @name) ->
    @logLevel = Route.LogLevel.VERBOSE
    @task = ""
    @auth = ""
#    @auth = ""

  ##################################
  ##################################
  exec: ->
    deferred = whenjs.defer()

    @log "STARTING: #{@name}", Route.LogLevel.VERBOSE
    @log "ERROR: #{@name}: NO _exec DEFINED", Route.LogLevel.ERR if @_exec? is false
    return deferred.reject code: "ENO_EXEC" if @_exec? is false

    @_authenticate()
      .then(undefined,((error)->throw _.extend(authFailure:true, error)))
      .then(_.bind(@_validate,@))
      .then(undefined,((error)-> throw _.extend(validationFailure:true, error)))
      .then(_.bind(@_exec,@))
      .then(undefined,_.bind(@_failure,@))
      .then(deferred.resolve,deferred.reject)

    deferred.promise

  ##################################
  ##################################
  _authenticate: ->
    d = whenjs.defer()
    if @auth isnt ""
      @log "Authenticate: #{@auth}", Route.LogLevel.VERBOSE
    else
      @log "WARNING: OPEN API CALL", Route.LogLevel.VERBOSE

    if @auth is ""
      d.resolve(@req.user)
      return d.promise

    if @req.user? is false and Route.otp.test(@req.query.token) is false
      d.reject code: "ENO_AUTH"
      return d.promise

    d.resolve(@req.user)
    d.promise

  ##################################
  ##################################
  _taskStart: ( @task) ->
    d = whenjs.defer()
    @log "TASK: #{@task}", Route.LogLevel.VERBOSE
    d.promise.then (res) => @log "TASK: #{@task}: DONE", Route.LogLevel.VERBOSE
    d

  ##################################
  _taskSuccess: (results) ->
    @log "FINISHED TASK"

  ##################################
  _taskError: (err) ->
    @log "#{@job}: FAIL: #{JSON.stringify err}",

  ##################################
  ##################################
  log: (log, level=Route.LogLevel.INFO) ->
    return if level is Route.LogLevel.NONE
    console.log Helpers.logPrefix() + " - #{log}" if level >= @logLevel

  ##################################
  ##################################
  _failure: (err) ->
    deferred = whenjs.defer()
    @log "FAIL: #{@name}: #{JSON.stringify err}", Route.LogLevel.ERR
    deferred.reject err
    deferred.promise

module.exports = Route
