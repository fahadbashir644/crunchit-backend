const {Schema, model} = require("mongoose");

const ServiceSchema = Schema({
  _id: Schema.Types.ObjectId,
  name: { type: String, require: true }
});

module.exports = model("Service", ServiceSchema);