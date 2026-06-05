export const sendSuccess = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

export const sendCreated = (res, data, message = 'Created') =>
  sendSuccess(res, data, message, 201);

export const sendPaginated = (res, data, pagination) =>
  res.status(200).json({ success: true, data, pagination });