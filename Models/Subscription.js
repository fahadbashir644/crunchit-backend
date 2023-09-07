const {Schema, model} = require("mongoose");

const SubscriptionSchema = Schema({
  _id: Schema.Types.ObjectId,
  client: { type: String, require: true },
  va: { type: String, require: false },
  fee: { type: Number, require: true },
  service: { type: String, require: true },
  totalHours: { type: Number, require: true },
  workingHours: { type: Object, require: true },
  paymentStatus: { type: String, require: true },
  vaStatus: { type: String, require: true },
  projectStatus: { type: String, require: true },
});

module.exports = model("Subscription", SubscriptionSchema);