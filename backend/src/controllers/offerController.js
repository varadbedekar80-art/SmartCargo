const {
  createOffer,
  getOffersByProvider,
  getActiveOffers,
  updateOfferStatus,
} = require('../services/offerService');

async function addOffer(req, res) {
  try {
    const {
      offerType,
      mode,
      origin,
      destination,
      coverage,
      ratePerKg,
      maxWeightKg,
      availableSpace,
    } = req.body;

    const validOfferTypes = ['route_specific', 'general_capacity'];
    const validModes = ['air', 'sea', 'road'];
    const validCoverages = ['global', 'nationwide', 'route_specific'];

    // Validate offer type, transport mode, and coverage.
    if (
      !validOfferTypes.includes(offerType) ||
      !validModes.includes(mode) ||
      !validCoverages.includes(coverage)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer type, transport mode, or coverage',
      });
    }

    // Route-specific offers must use route-specific coverage.
    if (
      offerType === 'route_specific' &&
      coverage !== 'route_specific'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Route-specific offers must use route-specific coverage',
      });
    }

    // General-capacity offers must use global or nationwide coverage.
    if (
      offerType === 'general_capacity' &&
      !['global', 'nationwide'].includes(coverage)
    ) {
      return res.status(400).json({
        success: false,
        message: 'General-capacity offers must use global or nationwide coverage',
      });
    }

    // Validate route fields and their lengths.
    if (offerType === 'route_specific') {
      if (
        typeof origin !== 'string' ||
        !origin.trim() ||
        typeof destination !== 'string' ||
        !destination.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Origin and destination are required for route-specific offers',
        });
      }

      if (origin.trim().length > 150 || destination.trim().length > 150) {
        return res.status(400).json({
          success: false,
          message: 'Origin and destination cannot exceed 150 characters',
        });
      }

      if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Origin and destination must be different',
        });
      }
    } else if (
      (origin !== undefined && origin !== null && origin !== '') ||
      (destination !== undefined && destination !== null && destination !== '')
    ) {
      return res.status(400).json({
        success: false,
        message: 'General-capacity offers must not specify a particular route',
      });
    }

    // Reject missing, blank, non-numeric, or invalid numeric values.
    if (
      ratePerKg === undefined ||
      ratePerKg === null ||
      ratePerKg === '' ||
      !Number.isFinite(Number(ratePerKg)) ||
      Number(ratePerKg) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Rate per kg must be a positive number',
      });
    }

    if (
      maxWeightKg === undefined ||
      maxWeightKg === null ||
      maxWeightKg === '' ||
      !Number.isFinite(Number(maxWeightKg)) ||
      Number(maxWeightKg) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Maximum weight must be a positive number',
      });
    }

    if (
      availableSpace !== undefined &&
      (
        availableSpace === null ||
        availableSpace === '' ||
        !Number.isFinite(Number(availableSpace)) ||
        Number(availableSpace) < 0 ||
        Number(availableSpace) > Number(maxWeightKg)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Available space must be between zero and maximum weight',
      });
    }

    const offer = await createOffer(req.user.id, {
      offerType,
      mode,
      origin: offerType === 'route_specific' ? origin.trim() : null,
      destination:
        offerType === 'route_specific' ? destination.trim() : null,
      coverage,
      ratePerKg: Number(ratePerKg),
      maxWeightKg: Number(maxWeightKg),
      availableSpace:
        availableSpace === undefined
          ? Number(maxWeightKg)
          : Number(availableSpace),
    });

    return res.status(201).json({
      success: true,
      message: 'Shipping offer created successfully',
      offer,
    });
  } catch (error) {
    console.error('Create offer error:', error.message);

    if (error.message === 'PROVIDER_PROFILE_NOT_FOUND') {
      return res.status(400).json({
        success: false,
        message: 'Provider profile not found',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create shipping offer',
    });
  }
}

async function listMyOffers(req, res) {
  try {
    const offers = await getOffersByProvider(req.user.id);

    return res.status(200).json({
      success: true,
      offers,
    });
  } catch (error) {
    console.error('List provider offers error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your shipping offers',
    });
  }
}

async function listActiveOffers(req, res) {
  try {
    const offers = await getActiveOffers();

    return res.status(200).json({
      success: true,
      offers,
    });
  } catch (error) {
    console.error('List active offers error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipping offers',
    });
  }
}

async function changeOfferStatus(req, res) {
  try {
    const offerId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(offerId) || offerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipping offer ID',
      });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be active or inactive',
      });
    }

    const updated = await updateOfferStatus(
      req.user.id,
      offerId,
      status
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Shipping offer not found or not owned by you',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Shipping offer status updated successfully',
    });
  } catch (error) {
    console.error('Update offer status error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to update shipping offer status',
    });
  }
}

module.exports = {
  addOffer,
  listMyOffers,
  listActiveOffers,
  changeOfferStatus,
};