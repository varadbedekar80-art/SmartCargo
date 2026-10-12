const {
  getAllUsers,
  getUserById,
} = require('../services/adminUserService');

async function listUsers(req, res) {
  try {
    const users = await getAllUsers();

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('List users error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
    });
  }
}

async function getUserDetails(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user details error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details',
    });
  }
}

module.exports = {
  listUsers,
  getUserDetails,
};