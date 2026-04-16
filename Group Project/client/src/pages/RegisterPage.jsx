import { useState } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { useMutation } from "@apollo/client/react";
import { useNavigate, Link } from "react-router-dom";
import { GET_ME, REGISTER } from "../graphql/queries";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: ""
  });

  const [errorMsg, setErrorMsg] = useState("");

  const [register, { loading }] = useMutation(REGISTER, {
    refetchQueries: [{ query: GET_ME }],
    awaitRefetchQueries: true,
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
    <div className="app-page">
      <Container className="app-auth-page">
        <Card className="app-auth-card border-0 w-100 mx-auto" style={{ maxWidth: "1120px" }}>
          <div className="app-auth-grid">
            <div className="app-auth-panel">
              <div className="app-eyebrow app-eyebrow-dark mb-3">New Account</div>
              <h1 className="app-display-title">Create your CivicCase profile.</h1>
              <p className="app-hero-lead">
                Join the workspace to report issues, follow city response progress, and explore
                trends through map and analytics views.
              </p>

              <div className="app-feature-list">
                <div className="app-feature-item">Resident-friendly reporting with structured issue details</div>
                <div className="app-feature-item">Clear visibility into open, active, and resolved work</div>
                <div className="app-feature-item">A consistent city operations interface from day one</div>
              </div>
            </div>

            <div className="app-auth-form">
              <div className="app-eyebrow app-eyebrow-light mb-3">Register</div>
              <h2 className="app-panel-title mb-2">Set up your account</h2>
              <p className="app-panel-subtitle mb-4">
                Create your profile to start reporting and tracking local issues.
              </p>

              {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

              <Form onSubmit={handleSubmit} className="app-form-shell">
                <Form.Group>
                  <Form.Label className="app-form-label">Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="fullName"
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    className="app-form-control"
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label className="app-form-label">Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="app-form-control"
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label className="app-form-label">Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="Enter a secure password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="app-form-control"
                  />
                </Form.Group>

                <Button
                  type="submit"
                  className="app-button-primary w-100"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Register"}
                </Button>
              </Form>

              <p className="mt-4 text-center app-muted">
                Already have an account?{" "}
                <Link to="/login" className="fw-semibold text-decoration-none">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </Container>
    </div>
  );
}
