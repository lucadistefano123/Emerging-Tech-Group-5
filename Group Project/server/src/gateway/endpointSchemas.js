
export const endpointSchemas = {
  auth: {
    register: {
      body: {
        fullName: { type: "string", required: true },
        email: { type: "string", required: true },
        password: { type: "string", required: true },
        role: { type: "string", required: false }
      }
    },
    login: {
      body: {
        email: { type: "string", required: true },
        password: { type: "string", required: true }
      }
    }
  },
  issue: {
    create: {
      body: {
        title: { type: "string", required: true },
        description: { type: "string", required: true },
        category: { type: "string", required: false },
        latitude: { type: "number", required: true },
        longitude: { type: "number", required: true },
        imageUrl: { type: "string", required: false }
      }
    },
    update: {
      body: {
        issueId: { type: "string", required: true },
        status: { type: "string", required: true },
        assignedTo: { type: "string", required: false }
      }
    }
  },
  chatbot: {
    query: {
      body: {
        message: { type: "string", required: true }
      }
    }
  }
};

export const validateGraphQLQuery = (req, res, next) => {
  const { operationName, query } = req.body || {};

  const suspiciousPatterns = [
    /__typename/i,
    /fragment\s+\w+\s+on\s+__/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(query)) {
      console.warn(`[SECURITY] Suspicious GraphQL query from ${req.ip}:`, query.substring(0, 100));
    }
  }

  next();
};

export const validateIssueInput = (req, res, next) => {
  const { title, description, latitude, longitude } = req.body;

  if (title && title.length > 500) {
    return res.status(400).json({
      error: "Validation error",
      message: "Issue title must be less than 500 characters",
      requestId: req.id
    });
  }

  if (description && description.length > 5000) {
    return res.status(400).json({
      error: "Validation error",
      message: "Issue description must be less than 5000 characters",
      requestId: req.id
    });
  }

  if (latitude !== undefined && longitude !== undefined) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        error: "Validation error",
        message: "Latitude must be between -90 and 90",
        requestId: req.id
      });
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: "Validation error",
        message: "Longitude must be between -180 and 180",
        requestId: req.id
      });
    }
  }

  next();
};

export default {
  endpointSchemas,
  validateGraphQLQuery,
  validateIssueInput
};
