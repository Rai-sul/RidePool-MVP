import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export const successResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

export const createdResponse = <T>(
  res: Response,
  data: T,
  message?: string
): Response => {
  return successResponse(res, data, message, 201);
};

export const errorResponse = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>
): Response => {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

export const notFoundResponse = (
  res: Response,
  resource: string = 'Resource'
): Response => {
  return errorResponse(res, 'NOT_FOUND', `${resource} not found`, 404);
};

export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized'
): Response => {
  return errorResponse(res, 'UNAUTHORIZED', message, 401);
};

export const forbiddenResponse = (
  res: Response,
  message: string = 'Access denied'
): Response => {
  return errorResponse(res, 'FORBIDDEN', message, 403);
};

export const validationErrorResponse = (
  res: Response,
  message: string,
  details?: Record<string, unknown>
): Response => {
  return errorResponse(res, 'VALIDATION_ERROR', message, 400, details);
};

export const conflictResponse = (
  res: Response,
  message: string
): Response => {
  return errorResponse(res, 'CONFLICT', message, 409);
};

export const internalErrorResponse = (
  res: Response,
  message: string = 'Internal server error'
): Response => {
  return errorResponse(res, 'INTERNAL_ERROR', message, 500);
};

export const tooManyRequestsResponse = (
  res: Response,
  message: string = 'Too many requests'
): Response => {
  return errorResponse(res, 'RATE_LIMIT_EXCEEDED', message, 429);
};

export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore?: boolean;
  },
  message?: string
): Response => {
  const response = {
    success: true as const,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasMore: pagination.hasMore ?? pagination.page * pagination.limit < pagination.total,
    },
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
  return res.status(200).json(response);
};
