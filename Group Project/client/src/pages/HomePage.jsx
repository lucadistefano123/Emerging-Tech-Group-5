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

function MetricCard({ label, value, accent }) {
  return (
    <Card className="app-stat-card app-surface-card border-0 h-100">
      <Card.Body className="p-4">
        <div
          className="app-stat-label mb-3"
          style={{
            color: accent,
            background: `${accent}18`,
            border: `1px solid ${accent}33`
          }}
        >
          {label}
        </div>
        <div className="app-stat-value">
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
    <div className="app-page">
      <Container fluid="xl" className="app-page-shell py-4 py-lg-5">
        {issuesError && <Alert variant="danger">{issuesError.message}</Alert>}

        <Row className="g-4">
          <Col xl={5}>
            <Card className="app-hero-card h-100">
              <Card.Body className="p-4 p-lg-5 d-flex flex-column">
                <div className="app-eyebrow app-eyebrow-dark mb-3">
                  CivicCase
                </div>

                <h1 className="app-display-title">
                  Local issue tracking for residents and staff.
                </h1>

                <p className="app-hero-lead mb-4">
                  Report problems, watch the issue landscape update live, and use the chatbot, analytics,
                  and map views to understand what is happening across the city.
                </p>

                {user ? (
                  <>
                    <p className="mb-2" style={{ color: "rgba(255,255,255,0.92)" }}>
                      Welcome back, <strong>{user.fullName}</strong>.
                    </p>
                    <p className="mb-4" style={{ color: "rgba(255,255,255,0.85)" }}>
                      Signed in as <Badge bg="light" text="dark" className="rounded-pill px-3 py-2">{user.role}</Badge>
                    </p>

                    <div className="d-flex flex-wrap gap-3 mt-auto">
                      <Button as={Link} to="/report" className="app-button-light">
                        Report an Issue
                      </Button>
                      <Button as={Link} to="/chatbot" className="app-button-secondary">
                        Open Chatbot
                      </Button>
                      <Button as={Link} to="/analytics" className="app-button-secondary">
                        Analytics
                      </Button>
                      <Button as={Link} to="/map" className="app-button-secondary">
                        Map
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="d-flex gap-3 flex-wrap mt-auto">
                    <Button as={Link} to="/login" className="app-button-light">
                      Login
                    </Button>
                    <Button as={Link} to="/register" className="app-button-secondary">
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
                    <Card className="app-surface-card border-0 h-100">
                      <Card.Body className="p-4">
                        <div className="app-eyebrow app-eyebrow-light mb-3">
                          Resident Snapshot
                        </div>
                        <h4 className="app-panel-title mb-2">
                          Live issue visibility without asking the chatbot first.
                        </h4>
                        <p className="app-panel-subtitle mb-0">
                          Residents can now land on the app and immediately see how many issues exist,
                          how much work is still open, and how much data is already mapped.
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col lg={6}>
                    <Card className="app-surface-card border-0 h-100">
                      <Card.Body className="p-4">
                        <div className="app-eyebrow app-eyebrow-light mb-3">
                          Right Now
                        </div>
                        <div className="d-flex justify-content-between mb-3">
                          <span className="app-text-strong">Mapped issue points</span>
                          <strong className="app-text-strong">{mappedCount}</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="app-text-strong">Most common category</span>
                          <strong className="app-text-strong">
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
