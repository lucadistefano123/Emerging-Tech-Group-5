import { Container, Card, Badge, Spinner, Button, Alert } from "react-bootstrap";
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

  if (loading || meLoading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4 fw-bold text-dark">Issue Dashboard</h2>

      {message && <Alert variant="success">{message}</Alert>}
      {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

      {!isStaff && (
        <Alert variant="info">
          You are viewing issues as a resident. Only staff can change issue status.
        </Alert>
      )}

      {data?.issues?.map((issue) => (
        <Card key={issue.id} className="mb-3 shadow-sm p-3 border-0">
          <h5 className="fw-bold text-dark">{issue.title}</h5>

          <p className="text-secondary mb-2">{issue.description}</p>

          <div className="d-flex flex-wrap gap-2 mb-2">
            <Badge bg="dark">{issue.category || "General"}</Badge>

            <Badge
              bg={
                issue.status === "open"
                  ? "danger"
                  : issue.status === "in_progress"
                  ? "warning"
                  : "success"
              }
              text={issue.status === "in_progress" ? "dark" : undefined}
            >
              {issue.status}
            </Badge>
          </div>

          <p className="mb-2 text-dark">
            <strong>Reported by:</strong> {issue.reportedBy?.fullName}
          </p>

          {issue.assignedTo && (
            <p className="mb-2 text-dark">
              <strong>Assigned to:</strong> {issue.assignedTo.fullName}
            </p>
          )}

          {isStaff && (
            <div className="d-flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline-warning"
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
                In Progress
              </Button>

              <Button
                size="sm"
                variant="outline-success"
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
                Resolve
              </Button>
            </div>
          )}
        </Card>
      ))}
    </Container>
  );
}