const express =require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Request = require('../models/Request');
const EquipmentPool = require('../models/EquipmentPool');
const OfficerHistory = require('../models/OfficerHistory');
const { auth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');

const router = express.Router();

// Apply auth and admin role check to all routes
router.use(auth, adminOnly);

// @route   GET /api/admin/dashboard
// ... (this route is unchanged)
router.get('/dashboard', async (req, res) => {
  try {
    // User and Request stats
    const [
      totalUsers,
      totalOfficers,
      pendingRequests,
      recentRequests
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'officer', isActive: true }),
      Request.countDocuments({ status: 'Pending' }),
      Request.find({ status: 'Pending' })
        .populate('requestedBy', 'fullName officerId')
        .populate('poolId', 'poolName model')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Equipment stats (from EquipmentPool)
    const poolStats = await EquipmentPool.aggregate([
      {
        $group: {
          _id: null,
          totalEquipment: { $sum: '$totalQuantity' },
          availableEquipment: { $sum: '$availableCount' },
          issuedEquipment: { $sum: '$issuedCount' }
        }
      }
    ]);
    
    const equipmentStats = poolStats[0] || {
      totalEquipment: 0,
      availableEquipment: 0,
      issuedEquipment: 0
    };

    // Category stats (from EquipmentPool)
    const equipmentCategories = await EquipmentPool.aggregate([
      { $group: { _id: '$category', count: { $sum: '$totalQuantity' } } }
    ]);

    const requestsThisMonth = await Request.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalOfficers,
          totalEquipment: equipmentStats.totalEquipment,
          availableEquipment: equipmentStats.availableEquipment,
          issuedEquipment: equipmentStats.issuedEquipment,
          pendingRequests,
          requestsThisMonth
        },
        equipmentCategories,
        recentRequests
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET /api/admin/users
// ... (this route is unchanged)
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const query = {
      ...(search && {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { badgeNumber: { $regex: search, $options: 'i' } }
        ]
      }),
      ...(role && { role })
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});


// @route POST /api/admin/users
// ... (this route is unchanged)
router.post('/users', [
  body('officerId')
    .trim()
    .isLength({ min: 12, max: 18 })
    .withMessage('Officer ID must be 12-18 characters'),
  body('fullName')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Full name must be 3-100 characters'),
  body('email')
    .isEmail()
    .withMessage('Must be a valid email'),
  body('password')
    .isLength({ min: 8, max: 8 })
    .withMessage('Password must be exactly 8 characters'),
  body('dateOfJoining')
    .isISO8601() // Corrected from isISO801
    .withMessage('Must be a valid date'),
  body('rank')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Rank is required'),
  body('designation')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Designation is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { officerId, fullName, email, password, dateOfJoining, rank, designation, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { officerId }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or officer ID already exists'
      });
    }

    // Create new user
    const user = new User({
      officerId,
      fullName,
      email,
      password,
      dateOfJoining,
      rank,
      designation,
      role: role || 'officer',
      createdBy: req.user._id
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Officer created successfully',
      data: { user: user.toJSON() }
    });

  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        path: key,
        msg: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating user',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   PUT /api/admin/users/:id
// ... (this route is unchanged)
router.put('/users/:id', [
  body('fullName').optional().trim().isLength({ min: 3, max: 100 }),
  body('rank').optional().trim().isLength({ min: 1 }),
  body('designation').optional().trim().isLength({ min: 1 }),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { fullName, rank, designation, isActive } = req.body;
    const updates = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (rank !== undefined) updates.rank = rank;
    if (designation !== undefined) updates.designation = designation;
    if (isActive !== undefined) updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET /api/admin/users/:userId/history
// ... (this route is unchanged)
router.get('/users/:userId/history', async (req, res) => {
  try {
    const officerHistory = await OfficerHistory.findOne({ userId: req.params.userId })
      .populate('userId', 'fullName officerId designation')
      .populate('history.issuedBy', 'fullName officerId')
      .populate('history.returnedTo', 'fullName officerId');

    if (!officerHistory) {
      const user = await User.findById(req.params.userId).select('fullName officerId designation');
      return res.json({ 
        success: true, 
        data: { 
          history: [], 
          officer: user 
        } 
      });
    }

    officerHistory.history.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    res.json({
      success: true,
      data: { 
        history: officerHistory.history,
        officer: officerHistory.userId
      }
    });

  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user's equipment history"
    });
  }
});

// @route   GET /api/admin/requests
// ... (this route is unchanged - already fixed to populate 'requestedBy' fully)
router.get('/requests', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';
    const requestType = req.query.requestType || '';

    const query = {
      ...(status && { status }),
      ...(requestType && { requestType })
    };

    const [requests, total] = await Promise.all([
      Request.find(query)
        .populate('requestedBy')
        .populate('poolId', 'poolName model category')
        .populate('processedBy', 'fullName officerId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Request.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching requests',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   PUT /api/admin/requests/:id/approve
// @desc    Approve a request
router.put('/requests/:id/approve', [
  body('notes').optional().isLength({ max: 500 }),
  body('condition').optional().isIn(['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'])
], async (req, res) => {
  try {
    const { notes, condition } = req.body;

    const request = await Request.findById(req.params.id)
      .populate('poolId')
      .populate('requestedBy');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request is not in pending status' });
    }

    // --- Logic for ISSUE requests ---
    if (request.requestType === 'Issue') {
      
      // ======== 泙 THIS IS THE FIX 泙 ========
      // We must re-fetch the pool, just like in the 'Return' and 'Maintenance'
      // blocks. Modifying the populated 'request.poolId' directly
      // causes a validation error when 'request.save()' is called later.
      const pool = await EquipmentPool.findById(request.poolId._id);
      // ===================================
      
      if (!pool) {
        return res.status(404).json({ success: false, message: 'Equipment pool not found for this request.' });
      }
      
      pool.updateCounts();
      const availableItem = pool.getNextAvailableItem(); // Use the triage function
      if (!availableItem) {
        return res.status(400).json({ success: false, message: `No available items in pool (or all are in Poor condition): ${pool.poolName}` });
      }

      // 1. Issue the item from the pool
      // This 'pool' variable is now the re-fetched one, not the populated one.
      const assignedItem = await pool.issueItem(
        request.requestedBy._id,
        request.requestedBy.officerId,
        request.requestedBy.fullName,
        request.requestedBy.designation,
        request.reason,
        req.user._id // Issued by admin
      );
      
      request.assignedUniqueId = assignedItem.uniqueId;

      // 2. Create the entry in OfficerHistory.js
      try {
        const recordId = await generateHistoryRecordId();
        await OfficerHistory.findOneAndUpdate(
          { userId: request.requestedBy._id },
          { 
            $set: { 
              officerId: request.requestedBy.officerId, 
              officerName: request.requestedBy.fullName, 
              designation: request.requestedBy.designation 
            },
            $push: { 
              history: {
                recordId: recordId,
                requestId: request.requestId,
                requestDate: request.requestedDate,
                equipmentPoolId: pool._id,
                equipmentPoolName: pool.poolName,
                itemUniqueId: assignedItem.uniqueId,
                category: pool.category,
                issuedDate: new Date(),
                issuedBy: req.user._id,
                purpose: request.reason,
                conditionAtIssue: assignedItem.condition,
                status: 'Pending Return'
              }
            }
          },
          { upsert: true, new: true }
        );
      } catch (historyError) {
        console.error('Failed to update officer history:', historyError);
      }
    }
    
    // --- Logic for RETURN requests ---
    if (request.requestType === 'Return') {
      if (request.poolId && request.assignedUniqueId) {
        // This block correctly re-fetches the pool, so it's safe.
        const pool = await EquipmentPool.findById(request.poolId);
        if (!pool) {
           return res.status(404).json({ success: false, message: 'Pool not found for return' });
        }
        
        const returnCondition = condition || request.condition || 'Good';

        // 1. Return the item to the pool (This updates EquipmentPool.js)
        const returnedItem = await pool.returnItem(
          request.assignedUniqueId,
          returnCondition,
          request.reason, // Pass the officer's reason
          req.user._id
        );
        
        // 2. Update the entry in OfficerHistory.js
        try {
          const latestHistoryEntry = returnedItem.usageHistory[returnedItem.usageHistory.length - 1];
          await OfficerHistory.updateOne(
            { "history.itemUniqueId": request.assignedUniqueId, "history.status": "Pending Return" },
            { 
              $set: { 
                "history.$.returnedDate": latestHistoryEntry.returnedDate,
                "history.$.returnedTo": latestHistoryEntry.returnedTo,
                "history.$.conditionAtReturn": latestHistoryEntry.conditionAtReturn,
                "history.$.remarks": latestHistoryEntry.remarks, // This now has the reason
                "history.$.status": "Completed"
              }
            }
          );
        } catch (historyError) {
          console.error('Failed to update officer history on return:', historyError);
        }
      }
    }
    
    // --- Logic for MAINTENANCE requests ---
    if (request.requestType === 'Maintenance') {
      if (request.poolId && request.assignedUniqueId) {
        // This block also correctly re-fetches the pool.
        const pool = await EquipmentPool.findById(request.poolId);
        if (!pool) {
           return res.status(404).json({ success: false, message: 'Pool not found for this item' });
        }
        
        const item = pool.findItemByUniqueId(request.assignedUniqueId);
        if (!item) {
          return res.status(404).json({ success: false, message: 'Item not found in pool' });
        }

        const maintCondition = request.condition || 'Poor';

        // 1. Find the officer's "Issued" record in usageHistory
        const lastUsage = item.usageHistory.find(
          (h) => h.returnedDate === undefined
        );
        
        if (lastUsage) {
          // 2. "Close out" the officer's record
          lastUsage.returnedDate = new Date();
          lastUsage.returnedTo = req.user._id;
          lastUsage.conditionAtReturn = maintCondition;
          lastUsage.remarks = `Moved to maintenance: ${request.reason}`;
        }
        
        // 3. Set the item's master status to 'Maintenance'
        item.status = 'Maintenance';
        item.condition = maintCondition;
        
        // 4. Add the official maintenance log entry
        item.maintenanceHistory.push({
          reportedDate: new Date(),
          reportedBy: lastUsage ? lastUsage.userId : request.requestedBy._id,
          reason: request.reason, // The officer's reason
          type: 'Repair',
          action: 'Awaiting repair...',
          fixedBy: null
        });
        
        // 5. Clear the item from the officer's possession
        item.currentlyIssuedTo = undefined;
        
        pool.updateCounts();
        
        // This save call is fine because it's on the re-fetched 'pool'
        await pool.save({ validateBeforeSave: false });

        // 6. Update the OfficerHistory log
        try {
          await OfficerHistory.updateOne(
            { "history.itemUniqueId": request.assignedUniqueId, "history.status": "Pending Return" },
            { 
              $set: { 
                "history.$.status": "Completed", 
                "history.$.returnedDate": new Date(),
                "history.$.returnedTo": req.user._id,
                "history.$.conditionAtReturn": maintCondition,
                "history.$.remarks": `Moved to maintenance: ${request.reason}`
              }
            }
          );
        } catch (historyError) {
          console.error('Failed to update officer history on maintenance:', historyError);
        }
      }
    }

    // ======== 🟢 ADD THIS ENTIRE BLOCK 🟢 ========
    // --- Logic for LOST requests ---
    if (request.requestType === 'Lost') {
      if (request.poolId && request.assignedUniqueId) {
        
        const pool = await EquipmentPool.findById(request.poolId);
        if (!pool) {
           return res.status(404).json({ success: false, message: 'Pool not found for this item' });
        }
        
        const item = pool.findItemByUniqueId(request.assignedUniqueId);
        if (!item) {
          return res.status(404).json({ success: false, message: 'Item not found in pool' });
        }

        // 1. Find and close out the officer's "Issued" record in usageHistory
        const lastUsage = item.usageHistory.find(
          (h) => h.returnedDate === undefined
        );
        
        const lostReason = `Reported as Lost. FIR: ${request.firNumber || 'N/A'}. ${request.reason}`;

        if (lastUsage) {
          lastUsage.returnedDate = new Date();
          lastUsage.returnedTo = req.user._id; // The admin
          lastUsage.conditionAtReturn = 'Poor'; // Mark as poor
          lastUsage.remarks = lostReason;
        }
        
        // 2. Set item status to 'Maintenance' (as requested, to appear in Maintenance Log)
        item.status = 'Maintenance';
        item.condition = 'Out of Service'; // This is a fitting condition
        
        // 3. Add the official 'lostHistory' log entry
        item.lostHistory.push({
          reportedDate: new Date(),
          reportedBy: request.requestedBy._id,
          firNumber: request.firNumber,
          firDate: request.firDate,
          description: request.reason, // Officer's description of loss
          status: 'Under Investigation'
        });

        // 4. Add a 'maintenanceHistory' entry so it appears correctly in the log
        item.maintenanceHistory.push({
          reportedDate: new Date(),
          reportedBy: request.requestedBy._id,
          reason: `ITEM REPORTED LOST. FIR: ${request.firNumber || 'N/A'}. ${request.reason || ''}`,
          type: 'Repair', // 'Repair' is a good type
          action: 'Awaiting investigation / write-off...',
          fixedBy: null
        });
        
        // 5. Clear the item from the officer's possession
        item.currentlyIssuedTo = undefined;
        
        pool.updateCounts();
        
        // 6. Save the pool
        await pool.save({ validateBeforeSave: false });

        // 7. Update the OfficerHistory log
        try {
          await OfficerHistory.updateOne(
            { "history.itemUniqueId": request.assignedUniqueId, "history.status": "Pending Return" },
            { 
              $set: { 
                "history.$.status": "Completed", 
                "history.$.returnedDate": new Date(),
                "history.$.returnedTo": req.user._id,
                "history.$.conditionAtReturn": 'Poor', // or 'Lost'
                "history.$.remarks": lostReason
              }
            }
          );
        } catch (historyError) {
          console.error('Failed to update officer history on lost:', historyError);
        }
      }
    }
    // ===============================================

    // 7. Approve the original request
    await request.approve(req.user._id, notes);
    
    // This 'request.save()' is now safe because we no longer
    // modified the 'request.poolId' populated document.
    await request.save(); 

    res.json({
      success: true,
      message: 'Request approved successfully',
      data: { request }
    });

  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error approving request',
    });
  }
});

// @route   PUT /api/admin/requests/:id/reject
// ... (this route is unchanged)
router.put('/requests/:id/reject', [
  body('reason').isLength({ min: 1, max: 500 }).withMessage('Reason for rejection is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { reason } = req.body;

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Request is not in pending status'
      });
    }

    // Reject the request
    await request.reject(req.user._id, reason);

    res.json({
      success: true,
      message: 'Request rejected successfully',
      data: { request }
    });

  } catch (error) {
    console.error('Reject request error:', error);
    // ======== 泙 FIXED TYPO HERE 泙 ========
    res.status(500).json({
      success: false,
      message: 'Server error rejecting request',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET /api/admin/reports/summary
// ... (this route is unchanged)
router.get('/reports/summary', async (req, res) => {
  try {
    const startDate = new Date(req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(req.query.endDate || new Date());

    const [
      requestsSummary,
      equipmentSummary,
      userActivity
    ] = await Promise.all([
      Request.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // Get equipment status summary from pools
      EquipmentPool.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.status',
            count: { $sum: 1 }
          }
        }
      ]),
      User.aggregate([
        {
          $match: {
            role: 'officer',
            isActive: true
          }
        },
        {
          $lookup: {
            from: 'requests',
            localField: '_id',
            foreignField: 'requestedBy',
            as: 'requests'
          }
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            badgeNumber: 1,
            requestCount: { $size: '$requests' }
          }
        },
        {
          $sort: { requestCount: -1 }
        },
        {
          $limit: 10
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        requestsSummary,
        equipmentSummary,
        userActivity,
        dateRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating summary report',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// ... (this helper function is unchanged)
async function generateHistoryRecordId() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `UH-${dateStr}-`;
  
  try {
    const result = await OfficerHistory.aggregate([
      { $unwind: '$history' },
      { $match: { 'history.recordId': { $regex: new RegExp('^' + prefix) } } },
      { $sort: { 'history.recordId': -1 } },
      { $limit: 1 },
      { $project: { _id: 0, 'history.recordId': 1 } }
    ]);

    let nextSequence = 1;
    if (result.length > 0) {
      const lastRecordId = result[0].history.recordId;
      const lastSeqStr = lastRecordId.split('-')[2];
      if (lastSeqStr && !isNaN(lastSeqStr)) {
        nextSequence = parseInt(lastSeqStr, 10) + 1;
      }
    }
    
    return `${prefix}${nextSequence.toString().padStart(4, '0')}`;
    
  } catch (error) {
    console.error("Error generating history record ID:", error);
    return `${prefix}${(Math.floor(Math.random() * 9000) + 1000)}`; 
  }
}

module.exports = router;