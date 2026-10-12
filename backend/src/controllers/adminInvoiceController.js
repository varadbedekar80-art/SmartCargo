const {
  getAllInvoices,
  getInvoiceById,
} = require('../services/adminInvoiceService');

async function listInvoices(req, res) {
  try {
    const invoices = await getAllInvoices();

    return res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error('Admin list invoices error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoices',
    });
  }
}

async function getInvoiceDetails(req, res) {
  try {
    const invoiceId = Number(req.params.id);

    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID',
      });
    }

    const invoice = await getInvoiceById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error('Admin invoice details error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoice details',
    });
  }
}

module.exports = {
  listInvoices,
  getInvoiceDetails,
};