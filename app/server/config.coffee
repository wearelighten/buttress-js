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
    auth:
      otp:
        salt: "Toukq2xBVkRJXuMcZGQ0fI6ZZ2a9eTJnux7d8DJB3565gFo7lZFdpc94Rz8QIcV"
    env: (env) -> _env = env
    getEnv: -> _env
  yubaba:
    mongoUrl:
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
