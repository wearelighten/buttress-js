#//////////////////////////////////
#// MODEL

#//////////////////////////////////
path      = require("path")
fs        = require("fs")
mongoose  = require('mongoose')
sugar     =  require('sugar')

#//////////////////////////////////
class Model

  #//////////////////////////////////
  models: {}
  Schema: {}
  Constants: {}

  #//////////////////////////////////
  #//////////////////////////////////
  constructor: ->
    models = getModels()

    ((model)=>@__defineGetter__(model, () => @model(model)))(model) for model in models
    ((model)=>@Schema.__defineGetter__(model, () => @schema(model)))(model) for model in models
    ((model)=>@Constants.__defineGetter__(model, () => @constants(model)))(model) for model in models

  #//////////////////////////////////
  #//////////////////////////////////
  init: () ->

  #//////////////////////////////////
  #//////////////////////////////////
  _require: (model) ->
    if @models[model]? is false
      @models[model] = require("./schema/#{model.toLowerCase()}")
    @models[model]

  #//////////////////////////////////
  schema: (model) ->
    @_require(model).schema

  #//////////////////////////////////
  model: (model) ->
    @_require(model).model

  #//////////////////////////////////
  constants: (model) ->
    @_require(model).constants

#//////////////////////////////////
#//////////////////////////////////
getModels = ->
  filenames = fs.readdirSync "#{__dirname}/schema"

  files = (["#{__dirname}/schema/#{file}",path.basename(file,'.js')] for file in filenames when path.extname(file) is '.js')
  files.map (f)->
    [pathname,name] = f
    name.capitalize()

#//////////////////////////////////
#//////////////////////////////////
module.exports = new Model()

