const mongoose = require('mongoose');

// This schema defines a single entry in an officer's log
const historyEntrySchema = new mongoose.Schema({
  // A unique ID for this specific history record (e.g., UH-20251109-0001)
  recordId: { type: String, unique: true }, 
  
  // The original Request ID (e.g., REQ-20251109-0001)
  requestId: { type: String, ref: 'Request' },
  
  // When the officer first submitted the request
  requestDate: { type: Date }, 

  // Item details
  equipmentPoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentPool' },
  equipmentPoolName: { type: String },
  itemUniqueId: { type: String, required: true },
  category: { type: String },

  // Issue details
  issuedDate: { type: Date, required: true }, // This will be the ADMIN'S APPROVAL TIME
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  purpose: { type: String }, // The officer's stated reason
  conditionAtIssue: { type: String },
  expectedReturnDate: { type: Date },

  // Return details
  returnedDate: { type: Date },
  returnedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  conditionAtReturn: { type: String },
  remarks: { type: String },
  
  // Status of this history entry
  status: { type: String, enum: ['Completed', 'Pending Return'], default: 'Pending Return' }
});

// This is the main document, one for each officer
const officerHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  officerId: { // Police ID, e.g., POL/CHD/1234
    type: String,
    required: true,
    unique: true
  },
  officerName: { type: String },
  designation: { type: String },
  posting: { type: String },
  history: [historyEntrySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('OfficerHistory', officerHistorySchema);