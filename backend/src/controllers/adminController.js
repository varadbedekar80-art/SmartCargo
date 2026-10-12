const {
  getDashboardSummary,
} = require('../services/adminService');

async function getAdminDashboard(req, res) {
  try {
    const summary = await getDashboardSummary();

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin dashboard data',
    });
  }
}

module.exports = {
  getAdminDashboard,
};