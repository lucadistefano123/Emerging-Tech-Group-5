import { useState } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";

const REGISTER = gql`
  mutation Register($fullName: String!, $email: String!, $password: String!) {
    register(fullName: $fullName, email: $email, password: $password) {
      message
      user {
        id
        fullName
        email
        role
      }
    }
  }
`;

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: ""
  });

  const [errorMsg, setErrorMsg] = useState("");

  const [register, { loading }] = useMutation(REGISTER, {
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

    register({
      variables: form
    });
  };

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Card
        className="shadow-lg p-5"
        style={{ maxWidth: "500px", width: "100%" }}
      >
        <h2 className="mb-4 text-dark fw-bold">Create Account</h2>

        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-dark">
              Full Name
            </Form.Label>
            <Form.Control
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-dark">
              Email
            </Form.Label>
            <Form.Control
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-dark">
              Password
            </Form.Label>
            <Form.Control
              type="password"
              name="password"
              placeholder="Enter a secure password"
              value={form.password}
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
            {loading ? "Creating account..." : "Register"}
          </Button>
        </Form>
      </Card>
    </Container>
  );
}