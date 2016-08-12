#######################################################################################################################
#######################################################################################################################
utils           = require("util")
fs              = require("fs")
path            = require("path")
Route           = require("./route")

#######################################################################################################################
#######################################################################################################################
exports.init = (app) ->
  routeProviders = getRouteProviders()

  Route.app = app
  for provider in routeProviders
    for name, verbs of provider.routes
      for verb,Command of verbs
        do (verb,Command) ->
          app[verb]("/api/v1/#{name}", (req,res) ->
            (new Command(req,res)).exec().done(
              (result)->
                res.json result
            ,
              (error) ->
                status = false
                status=401 if error.authFailure is true
                status=404 if status is false and error.missingResource is true
                status=400 if status is false and error.validationFailure is true
                status=500 if status is false and utils.isError(error) isnt true
                if status isnt false
#                  console.log error
                  res.sendStatus(status)
                  return

#                console.log error.stack
                res.status(500).json(error)
            )
          )

#######################################################################################################################
getRouteProviders = ->
  filenames = fs.readdirSync "#{__dirname}/api"
#  console.log filenames
  files = (["#{__dirname}/api/#{file}",path.basename(file,'.js')] for file in filenames when path.extname(file) is '.js')
  files.map (f)->
    [pathname,name] = f
    return if name is 'index'
    require "./api/#{name}"
