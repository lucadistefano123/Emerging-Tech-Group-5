import { Navbar, Nav, Container, Button, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_ME, LOGOUT } from "../graphql/queries";

export default function AppNavbar() {
  const navigate = useNavigate();

  const { data, loading, refetch } = useQuery(GET_ME, {
    fetchPolicy: "network-only",
    errorPolicy: "ignore"
  });

  const [logout, { loading: logoutLoading }] = useMutation(LOGOUT, {
    onCompleted: async () => {
      await refetch();
      navigate("/login");
    },
    onError: async () => {
      await refetch();
      navigate("/login");
    }
  });

  const user = data?.me;

  return (
    <Navbar expand="lg" variant="dark" className="app-navbar">
      <Container>
        <Navbar.Brand
          as={Link}
          to="/"
          className="app-navbar-brand text-white"
        >
          CivicCase
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />

        <Navbar.Collapse id="main-navbar">
          <Nav className="ms-auto align-items-center gap-2">
            <Nav.Link as={Link} to="/" className="app-navbar-link">
              Home
            </Nav.Link>

            <Nav.Link as={Link} to="/chatbot" className="app-navbar-link">
              Chatbot
            </Nav.Link>

            <Nav.Link as={Link} to="/analytics" className="app-navbar-link">
              Analytics
            </Nav.Link>

            <Nav.Link as={Link} to="/map" className="app-navbar-link">
              Map
            </Nav.Link>

            {user?.role === "staff" && (
              <Nav.Link as={Link} to="/staff/issues" className="app-navbar-link">
                Manage Issues
              </Nav.Link>
            )}

            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : user ? (
              <>
                <span className="app-navbar-user me-2">
                  {user.fullName} ({user.role})
                </span>

                <Button
                  size="sm"
                  onClick={() => logout()}
                  disabled={logoutLoading}
                  className="app-button-secondary"
                >
                  {logoutLoading ? "Logging out..." : "Logout"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  as={Link}
                  to="/login"
                  size="sm"
                  className="app-button-secondary"
                >
                  Login
                </Button>

                <Button
                  as={Link}
                  to="/register"
                  size="sm"
                  className="app-button-light"
                >
                  Register
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
