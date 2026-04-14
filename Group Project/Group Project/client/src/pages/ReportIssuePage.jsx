import { useState } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
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
    <Container className="d-flex justify-content-center align-items-center py-5">
      <Card
        className="shadow-lg p-5"
        style={{ maxWidth: "600px", width: "100%" }}
      >
        <h2 className="mb-4 text-dark fw-bold">Report an Issue</h2>

        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-dark">
              Title
            </Form.Label>
            <Form.Control
              name="title"
              placeholder="Short title of the issue"
              value={form.title}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-dark">
              Description
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              placeholder="Describe the issue in detail"
              value={form.description}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-dark">
              Category
            </Form.Label>
            <Form.Control
              name="category"
              placeholder="e.g. Road, Lighting, Safety"
              value={form.category}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-dark">
              Image URL (optional)
            </Form.Label>
            <Form.Control
              name="imageUrl"
              placeholder="Paste image link"
              value={form.imageUrl}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-dark">
              Latitude
            </Form.Label>
            <Form.Control
              name="latitude"
              placeholder="e.g. 43.6532"
              value={form.latitude}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-dark">
              Longitude
            </Form.Label>
            <Form.Control
              name="longitude"
              placeholder="e.g. -79.3832"
              value={form.longitude}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            className="w-100"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Issue"}
          </Button>
        </Form>
      </Card>
    </Container>
  );
}