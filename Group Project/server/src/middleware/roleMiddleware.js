export const requireRole = (user, allowedRoles = []) => {
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Access denied");
  }

  return true;
};