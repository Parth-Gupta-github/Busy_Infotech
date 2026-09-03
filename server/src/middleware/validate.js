// API Boundary Input Validation Middleware

function validateOrderCreation(req, res, next) {
  const { table_number, items } = req.body;

  if (!table_number || typeof table_number !== 'string' || table_number.trim() === '') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Table number is required and must be a valid text string.'
      }
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'An order must contain at least 1 dish item before placing.'
      }
    });
  }

  for (const item of items) {
    if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity <= 0)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Item quantity must be a positive integer greater than 0.'
        }
      });
    }
  }

  next();
}

function validateLineVoid(req, res, next) {
  const { void_reason, void_quantity } = req.body;

  if (!void_reason || typeof void_reason !== 'string' || void_reason.trim() === '') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Void reason is mandatory and cannot be empty.'
      }
    });
  }

  if (void_quantity !== undefined && (typeof void_quantity !== 'number' || void_quantity <= 0)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Void quantity must be a positive integer greater than 0.'
      }
    });
  }

  next();
}

module.exports = {
  validateOrderCreation,
  validateLineVoid
};
