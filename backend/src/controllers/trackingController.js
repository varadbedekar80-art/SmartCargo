
const {
  trackingMilestones,
  addTrackingUpdate,
  getTrackingHistoryForUser,
  getTrackingHistoryForProvider,
} = require('../services/trackingService');

async function updateTracking(req, res) {
  try {
    const shipmentId = Number(req.params.id);
    const { milestone, remarks } = req.body;

    if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment ID',
      });
    }

    if (typeof milestone !== 'string' || !milestone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A tracking milestone is required',
      });
    }

    if (
      remarks !== undefined &&
      remarks !== null &&
      typeof remarks !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Remarks must be text',
      });
    }

    const cleanedRemarks = remarks?.trim() || null;

    if (cleanedRemarks && cleanedRemarks.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Remarks cannot exceed 1000 characters',
      });
    }

    const result = await addTrackingUpdate(
      req.user.id,
      shipmentId,
      {
        milestone: milestone.trim(),
        remarks: cleanedRemarks,
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Tracking update added successfully',
      tracking: result,
    });
  } catch (error) {
    console.error('Update tracking error:', error.message);

    const errors = {
      SHIPMENT_NOT_FOUND: [
        404,
        'Shipment not found or not assigned to you',
      ],
      SHIPMENT_NOT_TRACKABLE: [
        409,
        'This shipment cannot currently receive tracking updates',
      ],
      INVALID_MILESTONE: [
        400,
        'Invalid milestone for this transport mode',
      ],
      MILESTONE_ALREADY_RECORDED: [
        409,
        'This tracking milestone has already been recorded',
      ],
      MILESTONE_OUT_OF_ORDER: [
        409,
        'Tracking milestones must follow the correct sequence',
      ],
    };

    if (errors[error.message]) {
      const [status, message] = errors[error.message];

      return res.status(status).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update shipment tracking',
    });
  }
}

async function getTrackingHistory(req, res) {
  try {
    const shipmentId = Number(req.params.id);

    if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment ID',
      });
    }

    let history;

    if (req.user.role === 'provider') {
      history = await getTrackingHistoryForProvider(
        req.user.id,
        shipmentId
      );
    } else if (req.user.role === 'business_user') {
      history = await getTrackingHistoryForUser(
        req.user.id,
        shipmentId
      );
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view tracking history',
      });
    }

    if (history === null) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found or not assigned to you',
      });
    }

    return res.status(200).json({
      success: true,
      milestones: trackingMilestones,
      history,
    });
  } catch (error) {
    console.error('Get tracking history error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tracking history',
    });
  }
}

module.exports = {
  updateTracking,
  getTrackingHistory,
};
