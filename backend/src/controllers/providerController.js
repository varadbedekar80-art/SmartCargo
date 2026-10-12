
const providerService = require('../services/providerService');

const transportOptions = ['Road', 'Sea', 'Air', 'Rail'];

async function getMyProfile(req, res) {
  try {
    if (!req.user?.id || req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only authenticated logistics providers can access this profile.',
      });
    }

    const profile = await providerService.getProviderProfile(req.user.id);

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Get provider profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load provider profile.',
    });
  }
}

async function updateMyProfile(req, res) {
  try {
    if (!req.user?.id || req.user.role !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only authenticated logistics providers can update this profile.',
      });
    }

    const {
      companyName,
      contactName,
      email,
      phone,
      registrationNumber,
      address,
      transportModes,
      serviceRegions,
      description,
    } = req.body;

    const textFields = {
      companyName: { value: companyName, max: 150, required: true },
      contactName: { value: contactName, max: 100, required: true },
      email: { value: email, max: 150, required: true },
      phone: { value: phone, max: 20, required: true },
      registrationNumber: {
        value: registrationNumber,
        max: 100,
        required: false,
      },
      address: { value: address, max: 255, required: true },
      serviceRegions: { value: serviceRegions, max: 300, required: true },
      description: { value: description, max: 1000, required: true },
    };

    const cleanProfile = {};

    for (const [field, rules] of Object.entries(textFields)) {
      const value = rules.value;

      if (value == null && !rules.required) {
        cleanProfile[field] = '';
        continue;
      }

      if (typeof value !== 'string') {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string.`,
        });
      }

      const cleaned = value.trim();

      if (rules.required && !cleaned) {
        return res.status(400).json({
          success: false,
          message: `${field} is required.`,
        });
      }

      if (cleaned.length > rules.max) {
        return res.status(400).json({
          success: false,
          message: `${field} cannot exceed ${rules.max} characters.`,
        });
      }

      cleanProfile[field] = cleaned;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanProfile.email)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid business email address.',
      });
    }

    if (
      !Array.isArray(transportModes) ||
      transportModes.length === 0 ||
      transportModes.some(
        (mode) => !transportOptions.includes(mode)
      ) ||
      new Set(transportModes).size !== transportModes.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one valid transport mode.',
      });
    }

    const profile = await providerService.saveProviderProfile(
      req.user.id,
      {
        ...cleanProfile,
        transportModes,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Provider profile updated successfully.',
      profile,
    });
  } catch (error) {
    console.error('Update provider profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update provider profile.',
    });
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
};
