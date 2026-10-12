
const {
  createCargo,
  getCargoByUser,
  updateCargo,
  deleteCargo,
} = require('../services/cargoService');

function validateCargoFields({
  name,
  description,
  weightKg,
  quantity,
}) {
  if (typeof name !== 'string' || !name.trim()) {
    return 'Cargo name is required';
  }

  if (name.trim().length > 150) {
    return 'Cargo name cannot exceed 150 characters';
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== 'string'
  ) {
    return 'Description must be text';
  }

  if (typeof description === 'string' && description.length > 1000) {
    return 'Description cannot exceed 1000 characters';
  }

  if (
    weightKg === undefined ||
    weightKg === null ||
    weightKg === '' ||
    !Number.isFinite(Number(weightKg)) ||
    Number(weightKg) <= 0
  ) {
    return 'Weight must be a positive number';
  }

  if (
    quantity === undefined ||
    quantity === null ||
    quantity === '' ||
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 1
  ) {
    return 'Quantity must be a positive whole number';
  }

  return null;
}

async function addCargo(req, res) {
  try {
    const {
      name,
      description,
      weightKg,
      quantity = 1,
    } = req.body;

    const validationError = validateCargoFields({
      name,
      description,
      weightKg,
      quantity,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const cargo = await createCargo(req.user.id, {
      name: name.trim(),
      description: description?.trim() || null,
      weightKg: Number(weightKg),
      quantity: Number(quantity),
    });

    return res.status(201).json({
      success: true,
      message: 'Cargo created successfully',
      cargo,
    });
  } catch (error) {
    console.error('Create cargo error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to create cargo',
    });
  }
}

async function listCargo(req, res) {
  try {
    const cargo = await getCargoByUser(req.user.id);

    return res.status(200).json({
      success: true,
      cargo,
    });
  } catch (error) {
    console.error('List cargo error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cargo',
    });
  }
}

async function editCargo(req, res) {
  try {
    const {
      name,
      description,
      weightKg,
      quantity,
    } = req.body;

    const cargoId = Number(req.params.id);

    if (!Number.isInteger(cargoId) || cargoId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cargo ID',
      });
    }

    const validationError = validateCargoFields({
      name,
      description,
      weightKg,
      quantity,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const result = await updateCargo(req.user.id, cargoId, {
      name: name.trim(),
      description: description?.trim() || null,
      weightKg: Number(weightKg),
      quantity: Number(quantity),
    });

    if (!result.updated) {
      return res.status(409).json({
        success: false,
        message:
          'Cargo not found, not owned by you, or already used in a shipment',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cargo updated successfully',
      cargo: result.cargo,
    });
  } catch (error) {
    console.error('Update cargo error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to update cargo',
    });
  }
}

async function removeCargo(req, res) {
  try {
    const cargoId = Number(req.params.id);

    if (!Number.isInteger(cargoId) || cargoId < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cargo ID',
      });
    }

    const deleted = await deleteCargo(req.user.id, cargoId);

    if (!deleted) {
      return res.status(409).json({
        success: false,
        message:
          'Cargo not found, not owned by you, or already used in a shipment',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cargo deleted successfully',
    });
  } catch (error) {
    console.error('Delete cargo error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete cargo',
    });
  }
}

module.exports = {
  addCargo,
  listCargo,
  editCargo,
  removeCargo,
};