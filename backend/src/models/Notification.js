const mongoose = require("mongoose");

const notificationSchema=new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

     message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["Order", "TripBlock", "System"],
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
},
{
    timestamps:true,
})

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;