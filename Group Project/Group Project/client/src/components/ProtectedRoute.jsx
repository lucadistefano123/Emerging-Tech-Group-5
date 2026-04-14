import { Navigate } from "react-router-dom";
import { Spinner, Container } from "react-bootstrap";
import { useQuery } from "@apollo/client/react";
import { GET_ME } from "../graphql/queries";

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { data, loading } = useQuery(GET_ME, {
    fetchPolicy: "network-only",
    errorPolicy: "ignore"
  });

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  const user = data?.me;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
  return <Navigate to="/not-authorized" replace />;
}

  return children;
}