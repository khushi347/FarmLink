const mongoose = require("mongoose");

const tripBlockSchema = new mongoose.Schema(
  {
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
      },
    ],

    service: {
      type: String,
      enum: [
        "Seeds",
        "Fertilizer",
        "Pesticides",
        "Tractor Rental",
        "Water Tanker",
        "Machinery",
      ],
      required: true,
    },

    assignedShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },

    scheduledDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Active", "Completed", "Cancelled"],
      default: "Pending",
    },

    centerLocation: {
      type:{
        type:String,
        enum:["Point"],
        default:"Point",
        required:true
      },
      coordinates:{
        type:[Number],
        required:true
      }
    },
  },
  {
    timestamps: true,
  }
);

tripBlockSchema.index({centerLocation:"2dsphere"})
const TripBlock = mongoose.model("TripBlock", tripBlockSchema);

module.exports = TripBlock;