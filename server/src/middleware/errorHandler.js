// Centralized Express Error Handling Middleware

function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  
  let errorCode = err.code;
  if (!errorCode) {
    if (statusCode === 400) errorCode = 'VALIDATION_ERROR';
    else if (statusCode === 401) errorCode = 'UNAUTHORIZED';
    else if (statusCode === 403) errorCode = 'FORBIDDEN';
    else if (statusCode === 404) errorCode = 'NOT_FOUND';
    else if (statusCode === 409) errorCode = 'CONFLICT';
    else errorCode = 'INTERNAL_SERVER_ERROR';
  }

  // Log detailed error stack on the server side ONLY (not exposed to client)
  if (statusCode >= 500) {
    console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err.stack || err);
  }

  // Return clean, sanitized error JSON response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: err.message || 'An unexpected internal server error occurred.'
    }
  });
}

module.exports = errorHandler;
