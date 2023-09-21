const {Schema, model} = require("mongoose");

const TransactionSchema = Schema({
  _id: Schema.Types.ObjectId,
  user: { type: String, require: false },
  type: { type: String, require: true },
  date: { type: String, require: false },
  balanceBefore: { type: Number, require: true },
  balanceAfter: { type: Number, require: true },
  totalAmount: { type: Number, require: true },
  status: { type: String, require: true },
});

module.exports = model("Transaction", TransactionSchema);