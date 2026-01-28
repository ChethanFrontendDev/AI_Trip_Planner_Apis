import mongoose from "mongoose";

const AiTripSchema = new mongoose.Schema(
  {
    destination: {
      type: String,
      required: true,
      trim: true,
    },

    best_time: {
      type: String,
      required: true,
    },

    duration_days: {
      type: Number,
      required: true,
      min: 1,
    },

    top_attractions: {
      type: [String],
      required: true,
    },

    sample_itinerary: [
      {
        day: {
          type: Number,
          required: true,
        },
        plan: {
          type: String,
          required: true,
        },
      },
    ],

    estimated_budget_inr: {
      low: {
        type: Number,
        required: true,
      },
      mid: {
        type: Number,
        required: true,
      },
      high: {
        type: Number,
        required: true,
      },
    },

    local_tips: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("AiTrips", AiTripSchema);
