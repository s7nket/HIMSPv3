const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: false  // Changed to false for pool requests
  },
  
  // ========== NEW POOL FIELDS ==========
  poolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EquipmentPool'
  },
  poolName: {
    type: String,
    trim: true
  },
  // ======== 泙 RENAMED THIS FIELD 泙 ========
  assignedUniqueId: { // Renamed from assignedEquipmentId to match officer.js
    type: String,  // Stores unique ID like "GLK001"
    trim: true
  },
  assignedFromPool: {
    type: Boolean,
    default: false
  },
  // ====================================
  
  requestType: {
    type: String,
    // ======== 🟢 MODIFIED THIS LINE 🟢 ========
    enum: ['Issue', 'Return', 'Maintenance', 'Lost'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  requestedDate: {
    type: Date,
    default: Date.now
  },
  expectedReturnDate: {
    type: Date,
    required: function() {
      return this.requestType === 'Issue';
    }
  },
  reason: {
    type: String,
    required: [true, 'Reason for request is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },

  // ======== 泙 ADDED THIS FIELD 泙 ========
  // This was missing, causing the 500 error on return
  condition: {
    type: String,
    // ======== 🟢 MODIFIED THIS LINE 🟢 ========
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service', 'Lost']
  },
  // =====================================
  
  // ======== 🟢 ADD THIS ENTIRE BLOCK 🟢 ========
  // Fields for 'Lost' type requests
  firNumber: {
    type: String,
    trim: true
  },
  firDate: {
    type: Date
  },
  policeStation: {
    type: String,
    trim: true
  },
  dateOfLoss: {
    type: Date
  },
  placeOfLoss: {
    type: String,
    trim: true
  },
  dutyAtTimeOfLoss: {
    type: String,
    trim: true
  },
  remedialActionTaken: {
    type: String,
    trim: true
  },
  witnesses: {
    type: String,
    trim: true
  },
  // ============================================

  adminNotes: {
    type: String,
    maxlength: [500, 'Admin notes cannot exceed 500 characters']
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedDate: {
    type: Date
  },
  approvedDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  attachments: [{
    filename: String,
    url: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedDate: {
      type: Date,
      default: Date.now
    },
    notes: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
requestSchema.index({ requestId: 1 });
requestSchema.index({ requestedBy: 1 });
requestSchema.index({ equipmentId: 1 });
requestSchema.index({ poolId: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ requestType: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ processedBy: 1 });

// ======== 尅 DELETED 尅 ========
// The old, buggy requestSchema.pre('validate', ...) hook has been removed.
// =================================

// This is the correct hook
requestSchema.pre('save', async function(next) {
  // Only generate ID if it's a new document
  if (!this.isNew || this.requestId) {
    return next();
  }

  try {
    // 1. Generate today's date prefix (e.g., "REQ-20251107-")
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `REQ-${dateStr}-`;

    // 2. Create a very strict regex to find ONLY valid IDs from today
    const searchRegex = new RegExp(`^${prefix}\\d{4}$`);

    // 3. Find the LAST request that matches this exact pattern
    const lastRequest = await this.constructor.findOne({
      requestId: { $regex: searchRegex }
    }).sort({ requestId: -1 });

    let nextSequence = 1;

    // 4. If we found a previous request...
    if (lastRequest && lastRequest.requestId) {
      // Get the last 4 digits (e.g., "0001")
      const lastSequenceStr = lastRequest.requestId.substring(prefix.length);
      
      // Convert to a number, add 1
      if (!isNaN(parseInt(lastSequenceStr, 10))) {
         nextSequence = parseInt(lastSequenceStr, 10) + 1;
      }
    }

    // 5. Set the new ID, padding with zeros (e.g., 2 becomes "0002")
    this.requestId = `${prefix}${nextSequence.toString().padStart(4, '0')}`;
    
    next();
  } catch (error) {
    next(error);
  }
});

// ... (rest of file is unchanged) ...

// Method to approve request
requestSchema.methods.approve = function(adminId, notes) {
  this.status = 'Approved';
  this.processedBy = adminId;
  this.processedDate = new Date();
  this.approvedDate = new Date();
  this.adminNotes = notes;
  return this.save();
};

// Method to reject request
requestSchema.methods.reject = function(adminId, reason) {
  this.status = 'Rejected';
  this.processedBy = adminId;
  this.processedDate = new Date();
  this.adminNotes = reason;
  return this.save();
};

// Method to complete request
requestSchema.methods.complete = function(adminId, notes) {
  this.status = 'Completed';
  this.processedBy = adminId;
  this.completedDate = new Date();
  if (notes) this.adminNotes = notes;
  return this.save();
};

// Static method to get pending requests
requestSchema.statics.getPendingRequests = function() {
  return this.find({ status: 'Pending' })
    .populate('requestedBy', 'fullName officerId designation')
    .populate('equipmentId', 'name model serialNumber category')
    .populate('poolId', 'poolName model category manufacturer')
    .sort({ createdAt: -1 });
};

// Static method to get user requests
requestSchema.statics.getUserRequests = function(userId) {
  return this.find({ requestedBy: userId })
    .populate('equipmentId', 'name model serialNumber category')
    .sort({ createdAt: -1 });
};

// Virtual for days since request
requestSchema.virtual('daysSinceRequest').get(function() {
  const today = new Date();
  const requestDate = new Date(this.requestedDate);
  const diffTime = Math.abs(today - requestDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtual fields are serialized
requestSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Request', requestSchema);