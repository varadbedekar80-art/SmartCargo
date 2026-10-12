const {
  getAllCargo,
  getCargoById,
} = require('../services/adminCargoService');

async function listCargo(req, res) {
  try {
    const cargoItems = await getAllCargo();

    return res.status(200).json({
      success: true,
      count: cargoItems.length,
      cargo: cargoItems,
    });
  } catch (error) {
    console.error('Admin list cargo error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cargo records',
    });
  }
}

async function getCargoDetails(req, res) {
  try {
    const cargoId = Number(req.params.id);

    if (!Number.isInteger(cargoId) || cargoId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cargo ID',
      });
    }

    const cargo = await getCargoById(cargoId);

    if (!cargo) {
      return res.status(404).json({
        success: false,
        message: 'Cargo record not found',
      });
    }

    return res.status(200).json({
      success: true,
      cargo,
    });
  } catch (error) {
    console.error('Admin cargo details error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cargo details',
    });
  }
}

module.exports = {
  listCargo,
  getCargoDetails,
};