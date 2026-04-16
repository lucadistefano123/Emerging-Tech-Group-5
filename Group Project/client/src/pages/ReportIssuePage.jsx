import { useState } from "react";
import { Container, Card, Form, Button, Alert, Row, Col } from "react-bootstrap";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";

const CREATE_ISSUE = gql`
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
      status
    }
  }
`;

export default function ReportIssuePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    imageUrl: "",
    latitude: "",
    longitude: ""
  });

  const [errorMsg, setErrorMsg] = useState("");

  const [createIssue, { loading }] = useMutation(CREATE_ISSUE, {
    onCompleted: () => {
      navigate("/");
    },
    onError: (err) => {
      setErrorMsg(err.message);
    }
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    createIssue({
      variables: {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude)
      }
    });
  };

  return (
    <div className="app-page">
      <Container fluid="lg" className="app-page-shell py-4 py-lg-5">
        <Row className="g-4 align-items-stretch">
          <Col lg={5}>
            <Card className="app-hero-card h-100">
              <Card.Body className="p-4 p-lg-5 d-flex flex-column">
                <div className="app-eyebrow app-eyebrow-dark mb-3">Report Workflow</div>
                <h1 className="app-display-title">Create a clean issue report fast.</h1>
                <p className="app-hero-lead mb-4">
                  Give staff enough context to act quickly by submitting a precise title, details,
                  category, optional image, and map-ready coordinates.
                </p>

                <div className="app-feature-list mt-auto">
                  <div className="app-feature-item">Use clear titles so issues are scannable in dashboards</div>
                  <div className="app-feature-item">Add location coordinates so the map view updates immediately</div>
                  <div className="app-feature-item">Include images when visual evidence would help triage</div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={7}>
            <Card className="app-surface-card border-0 h-100">
              <Card.Body className="p-4 p-lg-5">
                <div className="app-eyebrow app-eyebrow-light mb-3">New Issue</div>
                <h2 className="app-panel-title mb-2">Report an issue</h2>
                <p className="app-panel-subtitle mb-4">
                  Fill in the details below and we&apos;ll send the report into the shared city workspace.
                </p>

                {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

                <Form onSubmit={handleSubmit} className="app-form-shell">
                  <Form.Group>
                    <Form.Label className="app-form-label">Title</Form.Label>
                    <Form.Control
                      name="title"
                      placeholder="Short title of the issue"
                      value={form.title}
                      onChange={handleChange}
                      required
                      className="app-form-control"
                    />
                  </Form.Group>

                  <Form.Group>
                    <Form.Label className="app-form-label">Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="description"
                      placeholder="Describe the issue in detail"
                      value={form.description}
                      onChange={handleChange}
                      required
                      className="app-form-control"
                    />
                  </Form.Group>

                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="app-form-label">Category</Form.Label>
                        <Form.Control
                          name="category"
                          placeholder="Road, lighting, safety..."
                          value={form.category}
                          onChange={handleChange}
                          className="app-form-control"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="app-form-label">Image URL</Form.Label>
                        <Form.Control
                          name="imageUrl"
                          placeholder="Paste image link"
                          value={form.imageUrl}
                          onChange={handleChange}
                          className="app-form-control"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="app-form-label">Latitude</Form.Label>
                        <Form.Control
                          name="latitude"
                          placeholder="e.g. 43.6532"
                          value={form.latitude}
                          onChange={handleChange}
                          required
                          className="app-form-control"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="app-form-label">Longitude</Form.Label>
                        <Form.Control
                          name="longitude"
                          placeholder="e.g. -79.3832"
                          value={form.longitude}
                          onChange={handleChange}
                          required
                          className="app-form-control"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Button
                    type="submit"
                    className="app-button-primary w-100"
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Submit Issue"}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
