
const {
  getInvoicesForBusinessUser,
  getInvoiceForBusinessUser,
  getInvoicesForProvider,
  getInvoiceForProvider,
} = require('../services/invoiceService');

async function listMyInvoices(req, res) {
  try {
    const invoices = await getInvoicesForBusinessUser(req.user.id);

    return res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error('List invoices error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoices',
    });
  }
}

async function getMyInvoice(req, res) {
  try {
    const invoiceId = Number(req.params.id);

    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID',
      });
    }

    const invoice = await getInvoiceForBusinessUser(
      req.user.id,
      invoiceId
    );

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
    console.error('Get invoice error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoice',
    });
  }
}

async function listMyProviderInvoices(req, res) {
  try {
    const invoices = await getInvoicesForProvider(req.user.id);

    return res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error('List provider invoices error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve provider invoices',
    });
  }
}

async function getMyProviderInvoice(req, res) {
  try {
    const invoiceId = Number(req.params.id);

    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID',
      });
    }

    const invoice = await getInvoiceForProvider(
      req.user.id,
      invoiceId
    );

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
    console.error('Get provider invoice error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve provider invoice',
    });
  }
}

module.exports = {
  listMyInvoices,
  getMyInvoice,
  listMyProviderInvoices,
  getMyProviderInvoice,
};
