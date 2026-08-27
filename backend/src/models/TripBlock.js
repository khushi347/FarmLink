const mongoose = require("mongoose");

const tripBlockSchema = new mongoose.Schema(
  {
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],

    serviceType: {
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
      enum: ["OPEN", "CLAIMED", "COMPLETED"],
      default: "OPEN",
    },

    completedAt: {
    type: Date,
    default: null
    },

    claimedAt:{
      type:Date,
      default:null
    },

    estimatedEarnings:{
      type:Number,
      default:0
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
    }
  },
  {
    timestamps: true,
  }
);

tripBlockSchema.index({centerLocation:"2dsphere"})
const TripBlock = mongoose.model("TripBlock", tripBlockSchema);

module.exports = TripBlock;