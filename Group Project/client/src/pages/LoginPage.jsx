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
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Card
        className="shadow-lg p-5"
        style={{ maxWidth: "500px", width: "100%" }}
      >
        <h2 className="mb-4 text-dark fw-bold">Login</h2>

        {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

        <Form onSubmit={handleSubmit}>
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
              placeholder="Enter your password"
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
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Form>

        <p className="mt-3 text-center text-secondary">
          Don’t have an account?{" "}
          <Link to="/register" className="fw-semibold">
            Register
          </Link>
        </p>
      </Card>
    </Container>
  );
}
