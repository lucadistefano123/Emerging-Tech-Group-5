import { Container, Card, Spinner, Button, Alert } from "react-bootstrap";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_ME } from "../graphql/queries";
import { useState } from "react";

const GET_ISSUES = gql`
  query {
    issues {
      id
      title
      description
      status
      category
      reportedBy {
        fullName
      }
      assignedTo {
        fullName
      }
    }
  }
`;

const UPDATE_STATUS = gql`
  mutation UpdateIssueStatus($issueId: ID!, $status: String!) {
    updateIssueStatus(issueId: $issueId, status: $status) {
      id
      status
    }
  }
`;

function getStatusClass(status) {
  if (status === "open") {
    return "chip-open";
  }

  if (status === "in_progress") {
    return "chip-progress";
  }

  return "chip-resolved";
}

function formatStatus(status) {
  return String(status || "").replace("_", " ");
}

export default function DashboardPage() {
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data, loading, refetch } = useQuery(GET_ISSUES);
  const { data: meData, loading: meLoading } = useQuery(GET_ME, {
    fetchPolicy: "network-only",
    errorPolicy: "ignore"
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_STATUS, {
    onCompleted: async () => {
      setErrorMsg("");
      setMessage("Issue status updated successfully.");
      await refetch();
    },
    onError: (err) => {
      setMessage("");
      setErrorMsg(err.message);
    }
  });

  const user = meData?.me;
  const isStaff = user?.role === "staff";
  const issues = data?.issues || [];

  if (loading || meLoading) {
    return (
      <Container className="app-loader flex-column gap-3 text-center">
        <Spinner animation="border" />
        <div className="app-loader-text">Loading issue dashboard...</div>
      </Container>
    );
  }

  return (
    <div className="app-page">
      <Container fluid="lg" className="app-page-shell py-4 py-lg-5">
        <Card className="app-surface-card border-0 mb-4">
          <Card.Body className="p-4 p-lg-5 d-flex flex-column flex-lg-row justify-content-between gap-4 align-items-lg-center">
            <div>
              <div className="app-eyebrow app-eyebrow-light mb-3">Issue Dashboard</div>
              <h2 className="app-panel-title mb-2">Operational issue queue</h2>
              <p className="app-panel-subtitle mb-0">
                Review incoming reports, watch ownership, and move work forward without leaving the main dashboard.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <span className="app-chip chip-neutral">{issues.length} total issues</span>
              <span className="app-chip chip-neutral">Viewing as {user?.role || "resident"}</span>
            </div>
          </Card.Body>
        </Card>

        {message && <Alert variant="success">{message}</Alert>}
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        {!isStaff && (
          <Alert variant="info">
            You are viewing issues as a resident. Only staff can change issue status.
          </Alert>
        )}

        <div className="d-grid gap-3">
          {issues.map((issue) => (
            <Card key={issue.id} className="app-issue-card border-0">
              <Card.Body className="p-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                  <div>
                    <h5 className="app-text-strong fw-bold mb-2">{issue.title}</h5>
                    <p className="app-muted mb-3">{issue.description}</p>

                    <div className="d-flex flex-wrap gap-2 mb-3">
                      <span className="app-chip chip-neutral">{issue.category || "General"}</span>
                      <span className={`app-chip ${getStatusClass(issue.status)}`}>
                        {formatStatus(issue.status)}
                      </span>
                    </div>

                    <div className="d-flex flex-column gap-1 app-muted">
                      <div><strong className="app-text-strong">Reported by:</strong> {issue.reportedBy?.fullName || "Unknown"}</div>
                      {issue.assignedTo && (
                        <div><strong className="app-text-strong">Assigned to:</strong> {issue.assignedTo.fullName}</div>
                      )}
                    </div>
                  </div>

                  {isStaff && (
                    <div className="d-flex flex-column gap-2 align-self-start" style={{ minWidth: "180px" }}>
                      <Button
                        size="sm"
                        className="app-button-ghost"
                        disabled={updating}
                        onClick={() =>
                          updateStatus({
                            variables: {
                              issueId: issue.id,
                              status: "in_progress"
                            }
                          })
                        }
                      >
                        Mark In Progress
                      </Button>

                      <Button
                        size="sm"
                        className="app-button-primary"
                        disabled={updating}
                        onClick={() =>
                          updateStatus({
                            variables: {
                              issueId: issue.id,
                              status: "resolved"
                            }
                          })
                        }
                      >
                        Resolve Issue
                      </Button>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      </Container>
    </div>
  );
}
