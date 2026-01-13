/**
 * Standardized API Response Helpers
 */

// Success response
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// Created response
export const createdResponse = (res, data, message = 'Created successfully') => {
  return successResponse(res, data, message, 201);
};

// No content response
export const noContentResponse = (res) => {
  return res.status(204).send();
};

// Paginated response
export const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrevPage: pagination.page > 1,
    },
  });
};

// Error response
export const errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Bad request response
export const badRequestResponse = (res, message = 'Bad request', errors = null) => {
  return errorResponse(res, message, 400, errors);
};

// Unauthorized response
export const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return errorResponse(res, message, 401);
};

// Forbidden response
export const forbiddenResponse = (res, message = 'Forbidden') => {
  return errorResponse(res, message, 403);
};

// Not found response
export const notFoundResponse = (res, message = 'Resource not found') => {
  return errorResponse(res, message, 404);
};

// Conflict response
export const conflictResponse = (res, message = 'Resource already exists') => {
  return errorResponse(res, message, 409);
};

// Validation error response
export const validationErrorResponse = (res, errors) => {
  return errorResponse(res, 'Validation failed', 422, errors);
};

// Too many requests response
export const tooManyRequestsResponse = (res, message = 'Too many requests') => {
  return errorResponse(res, message, 429);
};

// Server error response
export const serverErrorResponse = (res, message = 'Internal server error') => {
  return errorResponse(res, message, 500);
};
