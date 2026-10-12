

const {
  getBusinessProfile,
  updateBusinessProfile,
} = require('../services/businessProfileService');

async function getProfile(req, res) {
  try {
    const profile = await getBusinessProfile(req.user.id);

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    if (error.message === 'PROFILE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found.',
      });
    }

    console.error('Get business profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch business profile.',
    });
  }
}

async function updateProfile(req, res) {
  try {
    const {
      fullName,
      email,
      company,
      phone,
      businessType,
      registrationNumber,
      address,
      city,
      country,
    } = req.body;

    if (
      typeof fullName !== 'string' ||
      !fullName.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof company !== 'string' ||
      !company.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and company name are required.',
      });
    }

    if (fullName.trim().length > 100 || email.trim().length > 254) {
      return res.status(400).json({
        success: false,
        message: 'Name or email exceeds the allowed length.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    const optionalFields = {
      phone,
      businessType,
      registrationNumber,
      address,
      city,
      country,
    };

    for (const [field, value] of Object.entries(optionalFields)) {
      if (value !== undefined && typeof value !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Invalid value for ${field}.`,
        });
      }
    }

    const profile = await updateBusinessProfile(req.user.id, {
      fullName,
      email,
      company,
      phone: phone || '',
      businessType: businessType || '',
      registrationNumber: registrationNumber || '',
      address: address || '',
      city: city || '',
      country: country || 'India',
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      profile,
    });
  } catch (error) {
    if (error.message === 'PROFILE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found.',
      });
    }

    if (error.message === 'EMAIL_EXISTS') {
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered.',
      });
    }

    console.error('Update business profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update business profile.',
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
