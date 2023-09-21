const {Schema, model} = require("mongoose");

const ServiceSchema = Schema({
  _id: Schema.Types.ObjectId,
  name: { type: String, require: true },
  rate: { type: Number, default: 0 },
});

module.exports = model("Service", ServiceSchema);