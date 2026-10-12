const {
  getAllOffers,
  getOfferById,
} = require('../services/adminOfferService');

async function listOffers(req, res) {
  try {
    const offers = await getAllOffers();

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error('Admin list offers error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipping offers',
    });
  }
}

async function getOfferDetails(req, res) {
  try {
    const offerId = Number(req.params.id);

    if (!Number.isInteger(offerId) || offerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipping offer ID',
      });
    }

    const offer = await getOfferById(offerId);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Shipping offer not found',
      });
    }

    return res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error('Admin offer details error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipping offer details',
    });
  }
}

module.exports = {
  listOffers,
  getOfferDetails,
};