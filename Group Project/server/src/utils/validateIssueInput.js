export const validateIssueInput = ({ title, description, latitude, longitude }) => {
  if (!title || title.trim().length < 3) {
    throw new Error("Title must be at least 3 characters long");
  }

  if (!description || description.trim().length < 10) {
    throw new Error("Description must be at least 10 characters long");
  }

  if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be a valid number between -90 and 90");
  }

  if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be a valid number between -180 and 180");
  }
};