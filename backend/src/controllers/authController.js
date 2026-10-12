const { registerUser, loginUser } = require('../services/authService');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function register(req, res) {
  try {
    const {
      name,
      email,
      password,
      role,
      companyName,
      phone,
      address,
    } = req.body;

    // Validate required fields.
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password ||
      typeof role !== 'string' ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required',
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot exceed 100 characters',
      });
    }

    // Validate email.
    if (
      cleanEmail.length > 254 ||
      !isValidEmail(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Validate password.
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain between 8 and 128 characters',
      });
    }

    // Public registration must never create administrator accounts.
    if (!['business_user', 'provider'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration role',
      });
    }

    // Validate provider company name.
    let cleanCompanyName;

    if (role === 'provider') {
      if (
        typeof companyName !== 'string' ||
        !companyName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Company name is required for providers',
        });
      }

      cleanCompanyName = companyName.trim();

      if (cleanCompanyName.length > 150) {
        return res.status(400).json({
          success: false,
          message: 'Company name cannot exceed 150 characters',
        });
      }
    }

    // Validate optional phone.
    if (
      phone !== undefined &&
      phone !== null &&
      (
        typeof phone !== 'string' ||
        phone.trim().length > 20
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Phone must be text and cannot exceed 20 characters',
      });
    }

    // Validate optional address.
    if (
      address !== undefined &&
      address !== null &&
      (
        typeof address !== 'string' ||
        address.trim().length > 255
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Address must be text and cannot exceed 255 characters',
      });
    }

    // Create the account.
    const result = await registerUser({
      name: cleanName,
      email: cleanEmail,
      password,
      role,
      companyName: cleanCompanyName,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      ...result,
    });
  } catch (error) {
    if (
      error.message === 'EMAIL_EXISTS' ||
      error.code === 'ER_DUP_ENTRY'
    ) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    console.error('Registration error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Registration failed due to a server error',
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate required login fields.
    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (
      cleanEmail.length > 254 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password format',
      });
    }

    // Authenticate the user.
    const result = await loginUser({
      email: cleanEmail,
      password,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.error('Login error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Login failed due to a server error',
    });
  }
}

module.exports = {
  register,
  login,
};