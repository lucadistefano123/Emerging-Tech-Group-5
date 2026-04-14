import { Container, Card, Button } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function NotAuthorizedPage() {
  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Card className="shadow-lg p-5 text-center" style={{ maxWidth: "500px" }}>
        <h2 className="text-danger fw-bold mb-3">Access Denied</h2>

        <p className="text-dark mb-4">
          You do not have permission to access this page.
        </p>

        <Button as={Link} to="/" variant="dark">
          Go Home
        </Button>
      </Card>
    </Container>
  );
}