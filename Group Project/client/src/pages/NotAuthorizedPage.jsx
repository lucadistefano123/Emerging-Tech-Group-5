import { Container, Card, Button } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function NotAuthorizedPage() {
  return (
    <div className="app-page">
      <Container className="app-auth-page">
        <Card className="app-auth-card border-0 mx-auto text-center" style={{ maxWidth: "760px", width: "100%" }}>
          <div className="app-auth-grid">
            <div className="app-auth-panel d-flex flex-column justify-content-center">
              <div className="app-eyebrow app-eyebrow-dark mb-3">Restricted Area</div>
              <h1 className="app-display-title">You don&apos;t have access to this page.</h1>
              <p className="app-hero-lead mb-0">
                This area is only available to users with the required permissions.
              </p>
            </div>

            <div className="app-auth-form d-flex flex-column justify-content-center">
              <div className="app-eyebrow app-eyebrow-light mb-3">Access Denied</div>
              <h2 className="app-panel-title mb-2">Permission required</h2>
              <p className="app-panel-subtitle mb-4">
                Head back to the homepage to continue exploring the parts of the workspace available to your account.
              </p>

              <Button as={Link} to="/" className="app-button-primary w-100">
                Go Home
              </Button>
            </div>
          </div>
        </Card>
      </Container>
    </div>
  );
}
