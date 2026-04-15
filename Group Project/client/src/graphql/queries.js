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

export const GET_MY_ISSUES = gql`
  query GetMyIssues {
    myIssues {
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

export const GET_ANALYTICS = gql`
  query GetAnalytics {
    analytics {
      totalIssues
      openIssues
      inProgressIssues
      resolvedIssues
      statusCounts {
        label
        value
      }
      categoryCounts {
        label
        value
      }
      dailyTrend {
        label
        value
      }
      hotspots {
        id
        title
        category
        status
        latitude
        longitude
      }
    }
  }
`;

export const GET_NOTIFICATIONS = gql`
  query GetNotifications {
    notifications {
      id
      type
      message
      read
      createdAt
    }
  }
`;

export const GET_UNREAD_NOTIFICATIONS = gql`
  query GetUnreadNotifications {
    unreadNotifications {
      id
      type
      message
      read
      createdAt
    }
  }
`;

export const GET_STAFF_USERS = gql`
  query GetStaffUsers {
    staffUsers {
      id
      fullName
      email
    }
  }
`;

export const REGISTER = gql`
  mutation Register($fullName: String!, $email: String!, $password: String!, $role: String) {
    register(fullName: $fullName, email: $email, password: $password, role: $role) {
      message
      user {
        id
        fullName
        email
        role
      }
      token
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      message
      user {
        id
        fullName
        email
        role
      }
      token
    }
  }
`;

export const CREATE_ISSUE = gql`
  mutation CreateIssue(
    $title: String!
    $description: String!
    $category: String
    $imageUrl: String
    $latitude: Float!
    $longitude: Float!
  ) {
    createIssue(
      title: $title
      description: $description
      category: $category
      imageUrl: $imageUrl
      latitude: $latitude
      longitude: $longitude
    ) {
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
      createdAt
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

export const CHATBOT_QUERY = gql`
  query Chatbot($message: String!) {
    chatbot(message: $message) {
      reply
      aiEnabled
      analytics {
        totalIssues
        statusCounts {
          label
          value
        }
        categoryCounts {
          label
          value
        }
        dailyTrend {
          label
          value
        }
        hotspots {
          id
          title
          category
          status
          latitude
          longitude
        }
      }
    }
  }
`;

export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkRead($notificationId: ID!) {
    markNotificationAsRead(notificationId: $notificationId) {
      id
      read
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;