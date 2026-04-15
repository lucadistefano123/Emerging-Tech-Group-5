import { gql } from "graphql-tag";

const typeDefs = gql`
  type User {
    id: ID!
    fullName: String!
    email: String!
    role: String!
    createdAt: String
    updatedAt: String
  }

  type Issue {
    id: ID!
    title: String!
    description: String!
    category: String
    status: String!
    imageUrl: String
    latitude: Float!
    longitude: Float!
    reportedBy: User!
    assignedTo: User
    createdAt: String
    updatedAt: String
  }

  type AuthPayload {
    message: String!
    user: User
    token: String
  }

  type ChartDatum {
    label: String!
    value: Int!
  }

  type MapPoint {
    id: ID!
    title: String!
    category: String!
    status: String!
    latitude: Float!
    longitude: Float!
  }

  type TrendCluster {
    label: String!
    count: Int!
    exampleIssue: String
  }

  type ChatbotAnalytics {
    totalIssues: Int!
    statusCounts: [ChartDatum!]!
    categoryCounts: [ChartDatum!]!
    dailyTrend: [ChartDatum!]!
    hotspots: [MapPoint!]!
    trendClusters: [TrendCluster!]!
  }

  type ChatbotResponse {
    reply: String!
    aiEnabled: Boolean!
    analytics: ChatbotAnalytics!
  }

  type Notification {
    id: ID!
    userId: ID!
    issueId: ID!
    type: String!
    message: String!
    read: Boolean!
    createdAt: String
  }

  type Analytics {
    totalIssues: Int!
    openIssues: Int!
    inProgressIssues: Int!
    resolvedIssues: Int!
    statusCounts: [ChartDatum!]!
    categoryCounts: [ChartDatum!]!
    dailyTrend: [ChartDatum!]!
    hotspots: [MapPoint!]!
    trendClusters: [TrendCluster!]!
  }

  type Query {
    hello: String
    me: User
    issues: [Issue!]!
    myIssues: [Issue!]!
    staffUsers: [User!]!
    analytics: Analytics!
    notifications: [Notification!]!
    unreadNotifications: [Notification!]!
  }

  type Mutation {
    register(fullName: String!, email: String!, password: String!, role: String): AuthPayload
    login(email: String!, password: String!): AuthPayload
    logout: String

    createIssue(
      title: String!
      description: String!
      category: String
      imageUrl: String
      latitude: Float!
      longitude: Float!
    ): Issue!

    updateIssueStatus(
      issueId: ID!
      status: String!
      assignedTo: ID
    ): Issue!

    markNotificationAsRead(notificationId: ID!): Notification!

    chatbot(message: String!): ChatbotResponse!
  }
`;

export default typeDefs;
