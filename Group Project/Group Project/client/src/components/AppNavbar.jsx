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
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
      <Container>
        <Navbar.Brand
          as={Link}
          to="/"
          className="fw-bold text-white"
        >
          CivicCase
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />

        <Navbar.Collapse id="main-navbar">
          <Nav className="ms-auto align-items-center gap-2">
            <Nav.Link as={Link} to="/" className="text-white">
              Home
            </Nav.Link>

            <Nav.Link as={Link} to="/chatbot" className="text-white">
              Chatbot
            </Nav.Link>

            <Nav.Link as={Link} to="/analytics" className="text-white">
              Analytics
            </Nav.Link>

            <Nav.Link as={Link} to="/map" className="text-white">
              Map
            </Nav.Link>

            {user?.role === "staff" && (
              <Nav.Link as={Link} to="/staff/issues" className="text-white fw-semibold">
                Manage Issues
              </Nav.Link>
            )}

            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : user ? (
              <>
                <span className="text-light fw-semibold me-2">
                  {user.fullName} ({user.role})
                </span>

                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={() => logout()}
                  disabled={logoutLoading}
                >
                  {logoutLoading ? "Logging out..." : "Logout"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  as={Link}
                  to="/login"
                  variant="outline-light"
                  size="sm"
                >
                  Login
                </Button>

                <Button
                  as={Link}
                  to="/register"
                  variant="light"
                  size="sm"
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
