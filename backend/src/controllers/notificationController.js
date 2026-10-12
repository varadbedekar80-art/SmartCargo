const {
  getNotificationsForUser,
  markNotificationAsRead,
} = require('../services/notificationService');

async function listMyNotifications(req, res) {
  try {
    const notifications = await getNotificationsForUser(req.user.id);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('List notifications error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
    });
  }
}

async function markMyNotificationAsRead(req, res) {
  try {
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID',
      });
    }

    const updated = await markNotificationAsRead(
      req.user.id,
      notificationId
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification as read error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to update notification',
    });
  }
}

module.exports = {
  listMyNotifications,
  markMyNotificationAsRead,
};
