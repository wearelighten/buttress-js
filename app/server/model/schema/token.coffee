########################################################
########################################################
mongoose    = require("mongoose")
Model       = require('../index')
whenjs      = require('when')

########################################################
########################################################
type = ["api"]
Type =
  API: type[0]

exports.constants =
  Type: Type

########################################################
########################################################
schema = exports.schema = new mongoose.Schema(
  type:
    type: String
    enum: type
  value:
    type: String
    index:
      unique: true
  allocated:
    type: Boolean
    default: false
,
  strict: true
)

########################################################
########################################################
model = exports.model = mongoose.model("Auth", schema)
