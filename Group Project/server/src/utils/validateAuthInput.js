export const validateRegisterInput = ({ fullName, email, password }) => {
  if (!fullName || fullName.trim().length < 2) {
    throw new Error("Full name must be at least 2 characters long");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error("Please enter a valid email address");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }
};

export const validateLoginInput = ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }
};