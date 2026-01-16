const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a project name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to check if user is admin of this project
projectSchema.methods.isMember = function (userId) {
  return this.members.some(
    (member) => {
      // ✅ FIX: Both ko string mein convert karo
      const memberUserId = member.user._id 
        ? member.user._id.toString() 
        : member.user.toString();
      const checkUserId = userId.toString();
      
      return memberUserId === checkUserId;
    }
  );
};

// Method to check if user is admin of this project
projectSchema.methods.isAdmin = function (userId) {
  return this.members.some(
    (member) => {
      // ✅ FIX: Both ko string mein convert karo
      const memberUserId = member.user._id 
        ? member.user._id.toString() 
        : member.user.toString();
      const checkUserId = userId.toString();
      
      return memberUserId === checkUserId && member.role === 'admin';
    }
  );
};

module.exports = mongoose.model('Project', projectSchema);