const express = require('express');
const { body, validationResult } = require('express-validator');
const EquipmentPool = require('../models/EquipmentPool');
const User = require('../models/User');
const Request = require('../models/Request');
const { auth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// ============================================
// EQUIPMENT POOL ROUTES
// ============================================

// @route GET /api/equipment/pools
router.get('/pools', adminOnly, async (req, res) => {
  try {
    const { category, designation, search } = req.query;
    
    const query = {
      ...(category && { category }),
      ...(designation && { authorizedDesignations: designation }),
      ...(search && {
        $or: [
          { poolName: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } }
        ]
      })
    };
    
    const pools = await EquipmentPool.find(query)
      .populate('addedBy', 'fullName officerId')
      .sort({ poolName: 1 });
    
    for (const pool of pools) {
      pool.updateCounts();
    }
    
    res.json({
      success: true,
      data: { pools }
    });
    
  } catch (error) {
    console.error('Get pools error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching equipment pools',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route GET /api/equipment/authorized-pools
router.get('/authorized-pools', async (req, res) => {
  try {
    const { category, search } = req.query;
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
    
    const pools = await EquipmentPool.find(query)
      .select('poolName category model totalQuantity availableCount issuedCount items manufacturer location')
      .sort({ poolName: 1 });
    
    for (const pool of pools) {
      pool.updateCounts();
    }
    
    res.json({
      success: true,
      data: { pools, designation }
    });
    
  } catch (error) {
    console.error('Get authorized pools error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching authorized equipment pools'
    });
  }
});

// @route GET /api/equipment/pools/by-designation
router.get('/pools/by-designation', async (req, res) => {
  try {
    const designation = req.query.designation || req.user.designation;
    
    const pools = await EquipmentPool.find({
      authorizedDesignations: designation
    })
    .select('poolName category model totalQuantity availableCount issuedCount items.uniqueId items.status')
    .sort({ poolName: 1 });
    
    for (const pool of pools) {
      pool.updateCounts();
    }
    
    res.json({
      success: true,
      data: { pools, designation }
    });
    
  } catch (error) {
    console.error('Get pools by designation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching equipment pools'
    });
  }
});

// @route POST /api/equipment/pools
router.post('/pools', adminOnly, [
  body('poolName').trim().isLength({ min: 1 }).withMessage('Pool name is required'),
  body('category').isIn([
    'Firearm', 'Ammunition', 'Protective Gear', 'Communication Device',
    'Vehicle', 'Tactical Equipment', 'Less-Lethal Weapon', 'Forensic Equipment',
    'Medical Supplies', 'Office Equipment', 'Other'
  ]).withMessage('Valid category is required'),
  body('model').trim().isLength({ min: 1 }).withMessage('Model is required'),
  body('totalQuantity').isInt({ min: 1 }).withMessage('Total quantity must be at least 1'),
  body('prefix').trim().isLength({ min: 2, max: 5 }).withMessage('Prefix must be 2-5 characters'),
  body('authorizedDesignations').isArray({ min: 1 }).withMessage('At least one authorized designation is required'),
  body('location').trim().isLength({ min: 1 }).withMessage('Location is required')
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
      poolName, category, subCategory, model, manufacturer,
      totalQuantity, prefix, authorizedDesignations, location,
      purchaseDate, totalCost, supplier, notes
    } = req.body;
    
    const pool = new EquipmentPool({
      poolName,
      category,
      subCategory,
      model,
      manufacturer,
      totalQuantity,
      authorizedDesignations,
      location,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      totalCost,
      supplier,
      notes,
      addedBy: req.user._id
    });
    
    for (let i = 0; i < totalQuantity; i++) {
      const num = (i + 1).toString().padStart(3, '0');
      const uniqueId = `${prefix}-${num}`; 
      
      pool.items.push({
        uniqueId,
        status: 'Available',
        condition: 'Excellent',
        location
      });
    }
    
    pool.updateCounts();
    await pool.save();
    
    const populatedPool = await EquipmentPool.findById(pool._id)
      .populate('addedBy', 'fullName officerId');
    
    res.status(201).json({
      success: true,
      message: `Equipment pool created with ${totalQuantity} items`,
      data: { pool: populatedPool }
    });
    
  } catch (error) {
    console.error('Create pool error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating equipment pool'
    });
  }
});

// @route GET /api/equipment/pools/:poolId
router.get('/pools/:poolId', async (req, res) => {
  try {
    const pool = await EquipmentPool.findById(req.params.poolId);
    
    if (!pool) {
      return res.status(404).json({
        success: false,
        message: 'Equipment pool not found'
      });
    }

    await pool.populate([
      { path: 'addedBy', select: 'fullName officerId' },
      { path: 'items.currentlyIssuedTo.userId', select: 'fullName officerId designation' },
      { path: 'items.usageHistory.userId', select: 'fullName officerId designation' },
      { path: 'items.maintenanceHistory.reportedBy', select: 'fullName officerId' },
      { path: 'items.maintenanceHistory.fixedBy', select: 'fullName officerId' }
    ]);
        
    pool.updateCounts();
    
    res.json({
      success: true,
      data: { pool }
    });
    
  } catch (error) {
    console.error('Get pool details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pool details'
    });
  }
});

// @route POST /api/equipment/pools/:poolId/issue
router.post('/pools/:poolId/issue', adminOnly, [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('purpose').optional().trim()
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
    
    const { userId, purpose } = req.body;
    
    const pool = await EquipmentPool.findById(req.params.poolId);
    if (!pool) {
      return res.status(404).json({
        success: false,
        message: 'Equipment pool not found'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const assignedItem = await pool.issueItem(
      user._id,
      user.officerId,
      user.fullName,
      user.designation,
      purpose,
      req.user._id
    );
    
    res.json({
      success: true,
      message: 'Equipment issued successfully',
      data: {
        assignedItem: assignedItem.uniqueId,
        issuedTo: `${user.fullName} (${user.officerId})`,
        issuedDate: assignedItem.currentlyIssuedTo.issuedDate,
        poolAvailableCount: pool.availableCount
      }
    });
    
  } catch (error) {
    console.error('Issue equipment error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Server error issuing equipment'
    });
  }
});

// @route POST /api/equipment/pools/:poolId/return
router.post('/pools/:poolId/return', adminOnly, [
  body('uniqueId').trim().isLength({ min: 1 }).withMessage('Unique ID is required'),
  body('condition').isIn(['Excellent', 'Good', 'Fair', 'Poor']).withMessage('Valid condition is required'),
  body('remarks').optional().trim()
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
    
    const { uniqueId, condition, remarks } = req.body;
    
    const pool = await EquipmentPool.findById(req.params.poolId);
    if (!pool) {
      return res.status(404).json({
        success: false,
        message: 'Equipment pool not found'
      });
    }
    
    const returnedItem = await pool.returnItem(
      uniqueId,
      condition,
      remarks,
      req.user._id
    );
    
    res.json({
      success: true,
      message: 'Equipment returned successfully',
      data: {
        uniqueId: returnedItem.uniqueId,
        daysUsed: returnedItem.usageHistory[returnedItem.usageHistory.length - 1].daysUsed,
        condition: returnedItem.condition,
        poolAvailableCount: pool.availableCount
      }
    });
    
  } catch (error) {
    console.error('Return equipment error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Server error returning equipment'
    });
  }
});

// @route   GET /api/equipment/pools/:poolId/items/:uniqueId/history
router.get('/pools/:poolId/items/:uniqueId/history', auth, async (req, res) => {
  try {
    const { poolId, uniqueId } = req.params;

    const pool = await EquipmentPool.findById(poolId);
    
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Equipment pool not found' });
    }

    await pool.populate([
      { path: 'items.usageHistory.userId', select: 'fullName officerId' },
      { path: 'items.usageHistory.issuedBy', select: 'fullName officerId' },
      { path: 'items.usageHistory.returnedTo', select: 'fullName officerId' },
      { path: 'items.maintenanceHistory.reportedBy', select: 'fullName officerId' },
      { path: 'items.maintenanceHistory.fixedBy', select: 'fullName officerId' }
    ]);

    const item = pool.findItemByUniqueId(uniqueId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in pool' });
    }

    const usageHistory = item.usageHistory.sort((a, b) => new Date(b.issuedDate) - new Date(a.issuedDate));
    const maintenanceHistory = item.maintenanceHistory.sort((a, b) => new Date(b.reportedDate) - new Date(a.reportedDate));

    res.json({
      success: true,
      data: {
        poolName: pool.poolName,
        uniqueId: item.uniqueId,
        currentStatus: item.status,
        currentCondition: item.condition,
        usageHistory: usageHistory,
        maintenanceHistory: maintenanceHistory
      }
    });

  } catch (error) {
    console.error('Get item history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching item history'
    });
  }
});

// @route GET /api/equipment/my-equipment-history
router.get('/my-equipment-history', async (req, res) => {
  try {
    const pools = await EquipmentPool.find({
      'items.usageHistory.officerId': req.user.officerId
    })
    .select('poolName category model items');
    
    const myHistory = pools.map(pool => {
      const myItems = pool.items
        .filter(item => 
          item.usageHistory.some(h => h.officerId === req.user.officerId)
        )
        .map(item => ({
          uniqueId: item.uniqueId,
          currentStatus: item.status,
          myUsage: item.usageHistory.filter(h => h.officerId === req.user.officerId)
        }));
      
      return {
        poolName: pool.poolName,
        category: pool.category,
        model: pool.model,
        itemsUsed: myItems
      };
    }).filter(pool => pool.itemsUsed.length > 0);
    
    res.json({
      success: true,
      data: { history: myHistory }
    });
    
  } catch (error) {
    console.error('Get my equipment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching equipment history'
    });
  }
});

// @route GET /api/equipment/currently-issued
router.get('/currently-issued', adminOnly, async (req, res) => {
  try {
    const pools = await EquipmentPool.find()
      .populate('items.currentlyIssuedTo.userId', 'fullName officerId designation')
      .select('poolName category model items');
    
    const issuedItems = [];
    
    pools.forEach(pool => {
      pool.items.forEach(item => {
        if (item.status === 'Issued' && item.currentlyIssuedTo) {
          issuedItems.push({
            poolName: pool.poolName,
            uniqueId: item.uniqueId,
            category: pool.category,
            model: pool.model,
            issuedTo: item.currentlyIssuedTo
          });
        }
      });
    });
    
    res.json({
      success: true,
      data: { 
        issuedItems,
        total: issuedItems.length
      }
    });
    
  } catch (error) {
    console.error('Get currently issued equipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching issued equipment'
    });
  }
});


// ======== 🟢 1. THIS IS THE NEW ROUTE TO FIX THE BUG 🟢 ========
// @route   GET /api/equipment/maintenance-items
// @desc    Get all items marked as 'Maintenance'
// @access  Private (Admin only)
router.get('/maintenance-items', adminOnly, async (req, res) => {
  try {
    // This aggregation pipeline is the fix.
    // It finds all pools, unwinds the items,
    // matches *only* items in Maintenance,
    // and projects them as a flat array, including their full history.
    const maintenanceItems = await EquipmentPool.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.status': 'Maintenance' } },
      {
        $project: {
          _id: 0,
          poolId: '$_id',
          poolName: '$poolName',
          model: '$model',
          category: '$category',
          
          // Project the *entire* item sub-document
          uniqueId: '$items.uniqueId',
          status: '$items.status',
          condition: '$items.condition',
          location: '$items.location',
          usageHistory: '$items.usageHistory',
          lostHistory: '$items.lostHistory', // <-- This is the key
          maintenanceHistory: '$items.maintenanceHistory'
        }
      },
      {
        $addFields: {
          // Add a sortable date field from the last maintenance log
          lastLogDate: { $max: '$maintenanceHistory.reportedDate' }
        }
      },
      { $sort: { lastLogDate: -1 } }
    ]);

    res.json({
      success: true,
      data: { items: maintenanceItems }
    });

  } catch (error) {
    console.error('Get maintenance items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching maintenance items'
    });
  }
});
// =========================================================


// @route DELETE /api/equipment/pools/:poolId
router.delete('/pools/:poolId', adminOnly, async (req, res) => {
  try {
    const pool = await EquipmentPool.findByIdAndDelete(req.params.poolId);
    
    if (!pool) {
      return res.status(404).json({
        success: false,
        message: 'Equipment pool not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Equipment pool deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete pool error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting equipment pool'
    });
  }
});

// @route   POST /api/equipment/pools/complete-maintenance
router.post('/pools/complete-maintenance', adminOnly, [
  body('poolId').isMongoId(),
  body('uniqueId').notEmpty(),
  body('description').notEmpty().withMessage('Repair action description is required'), 
  body('condition').isIn(['Excellent', 'Good']).withMessage('Final condition must be Excellent or Good'),
  body('cost').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { poolId, uniqueId, description, condition, cost } = req.body;
    
    const pool = await EquipmentPool.findById(poolId);
    if (!pool) {
      return res.status(404).json({ success: false, message: 'Pool not found' });
    }

    const item = pool.findItemByUniqueId(uniqueId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in pool' });
    }
    
    if (item.status !== 'Maintenance') {
      return res.status(400).json({ success: false, message: 'Item is not currently under maintenance' });
    }
    
    item.status = 'Available';
    item.condition = condition;

    let logEntry = item.maintenanceHistory.find(
      (entry) => !entry.fixedBy
    );
    
    if (logEntry) {
      logEntry.fixedDate = new Date();
      logEntry.action = description;
      logEntry.fixedBy = req.user._id;
      logEntry.cost = cost;
    } else {
      item.maintenanceHistory.push({
        reportedDate: new Date(),
        reportedBy: req.user._id,
        reason: 'Repair completed (no initial report found)',
        type: 'Repair',
        fixedDate: new Date(),
        action: description,
        fixedBy: req.user._id,
        cost: cost
      });
    }

    pool.updateCounts();
    await pool.save({ validateBeforeSave: false });

    await Request.findOneAndUpdate(
      { assignedUniqueId: uniqueId, status: 'Approved', requestType: 'Maintenance' },
      { status: 'Completed', completedDate: new Date() }
    );

    res.json({
      success: true,
      message: `Item ${uniqueId} is now Available.`,
      data: { item }
    });

  } catch (error) {
    console.error('Complete maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error completing maintenance'
    });
  }
});


// @route   POST /api/equipment/pools/mark-recovered
router.post('/pools/mark-recovered', adminOnly, [
  body('poolId').isMongoId(),
  body('uniqueId').notEmpty(),
  body('notes').notEmpty().withMessage('Recovery notes are required'),
  body('condition').isIn(['Excellent', 'Good', 'Fair', 'Poor']).withMessage('Valid condition is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { poolId, uniqueId, notes, condition } = req.body;
    
    const pool = await EquipmentPool.findById(poolId);
    if (!pool) return res.status(404).json({ success: false, message: 'Pool not found' });
    
    const item = pool.findItemByUniqueId(uniqueId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    
    if (item.status !== 'Maintenance') {
      return res.status(400).json({ success: false, message: 'Item is not in maintenance (lost) status' });
    }
    
    item.condition = condition;
    if (condition === 'Poor') {
      item.status = 'Maintenance'; // Stays in maintenance if recovered in poor state
    } else {
      item.status = 'Available'; // Becomes available
    }

    let maintLog = item.maintenanceHistory.find(entry => !entry.fixedBy && entry.reason.startsWith("ITEM REPORTED LOST"));
    if (maintLog) {
      maintLog.fixedDate = new Date();
      maintLog.fixedBy = req.user._id;
      maintLog.action = `ITEM RECOVERED. Status: ${item.status}. Notes: ${notes}`;
    }
    
    let lostLog = item.lostHistory.find(entry => entry.status === 'Under Investigation');
    if (lostLog) {
      lostLog.status = 'Closed';
      lostLog.description = (lostLog.description || '') + ` | RECOVERY NOTES: ${notes}`;
    }
    
    pool.updateCounts();
    await pool.save({ validateBeforeSave: false });
    
    res.json({ success: true, message: `Item ${uniqueId} marked as recovered.` });

  } catch (error) {
    console.error('Mark recovered error:', error);
    res.status(500).json({ success: false, message: 'Server error marking item as recovered' });
  }
});


// @route   POST /api/equipment/pools/write-off-lost
// @route   POST /api/equipment/pools/write-off-lost
router.post('/pools/write-off-lost', adminOnly, [
  body('poolId').isMongoId(),
  body('uniqueId').notEmpty(),
  body('notes').notEmpty().withMessage('Final report notes are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { poolId, uniqueId, notes } = req.body;
    
    const pool = await EquipmentPool.findById(poolId);
    if (!pool) return res.status(404).json({ success: false, message: 'Pool not found' });
    
    const item = pool.findItemByUniqueId(uniqueId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    
    // ======== 🟢 LOGIC UPDATED HERE 🟢 ========

    // 1. Check if already written off
    if (item.status === 'Lost') {
      return res.status(400).json({ success: false, message: 'This item has already been written off.' });
    }

    // 2. Find the latest maintenance log
    const lastMaintLog = (item.maintenanceHistory && item.maintenanceHistory.length > 0)
      ? item.maintenanceHistory[item.maintenanceHistory.length - 1]
      : null;

    // 3. Check if it's actually a lost item awaiting write-off
    //    We check the reason and make sure it hasn't already been "fixed" (written off)
    if (!lastMaintLog || !lastMaintLog.reason.startsWith("ITEM REPORTED LOST") || lastMaintLog.fixedBy) {
      return res.status(400).json({ success: false, message: 'Item is not a lost item awaiting write-off.' });
    }
    
    // 4. If checks pass, proceed
    item.status = 'Lost';
    item.condition = 'Out of Service'; 
    
    // 5. Update the maintenance log entry (the one we just checked)
    lastMaintLog.fixedDate = new Date();
    lastMaintLog.fixedBy = req.user._id;
    lastMaintLog.action = `ITEM WRITTEN OFF. Status: Lost. Final Report: ${notes}`;
    
    // 6. Update the corresponding lost history entry
    let lostLog = item.lostHistory.find(entry => entry.status === 'Under Investigation');
    if (lostLog) {
      lostLog.status = 'Closed';
      lostLog.description = (lostLog.description || '') + ` | FINAL REPORT: ${notes}`;
    }
    
    pool.updateCounts();
    await pool.save({ validateBeforeSave: false });
    
    res.json({ success: true, message: `Item ${uniqueId} has been written off as Lost.` });

  } catch (error) {
    console.error('Write-off lost error:', error);
    res.status(500).json({ success: false, message: 'Server error writing off item' });
  }
});


module.exports = router;