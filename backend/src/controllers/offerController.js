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
      departureDate,
    } = req.body;

    // Departure date is required in YYYY-MM-DD format.
    if (
      typeof departureDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid cargo departure date is required',
      });
    }

    const parsedDepartureDate = new Date(
      `${departureDate}T00:00:00.000Z`
    );

    if (
      Number.isNaN(parsedDepartureDate.getTime()) ||
      parsedDepartureDate.toISOString().slice(0, 10) !== departureDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cargo departure date',
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (departureDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cargo departure date cannot be in the past',
      });
    }

    const validOfferTypes = [
      'route_specific',
      'general_capacity',
    ];

    const validModes = ['air', 'sea', 'road'];

    const validCoverages = [
      'global',
      'nationwide',
      'route_specific',
    ];

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

    if (
      offerType === 'route_specific' &&
      coverage !== 'route_specific'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Route-specific offers must use route-specific coverage',
      });
    }

    if (
      offerType === 'general_capacity' &&
      !['global', 'nationwide'].includes(coverage)
    ) {
      return res.status(400).json({
        success: false,
        message: 'General-capacity offers must use global or nationwide coverage',
      });
    }

    // Validate origin and destination for route-specific offers.
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

      if (
        origin.trim().length > 150 ||
        destination.trim().length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: 'Origin and destination cannot exceed 150 characters',
        });
      }

      if (
        origin.trim().toLowerCase() ===
        destination.trim().toLowerCase()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Origin and destination must be different',
        });
      }
    } else if (
      (origin !== undefined && origin !== null && origin !== '') ||
      (destination !== undefined &&
        destination !== null &&
        destination !== '')
    ) {
      return res.status(400).json({
        success: false,
        message: 'General-capacity offers must not specify a particular route',
      });
    }

    // Validate rate per kg.
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

    // Validate maximum weight.
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

    // Validate available space.
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

      origin:
        offerType === 'route_specific'
          ? origin.trim()
          : null,

      destination:
        offerType === 'route_specific'
          ? destination.trim()
          : null,

      coverage,
      ratePerKg: Number(ratePerKg),
      maxWeightKg: Number(maxWeightKg),

      availableSpace:
        availableSpace === undefined
          ? Number(maxWeightKg)
          : Number(availableSpace),

      departureDate,
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
    const { departureDate } = req.query;

    // Validate the optional date filter.
    if (departureDate !== undefined) {
      if (
        typeof departureDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid departure date filter',
        });
      }

      const parsedDate = new Date(
        `${departureDate}T00:00:00.000Z`
      );

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== departureDate
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid departure date filter',
        });
      }
    }

    const offers = await getActiveOffers(departureDate || null);

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
