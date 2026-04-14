import { gql } from "@apollo/client";

export const GET_ME = gql`
  query GetMe {
    me {
      id
      fullName
      email
      role
    }
  }
`;

export const GET_ISSUES = gql`
  query GetIssues {
    issues {
      id
      title
      description
      category
      status
      imageUrl
      latitude
      longitude
      reportedBy {
        id
        fullName
        email
      }
      assignedTo {
        id
        fullName
        email
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ISSUE_STATUS = gql`
  mutation UpdateIssueStatus($issueId: ID!, $status: String!, $assignedTo: ID) {
    updateIssueStatus(issueId: $issueId, status: $status, assignedTo: $assignedTo) {
      id
      title
      status
      assignedTo {
        id
        fullName
        email
      }
      updatedAt
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;