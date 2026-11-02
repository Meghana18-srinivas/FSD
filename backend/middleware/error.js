
export const notFound = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Server error";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  if (err.code === 11000) {
    status = 409;
    message =
      "That value already exists: " +
      Object.keys(err.keyValue || {}).join(", ");
  }

  if (err.name === "CastError") {
    status = 400;
    message = "Invalid id";
  }

  res.status(status).json({ message });
};
