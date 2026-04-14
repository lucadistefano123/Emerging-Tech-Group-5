export const formatError = (formattedError, error) => {
  return {
    message: formattedError.message,
    code: error.extensions?.code || "INTERNAL_SERVER_ERROR"
  };
};