import { Container, Card, Row, Col, Spinner, Alert } from "react-bootstrap";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const GET_ISSUES = gql`
  query AnalyticsIssues {
    issues {
      id
      status
      category
      createdAt
    }
  }
`;

const COLORS = {
  open: "#cc543b",
  in_progress: "#c48c16",
  resolved: "#22835a"
};

const pageStyle = {
  background:
    "radial-gradient(circle at top left, rgba(255,209,111,0.18), transparent 18%), linear-gradient(180deg, #f6f1e8 0%, #f8f5ef 100%)"
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

export default function AnalyticsPage() {
  const { data, loading, error } = useQuery(GET_ISSUES);

  const issues = data?.issues || [];

  const counts = {
    open: issues.filter((issue) => issue.status === "open").length,
    in_progress: issues.filter((issue) => issue.status === "in_progress").length,
    resolved: issues.filter((issue) => issue.status === "resolved").length
  };

  const chartData = [
    { name: "Open", value: counts.open, color: COLORS.open },
    { name: "In Progress", value: counts.in_progress, color: COLORS.in_progress },
    { name: "Resolved", value: counts.resolved, color: COLORS.resolved }
  ];

  const categorySummary = issues.reduce((accumulator, issue) => {
    const key = issue.category?.trim() || "General";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const topCategories = Object.entries(categorySummary)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);

  const totalIssues = issues.length;
  const resolutionRate = totalIssues ? Math.round((counts.resolved / totalIssues) * 100) : 0;

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <div style={pageStyle}>
      <Container fluid="xl" className="py-4 py-lg-5">
        {error && <Alert variant="danger">{error.message}</Alert>}

        <Row className="g-4">
          <Col xl={4}>
            <Card
              className="border-0 shadow-lg rounded-5 h-100"
              style={{
                background: "linear-gradient(155deg, #10293d 0%, #173b56 58%, #1e4f73 100%)",
                color: "#f8f5ec"
              }}
            >
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
                  Analytics Overview
                </div>

                <h1
                  className="fw-bold mb-3"
                  style={{
                    fontSize: "clamp(2.3rem, 4vw, 4rem)",
                    lineHeight: 0.97,
                    letterSpacing: "-0.04em",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    maxWidth: "12ch"
                  }}
                >
                  The current issue picture at a glance.
                </h1>

                <p className="mb-4" style={{ color: "rgba(247,244,236,0.92)", lineHeight: 1.7 }}>
                  This page turns the issue backlog into a quick operational read: workload, resolution health,
                  and the categories creating the most pressure.
                </p>

                <div className="mt-auto d-flex flex-column gap-3">
                  <Card className="border-0 rounded-4" style={{ background: "rgba(255,255,255,0.10)" }}>
                    <Card.Body>
                      <div className="small text-uppercase fw-semibold mb-1" style={{ color: "#ffe19a", letterSpacing: "0.08em" }}>
                        Resolution Rate
                      </div>
                      <div className="fw-bold" style={{ fontSize: "2rem" }}>{resolutionRate}%</div>
                    </Card.Body>
                  </Card>

                  <Card className="border-0 rounded-4" style={{ background: "rgba(255,255,255,0.10)" }}>
                    <Card.Body>
                      <div className="small text-uppercase fw-semibold mb-2" style={{ color: "#ffe19a", letterSpacing: "0.08em" }}>
                        Leading Categories
                      </div>
                      {topCategories.length === 0 ? (
                        <div style={{ color: "rgba(255,255,255,0.86)" }}>No issue data yet.</div>
                      ) : (
                        topCategories.map(([category, count]) => (
                          <div key={category} className="d-flex justify-content-between mb-2" style={{ color: "rgba(255,255,255,0.92)" }}>
                            <span>{category}</span>
                            <strong>{count}</strong>
                          </div>
                        ))
                      )}
                    </Card.Body>
                  </Card>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xl={8}>
            <Row className="g-3 mb-4">
              <Col sm={6} xl={3}>
                <MetricCard label="Total Issues" value={totalIssues} accent="#16364f" />
              </Col>
              <Col sm={6} xl={3}>
                <MetricCard label="Open" value={counts.open} accent={COLORS.open} />
              </Col>
              <Col sm={6} xl={3}>
                <MetricCard label="In Progress" value={counts.in_progress} accent={COLORS.in_progress} />
              </Col>
              <Col sm={6} xl={3}>
                <MetricCard label="Resolved" value={counts.resolved} accent={COLORS.resolved} />
              </Col>
            </Row>

            <Row className="g-3">
              <Col lg={7}>
                <Card className="border-0 shadow-sm rounded-4 h-100" style={surfaceStyle}>
                  <Card.Body className="p-4">
                    <h4 className="fw-bold mb-1" style={{ color: "#10283a" }}>Status Distribution</h4>
                    <p className="mb-4" style={{ color: "#557082" }}>
                      A quick view of how the backlog is split between new work, active work, and resolved work.
                    </p>

                    <div style={{ width: "100%", height: "360px" }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={85}
                            outerRadius={125}
                            paddingAngle={3}
                          >
                            {chartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={5}>
                <Card className="border-0 shadow-sm rounded-4 h-100" style={surfaceStyle}>
                  <Card.Body className="p-4">
                    <h4 className="fw-bold mb-1" style={{ color: "#10283a" }}>Category Pressure</h4>
                    <p className="mb-4" style={{ color: "#557082" }}>
                      The most common report types in the current dataset.
                    </p>

                    {topCategories.length === 0 ? (
                      <p className="mb-0" style={{ color: "#557082" }}>No category data available yet.</p>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {topCategories.map(([category, count]) => {
                          const width = totalIssues ? (count / totalIssues) * 100 : 0;

                          return (
                            <div key={category}>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="fw-semibold" style={{ color: "#18364c" }}>{category}</span>
                                <span className="fw-semibold" style={{ color: "#355267" }}>{count}</span>
                              </div>
                              <div className="rounded-pill" style={{ height: "12px", background: "#e4edf2" }}>
                                <div
                                  className="rounded-pill"
                                  style={{
                                    height: "100%",
                                    width: `${width}%`,
                                    background: "linear-gradient(90deg, #16364f, #255171)"
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
