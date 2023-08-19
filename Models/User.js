const {Schema, model} = require("mongoose");

const UserSchema = Schema({
  _id: Schema.Types.ObjectId,
  email: { type: String, require: true },
  password: { type: String, require: true },
  balance: { type: Number },
});

module.exports = model("User", UserSchema);