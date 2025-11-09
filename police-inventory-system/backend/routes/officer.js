const express = require('express');
const { body, validationResult } = require('express-validator');
const Request = require('../models/Request');
const { auth } = require('../middleware/auth');
const { officerOnly, adminOrOfficer } = require('../middleware/roleCheck');
const EquipmentPool = require('../models/EquipmentPool');
const OfficerHistory = require('../models/OfficerHistory')
const mongoose = require('mongoose');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// In: routes/officer.js

// In: backend/routes/officer.js

// @route   GET /api/officer/dashboard
// @desc    Get officer dashboard data
// @access  Private (Officer only)
router.get('/dashboard', officerOnly, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Get My Requests
    const [myRequests, pendingRequests] = await Promise.all([
      Request.countDocuments({ requestedBy: userId }),
      Request.countDocuments({
        requestedBy: userId,
        status: 'Pending'
      })
    ]);

    // 2. Get My Issued Equipment Count from Pools
    const issuedPools = await EquipmentPool.find({
      'items.currentlyIssuedTo.userId': userId
    });
    const myIssuedEquipment = issuedPools.reduce((count, pool) => {
      return count + pool.items.filter(item =>
        // ======== 🟢 MODIFIED 🟢 ========
        // Added 'item.currentlyIssuedTo.userId &&' to prevent crash
        item.currentlyIssuedTo && item.currentlyIssuedTo.userId && item.currentlyIssuedTo.userId.equals(userId)
      ).length;
    }, 0);

    // 3. Get Available Equipment Pools (authorized for officer)
    const authorizedPools = await EquipmentPool.find({
      authorizedDesignations: req.user.designation
    }).select('items'); 

    let availableEquipment = 0;
    for (const pool of authorizedPools) {
      pool.updateCounts(); 
      if (pool.availableCount > 0) {
        availableEquipment++; 
      }
    }
    
    // 4. Get Recent Activity
    const recentActivity = await Request.find({ requestedBy: req.user._id })
        .populate('poolId', 'poolName model') 
        .sort({ createdAt: -1 })
        .limit(5)

    res.json({
      success: true,
      data: {
        stats: {
          myRequests,
          myIssuedEquipment,
          availableEquipment,
          pendingRequests
        },
        recentActivity
      }
    });

  } catch (error) {
    console.error('Officer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET /api/officer/requests
// @desc    Get user's requests
// @access  Private (Officer only)
router.get('/requests', officerOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || '';

    const query = {
      requestedBy: req.user._id,
      ...(status && { status })
    };

    const [requests, total] = await Promise.all([
      Request.find(query)
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
    console.error('Get user requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching requests',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST /api/officer/requests
// @desc    Create new equipment request (now ONLY for pool item returns)
// @access  Private (Officer only)
router.post('/requests', officerOnly, [
  // ... (validations)
  body('poolId').isMongoId().withMessage('Valid pool ID is required'),
  body('uniqueId').trim().notEmpty().withMessage('Valid item unique ID is required'),
  body('requestType').isIn(['Return', 'Maintenance']).withMessage('Valid request type is required (Issue requests use a different route)'),
  body('reason').isLength({ min: 1, max: 100 }).withMessage('Reason is required and cannot exceed 100 characters'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']),

  // ======== 🟢 ADDED 🟢 ========
  // Add validation for the 'condition' field from the form
  body('condition').isIn(['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service']).withMessage('Valid condition is required'),
  
  body('expectedReturnDate').optional().isISO8601().withMessage('Valid date format required')
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

    const {
      poolId, uniqueId,
      requestType, reason, priority, expectedReturnDate,
      condition // ======== 🟢 ADDED 🟢 ========
    } = req.body; // Destructure the 'condition' from the request body

    let pool;
    let item;

    pool = await EquipmentPool.findById(poolId);
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Equipment pool not found' });
    }
    item = pool.findItemByUniqueId(uniqueId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in pool' });
    }

    // This logic is correct
    if (requestType === 'Return') {
      if (item.status !== 'Issued' ||
          !item.currentlyIssuedTo ||
          !item.currentlyIssuedTo.userId.equals(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: 'This pool item is not issued to you'
        });
      }
    }

    const request = new Request({
      requestedBy: req.user._id,
      poolId: poolId,
      assignedUniqueId: uniqueId,
      requestType,
      reason,
      priority: priority || 'Medium',
      condition: condition, // ======== 🟢 ADDED 🟢 ========
      ...(expectedReturnDate && { expectedReturnDate: new Date(expectedReturnDate) })
    });

    await request.save(); // This was failing, but now should work

    const populatedRequest = await Request.findById(request._id)
      .populate('poolId', 'poolName model category')
      .populate('requestedBy', 'fullName officerId');

    res.status(201).json({
      success: true,
      message: 'Request submitted successfully',
      data: { request: populatedRequest }
    });

  } catch (error) {
    console.error('Create request error:', error); // This will now show the Mongoose error if it's different
    res.status(500).json({
      success: false,
      message: 'Server error creating request',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   PUT /api/officer/requests/:id/cancel
// @desc    Cancel a pending request
// @access  Private (Officer only)
router.put('/requests/:id/cancel', officerOnly, async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.id,
      requestedBy: req.user._id
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be cancelled'
      });
    }

    request.status = 'Cancelled';
    await request.save();

    res.json({
      success: true,
      message: 'Request cancelled successfully',
      data: { request }
    });

  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling request',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// In: backend/routes/officer.js

// @route   GET /api/officer/equipment/issued
// @desc    Get equipment issued to the officer (from POOLS)
// @access  Private (Officer only)
router.get('/equipment/issued', officerOnly, async (req, res) => {
  try {
    const pools = await EquipmentPool.find({
      'items.currentlyIssuedTo.userId': req.user._id
    }).select('poolName category model items');

    const issuedItems = [];
    
    pools.forEach(pool => {
      pool.items.forEach(item => {
        // ======== 🟢 MODIFIED 🟢 ========
        // Added 'item.currentlyIssuedTo.userId &&' to prevent crash
        if (item.currentlyIssuedTo && item.currentlyIssuedTo.userId && item.currentlyIssuedTo.userId.equals(req.user._id)) {
          issuedItems.push({
            _id: item.uniqueId, 
            poolId: pool._id, 
            name: pool.poolName,
            model: pool.model,
            serialNumber: item.uniqueId, 
            category: pool.category,
            condition: item.condition,
            issuedTo: {
              userId: item.currentlyIssuedTo.userId,
              issuedDate: item.currentlyIssuedTo.issuedDate,
              expectedReturnDate: item.currentlyIssuedTo.expectedReturnDate
            }
          });
        }
      });
    });

    res.json({
      success: true,
      data: { equipment: issuedItems }
    });

  } catch (error) {
    console.error('Get issued equipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching issued equipment',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET /api/officer/inventory
// @desc    View available equipment inventory (Equipment Pools authorized for officer)
// @access  Private (Officer and Admin)
//
// ======== 🟢 THIS IS THE FIX FOR THE LIST 🟢 ========
//
router.get('/inventory', adminOrOfficer, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category || '';
    const search = req.query.search || '';
    
    const designation = req.user.designation;
    
    const query = {
      authorizedDesignations: designation,
      ...(category && { category }),
      ...(search && {
        $or: [
          { poolName: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const [pools, total, categories] = await Promise.all([
      EquipmentPool.find(query)
        // **THE FIX:** Added 'items' to .select() so updateCounts() can work
        .select('poolName category model manufacturer totalQuantity availableCount issuedCount location items')
        .sort({ poolName: 1 })
        .skip(skip)
        .limit(limit),
      EquipmentPool.countDocuments(query),
      EquipmentPool.distinct('category', { authorizedDesignations: designation })
    ]);
    
    // This will now work correctly because 'items' was fetched
    for (const pool of pools) {
      pool.updateCounts();
    }

    res.json({
      success: true,
      data: {
        equipment: pools, 
        categories,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching inventory',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET /api/officer/equipment/:id
// @desc    Get specific equipment pool details
// @access  Private (Officer and Admin)
//
// ======== 🟢 THIS IS THE FIX FOR THE DETAILS MODAL 🟢 ========
//
router.get('/equipment/:id', adminOrOfficer, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    
    const pool = await EquipmentPool.findById(req.params.id)
      .populate('addedBy', 'fullName officerId')
      .populate('lastModifiedBy', 'fullName officerId');

    if (!pool) {
      return res.status(404).json({
        success: false,
        message: 'Equipment pool not found'
      });
    }
    
    if (req.user.role === 'officer' && !pool.authorizedDesignations.includes(req.user.designation)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this equipment pool'
      });
    }

    // **THE FIX:** Added this line to recalculate counts before sending
    pool.updateCounts(); 

    res.json({
      success: true,
      data: { equipment: pool } 
    });

  } catch (error) {
    console.error('Get equipment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching equipment details',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST /api/officer/equipment-requests/from-pool
// @desc    Request equipment from pool
// @access  Private (Officer only)
router.post('/equipment-requests/from-pool', officerOnly, [
  body('poolId').isMongoId().withMessage('Valid pool ID is required'),
  body('poolName').trim().isLength({ min: 1 }).withMessage('Pool name is required'),
  body('reason').trim().isLength({ min: 1 }).withMessage('Purpose is required')
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
    
    const { poolId, poolName, reason, priority, expectedDuration, notes } = req.body;
    
    const pool = await EquipmentPool.findById(poolId);
    if (!pool) {
      return res.status(404).json({
        success: false,
        message: 'Equipment pool not found'
      });
    }
    
    pool.updateCounts(); // Check counts before processing
    if (pool.availableCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No equipment available in this pool'
      });
    }
    
    if (!pool.authorizedDesignations.includes(req.user.designation)) {
      // ======== 🟢 TYPO FIX 1 🟢 ========
      // Corrected the error message response
      return res.status(403).json({
        success: false,
        message: 'This officer is not authorized to request from this pool.'
      });
    }
    
    const existingRequest = await Request.findOne({
      requestedBy: req.user._id,
      poolId: poolId,
      status: 'Pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this equipment pool'
      });
    }
    
    const request = new Request({
      requestedBy: req.user._id,
      equipmentId: null,
      poolId: poolId,
      poolName: poolName,
      requestType: 'Issue',
      reason: reason,
      priority: priority || 'Medium',
      notes: notes,
      expectedReturnDate: expectedDuration ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined
    });
    
    await request.save();
    
    const populatedRequest = await Request.findById(request._id)
      .populate('requestedBy', 'fullName officerId designation email');
    
    res.status(201).json({
      success: true,
      message: 'Equipment request submitted successfully',
      data: { request: populatedRequest }
    });
  } catch (error) {
    console.error('Create pool request error:', error);
    // ======== 🟢 TYPO FIX 2 🟢 ========
    // Replaced '5G /api/officer/equipment/:id00' with '500'
    res.status(500).json({
      success: false,
      message: 'Server error creating equipment request'
    });
  }
});

// @route   GET /api/officer/my-requests
// @desc    Get my requests
// @access  Private (Officer only)
router.get('/my-requests', officerOnly, async (req, res) => {
  try {
    const requests = await Request.find({ requestedBy: req.user._id })
      .populate('poolId', 'poolName model') 
      .populate('processedBy', 'fullName officerId')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { requests }
    });
  } catch (error)
 {
    console.error('Get my requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your requests'
    });
  }
});

// @route   GET /api/officer/my-history
// @desc    Get the full usage history for the logged-in officer
// @access  Private (Officer only)
router.get('/my-history', officerOnly, async (req, res) => {
  try {
    // This is the fast query using your new model
    const officerHistory = await OfficerHistory.findOne({ userId: req.user._id })
      .populate('history.issuedBy', 'fullName officerId')
      .populate('history.returnedTo', 'fullName officerId');

    if (!officerHistory) {
      // If they have no history yet, return an empty array
      return res.json({ success: true, data: { history: [] } });
    }

    // Sort the history array by the most recent request date
    officerHistory.history.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    res.json({
      success: true,
      data: { history: officerHistory.history }
    });

  } catch (error) {
    console.error('Get my-history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching equipment history'
    });
  }
});

module.exports = router;