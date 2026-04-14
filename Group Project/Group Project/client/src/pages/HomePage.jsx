import { Container, Card, Button, Badge, Row, Col, Spinner, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { GET_ME } from "../graphql/queries";

const GET_HOME_ISSUES = gql`
  query HomeIssues {
    issues {
      id
      category
      status
      latitude
      longitude
    }
  }
`;

const heroStyle = {
  background: "linear-gradient(155deg, #10293d 0%, #173b56 58%, #1e4f73 100%)",
  color: "#f8f5ec"
};

const surfaceStyle = {
  background: "#fffdf9",
  border: "1px solid #dde6ec"
};

function MetricCard({ label, value, accent }) {
  return (
    <Card className="border-0 shadow-sm rounded-4 h-100" style={surfaceStyle}>
      <Card.Body className="p-4">
        <div
          className="d-inline-flex rounded-pill px-2 py-1 small fw-semibold mb-3"
          style={{
            color: accent,
            background: `${accent}18`,
            border: `1px solid ${accent}33`
          }}
        >
          {label}
        </div>
        <div className="fw-bold" style={{ fontSize: "2rem", color: "#10283a" }}>
          {value}
        </div>
      </Card.Body>
    </Card>
  );
}

export default function HomePage() {
  const { data, loading } = useQuery(GET_ME, {
    fetchPolicy: "network-only",
    errorPolicy: "ignore"
  });

  const { data: issuesData, loading: issuesLoading, error: issuesError } = useQuery(GET_HOME_ISSUES, {
    errorPolicy: "ignore"
  });

  const user = data?.me;
  const issues = issuesData?.issues || [];

  const openCount = issues.filter((issue) => issue.status === "open").length;
  const inProgressCount = issues.filter((issue) => issue.status === "in_progress").length;
  const resolvedCount = issues.filter((issue) => issue.status === "resolved").length;
  const mappedCount = issues.filter(
    (issue) =>
      typeof issue.latitude === "number" &&
      typeof issue.longitude === "number" &&
      Number.isFinite(issue.latitude) &&
      Number.isFinite(issue.longitude)
  ).length;

  const topCategoryEntry = Object.entries(
    issues.reduce((accumulator, issue) => {
      const key = issue.category?.trim() || "General";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {})
  ).sort((left, right) => right[1] - left[1])[0];

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <div
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255,209,111,0.18), transparent 18%), linear-gradient(180deg, #f6f1e8 0%, #f8f5ef 100%)"
      }}
    >
      <Container fluid="xl" className="py-4 py-lg-5">
        {issuesError && <Alert variant="danger">{issuesError.message}</Alert>}

        <Row className="g-4">
          <Col xl={5}>
            <Card className="border-0 shadow-lg rounded-5 h-100" style={heroStyle}>
              <Card.Body className="p-4 p-lg-5 d-flex flex-column">
                <div
                  className="d-inline-flex align-self-start rounded-pill px-3 py-2 small fw-semibold mb-3"
                  style={{
                    color: "#fff2c2",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    letterSpacing: "0.08em"
                  }}
                >
                  CivicCase
                </div>

                <h1
                  className="fw-bold mb-3"
                  style={{
                    fontSize: "clamp(2.4rem, 4.3vw, 4.25rem)",
                    lineHeight: 0.96,
                    letterSpacing: "-0.04em",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    maxWidth: "11ch"
                  }}
                >
                  Local issue tracking for residents and staff.
                </h1>

                <p className="mb-4" style={{ color: "rgba(247,244,236,0.92)", lineHeight: 1.7 }}>
                  Report problems, watch the issue landscape update live, and use the chatbot, analytics,
                  and map views to understand what is happening across the city.
                </p>

                {user ? (
                  <>
                    <p className="mb-2" style={{ color: "rgba(255,255,255,0.92)" }}>
                      Welcome back, <strong>{user.fullName}</strong>.
                    </p>
                    <p className="mb-4" style={{ color: "rgba(255,255,255,0.85)" }}>
                      Signed in as <Badge bg="light" text="dark">{user.role}</Badge>
                    </p>

                    <div className="d-flex flex-wrap gap-3 mt-auto">
                      <Button as={Link} to="/report" variant="light">
                        Report an Issue
                      </Button>
                      <Button as={Link} to="/chatbot" variant="outline-light">
                        Open Chatbot
                      </Button>
                      <Button as={Link} to="/analytics" variant="outline-light">
                        Analytics
                      </Button>
                      <Button as={Link} to="/map" variant="outline-light">
                        Map
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="d-flex gap-3 flex-wrap mt-auto">
                    <Button as={Link} to="/login" variant="light">
                      Login
                    </Button>
                    <Button as={Link} to="/register" variant="outline-light">
                      Register
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col xl={7}>
            {issuesLoading ? (
              <Container className="text-center py-5">
                <Spinner animation="border" />
              </Container>
            ) : (
              <>
                <Row className="g-3 mb-4">
                  <Col sm={6} xl={3}>
                    <MetricCard label="Total Issues" value={issues.length} accent="#16364f" />
                  </Col>
                  <Col sm={6} xl={3}>
                    <MetricCard label="Open" value={openCount} accent="#cc543b" />
                  </Col>
                  <Col sm={6} xl={3}>
                    <MetricCard label="In Progress" value={inProgressCount} accent="#c48c16" />
                  </Col>
                  <Col sm={6} xl={3}>
                    <MetricCard label="Resolved" value={resolvedCount} accent="#22835a" />
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col lg={6}>
                    <Card className="border-0 shadow-sm rounded-4 h-100" style={surfaceStyle}>
                      <Card.Body className="p-4">
                        <div className="small fw-semibold text-uppercase mb-2" style={{ color: "#81631a", letterSpacing: "0.08em" }}>
                          Resident Snapshot
                        </div>
                        <h4 className="fw-bold mb-2" style={{ color: "#10283a" }}>
                          Live issue visibility without asking the chatbot first.
                        </h4>
                        <p className="mb-0" style={{ color: "#587182", lineHeight: 1.7 }}>
                          Residents can now land on the app and immediately see how many issues exist,
                          how much work is still open, and how much data is already mapped.
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col lg={6}>
                    <Card className="border-0 shadow-sm rounded-4 h-100" style={surfaceStyle}>
                      <Card.Body className="p-4">
                        <div className="small fw-semibold text-uppercase mb-2" style={{ color: "#81631a", letterSpacing: "0.08em" }}>
                          Right Now
                        </div>
                        <div className="d-flex justify-content-between mb-3">
                          <span style={{ color: "#18364c" }}>Mapped issue points</span>
                          <strong style={{ color: "#10283a" }}>{mappedCount}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span style={{ color: "#18364c" }}>Most common category</span>
                          <strong style={{ color: "#10283a" }}>
                            {topCategoryEntry ? `${topCategoryEntry[0]} (${topCategoryEntry[1]})` : "None yet"}
                          </strong>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
}
