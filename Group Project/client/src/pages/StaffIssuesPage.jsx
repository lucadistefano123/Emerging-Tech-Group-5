import { useState } from "react";
import { Container, Card, Table, Badge, Button, Alert, Form, Modal, Spinner } from "react-bootstrap";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_ISSUES, UPDATE_ISSUE_STATUS } from "../graphql/queries";

const statusColors = {
  open: "danger",
  in_progress: "warning",
  resolved: "success"
};

const statusLabels = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved"
};

export default function StaffIssuesPage() {
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { data, loading, refetch } = useQuery(GET_ISSUES, {
    fetchPolicy: "network-only"
  });

  const [updateIssueStatus, { loading: updating }] = useMutation(UPDATE_ISSUE_STATUS, {
    onCompleted: () => {
      setSuccessMsg("Issue status updated successfully!");
      setShowModal(false);
      setSelectedIssue(null);
      setNewStatus("");
      setAssignedTo("");
      refetch();
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err) => {
      setErrorMsg(err.message);
    }
  });

  const handleUpdateClick = (issue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setAssignedTo(issue.assignedTo?.id || "");
    setShowModal(true);
    setErrorMsg("");
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    updateIssueStatus({
      variables: {
        issueId: selectedIssue.id,
        status: newStatus,
        assignedTo: assignedTo || null
      }
    });
  };

  const formatDate = (dateString) => {
    return new Date(parseInt(dateString)).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" size="lg" />
        <p className="mt-3">Loading issues...</p>
      </Container>
    );
  }

  const issues = data?.issues || [];

  return (
    <Container className="py-4">
      <Card className="shadow-lg">
        <Card.Header className="bg-primary text-white">
          <h3 className="mb-0">Issue Management</h3>
          <p className="mb-0 mt-1 opacity-75">Manage and update issue statuses</p>
        </Card.Header>

        <Card.Body className="p-0">
          {successMsg && (
            <Alert variant="success" className="m-3 mb-0 rounded-0">
              {successMsg}
            </Alert>
          )}

          {errorMsg && (
            <Alert variant="danger" className="m-3 mb-0 rounded-0">
              {errorMsg}
            </Alert>
          )}

          {issues.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">No issues found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th className="py-3">Title</th>
                    <th className="py-3">Category</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Reported By</th>
                    <th className="py-3">Assigned To</th>
                    <th className="py-3">Created</th>
                    <th className="py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id}>
                      <td className="py-3">
                        <div>
                          <strong className="text-truncate d-block" style={{ maxWidth: "200px" }}>
                            {issue.title}
                          </strong>
                          <small className="text-muted text-truncate d-block" style={{ maxWidth: "200px" }}>
                            {issue.description}
                          </small>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge bg="secondary">{issue.category || "General"}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge bg={statusColors[issue.status]}>
                          {statusLabels[issue.status]}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div>
                          <div className="fw-semibold">{issue.reportedBy.fullName}</div>
                          <small className="text-muted">{issue.reportedBy.email}</small>
                        </div>
                      </td>
                      <td className="py-3">
                        {issue.assignedTo ? (
                          <div>
                            <div className="fw-semibold">{issue.assignedTo.fullName}</div>
                            <small className="text-muted">{issue.assignedTo.email}</small>
                          </div>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3">
                        <small className="text-muted">
                          {formatDate(issue.createdAt)}
                        </small>
                      </td>
                      <td className="py-3 text-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleUpdateClick(issue)}
                        >
                          Update Status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Update Status Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>Update Issue Status</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateSubmit}>
          <Modal.Body>
            {selectedIssue && (
              <div className="mb-4">
                <h6 className="fw-bold">{selectedIssue.title}</h6>
                <p className="text-muted mb-3">{selectedIssue.description}</p>
                <div className="d-flex gap-2 mb-3">
                  <Badge bg={statusColors[selectedIssue.status]}>
                    Current: {statusLabels[selectedIssue.status]}
                  </Badge>
                </div>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">New Status</Form.Label>
              <Form.Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                required
              >
                <option value="">Select status...</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Assign To (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Staff member ID (leave empty to unassign)"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
              <Form.Text className="text-muted">
                Enter the ID of the staff member to assign this issue to.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updating || !newStatus}
            >
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}