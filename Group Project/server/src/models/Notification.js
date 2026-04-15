import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true
    },
    type: {
      type: String,
      enum: ["issue_created", "issue_updated", "issue_assigned", "issue_resolved"],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
