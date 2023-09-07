const {Schema, model} = require("mongoose");

const UserSchema = Schema({
  _id: Schema.Types.ObjectId,
  email: { type: String, require: true },
  name: { type: String, require: true },
  password: { type: String, require: true },
  balance: { type: Number, default: 0 },
  isVa: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  available: { type: Boolean, default: true },
});

module.exports = model("User", UserSchema);