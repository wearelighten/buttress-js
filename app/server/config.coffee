#################################################
#################################################
_ = require("underscore")

#################################################
#################################################
_serverId = null
_get = exports.get = (serverId) ->
  _serverId = serverId
  _.extend config.globals, config[serverId]

_env = 'dev'

#################################################
#################################################
config =
  globals:
    app:
      title: 'Rhizome'
      code: 'rhizome'
      protocol: 'http'
      subdomain: 'rhizome'
      domain: 'codersforcorbyn.com'
    api:
      key: "JggY4nlaMHLz"
    auth:
      otp:
        salt: "rry9Nj3lp5okX01XLmYr4IHvnozFyyo1nz1W3"
    env: (env) -> _env = env
    getEnv: -> _env
  yubaba:
    mongoUrl: # Only because the mongodb instance is on kamaji
      dev: 'localhost'
      prod: 'localhost'
      test: 'localhost'
    listenPort:
      dev: 6000
      prod: 6000
      test: 6001
  workstation1:
    mongoUrl:
      dev: 'localhost'
      prod: 'localhost'
      test: 'localhost'
    listenPort:
      dev: 6001
      prod: 6000
