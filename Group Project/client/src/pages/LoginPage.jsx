import { useState } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { useMutation } from "@apollo/client/react";
import { useNavigate, Link } from "react-router-dom";
import { GET_ME, LOGIN } from "../graphql/queries";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [errorMsg, setErrorMsg] = useState("");

  const [login, { loading }] = useMutation(LOGIN, {
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

    login({
      variables: form
    });
  };

  return (
    <div className="app-page">
      <Container className="app-auth-page">
        <Card className="app-auth-card border-0 w-100 mx-auto" style={{ maxWidth: "1120px" }}>
          <div className="app-auth-grid">
            <div className="app-auth-panel">
              <div className="app-eyebrow app-eyebrow-dark mb-3">Resident Access</div>
              <h1 className="app-display-title">Sign back in to CivicCase.</h1>
              <p className="app-hero-lead">
                Track local issues, submit new reports, and move between the chatbot, analytics,
                and map without losing context.
              </p>

              <div className="app-feature-list">
                <div className="app-feature-item">Live issue status visibility for residents and staff</div>
                <div className="app-feature-item">Fast reporting flow with map-ready location details</div>
                <div className="app-feature-item">One workspace for operations, trends, and geographic context</div>
              </div>
            </div>

            <div className="app-auth-form">
              <div className="app-eyebrow app-eyebrow-light mb-3">Login</div>
              <h2 className="app-panel-title mb-2">Welcome back</h2>
              <p className="app-panel-subtitle mb-4">
                Use your account to continue where you left off.
              </p>

              {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

              <Form onSubmit={handleSubmit} className="app-form-shell">
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
                    placeholder="Enter your password"
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
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </Form>

              <p className="mt-4 text-center app-muted">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="fw-semibold text-decoration-none">
                  Register
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </Container>
    </div>
  );
}
