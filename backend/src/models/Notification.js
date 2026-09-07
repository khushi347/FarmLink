const mongoose = require("mongoose");

const notificationSchema=new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      default: null,
    },

    recipientType: {
      type: String,
      enum: ["User", "Farmer"],
      default: "User",
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

    channel: {
      type: String,
      enum: ["WHATSAPP", "SOCKET_IO", "IN_APP", "SYSTEM"],
      default: "IN_APP",
    },

    deliveryStatus: {
      type: String,
      enum: ["PENDING", "SENT", "DELIVERED", "FAILED"],
      default: "SENT",
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
    timestamps: true,
})

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;