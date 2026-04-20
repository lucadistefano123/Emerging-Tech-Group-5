import { useState } from "react";
import { Container, Card, Table, Button, Alert, Form, Modal, Spinner } from "react-bootstrap";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_ISSUES, UPDATE_ISSUE_STATUS } from "../graphql/queries";

const statusLabels = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved"
};

function getStatusClass(status) {
  if (status === "open") {
    return "chip-open";
  }

  if (status === "in_progress") {
    return "chip-progress";
  }

  return "chip-resolved";
}

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
    return new Date(parseInt(dateString, 10)).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <Container className="app-loader flex-column gap-3 text-center">
        <Spinner animation="border" size="lg" />
        <div className="app-loader-text">Loading issues...</div>
      </Container>
    );
  }

  const issues = data?.issues || [];

  return (
    <div className="app-page">
      <Container fluid="xl" className="app-page-shell py-4 py-lg-5">
        <Card className="app-surface-card border-0 mb-4">
          <Card.Body className="p-4 p-lg-5 d-flex flex-column flex-lg-row justify-content-between gap-4 align-items-lg-center">
            <div>
              <div className="app-eyebrow app-eyebrow-light mb-3">Staff Console</div>
              <h2 className="app-panel-title mb-2">Issue management</h2>
              <p className="app-panel-subtitle mb-0">
                Review the full queue, assign ownership, and keep issue statuses current for residents.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <span className="app-chip chip-neutral">{issues.length} issues in queue</span>
              <span className="app-chip chip-neutral">Staff tools enabled</span>
            </div>
          </Card.Body>
        </Card>

        {successMsg && <Alert variant="success">{successMsg}</Alert>}
        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        <Card className="app-table-shell border-0">
          <Card.Body className="p-0">
            {issues.length === 0 ? (
              <div className="app-empty-state">No issues found.</div>
            ) : (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3">Category</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Reported By</th>
                      <th className="py-3">Assigned To</th>
                      <th className="py-3">Created</th>
                      <th className="py-3 text-center px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => (
                      <tr key={issue.id}>
                        <td className="py-3 px-4">
                          <div style={{ minWidth: "220px" }}>
                            <strong className="text-truncate d-block app-text-strong">{issue.title}</strong>
                            <small className="app-muted text-truncate d-block">{issue.description}</small>
                            {issue.imageUrl && (
                              <img
                                src={issue.imageUrl}
                                alt={issue.title}
                                style={{
                                  width: "120px",
                                  height: "120px",
                                  objectFit: "cover",
                                  borderRadius: "12px",
                                  marginTop: "12px",
                                  display: "block"
                                }}
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="app-chip chip-neutral">{issue.category || "General"}</span>
                        </td>
                        <td className="py-3">
                          <span className={`app-chip ${getStatusClass(issue.status)}`}>
                            {statusLabels[issue.status]}
                          </span>
                        </td>
                        <td className="py-3">
                          <div>
                            <div className="fw-semibold app-text-strong">{issue.reportedBy.fullName}</div>
                            <small className="app-muted">{issue.reportedBy.email}</small>
                          </div>
                        </td>
                        <td className="py-3">
                          {issue.assignedTo ? (
                            <div>
                              <div className="fw-semibold app-text-strong">{issue.assignedTo.fullName}</div>
                              <small className="app-muted">{issue.assignedTo.email}</small>
                            </div>
                          ) : (
                            <span className="app-muted">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3">
                          <small className="app-muted">{formatDate(issue.createdAt)}</small>
                        </td>
                        <td className="py-3 text-center px-4">
                          <Button
                            className="app-button-ghost"
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
      </Container>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered dialogClassName="app-modal">
        <Modal.Header closeButton>
          <Modal.Title>Update Issue Status</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateSubmit}>
          <Modal.Body>
            {selectedIssue && (
              <div className="mb-4">
                <h6 className="fw-bold app-text-strong">{selectedIssue.title}</h6>
                <p className="app-muted mb-3">{selectedIssue.description}</p>
                {selectedIssue.imageUrl && (
                  <img
                    src={selectedIssue.imageUrl}
                    alt={selectedIssue.title}
                    style={{
                      width: "100%",
                      maxHeight: "320px",
                      objectFit: "cover",
                      borderRadius: "16px",
                      marginBottom: "16px"
                    }}
                  />
                )}
                <div className="d-flex gap-2 mb-3">
                  <span className={`app-chip ${getStatusClass(selectedIssue.status)}`}>
                    Current: {statusLabels[selectedIssue.status]}
                  </span>
                </div>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label className="app-form-label">New Status</Form.Label>
              <Form.Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                required
                className="app-form-select"
              >
                <option value="">Select status...</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label className="app-form-label">Assign To (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Staff member ID (leave empty to unassign)"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="app-form-control"
              />
              <Form.Text className="app-muted">
                Enter the ID of the staff member to assign this issue to.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button className="app-button-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="app-button-primary"
              disabled={updating || !newStatus}
            >
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
