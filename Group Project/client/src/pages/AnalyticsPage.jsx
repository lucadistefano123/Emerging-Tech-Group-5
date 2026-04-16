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
  open: "#cf6048",
  in_progress: "#d39821",
  resolved: "#238357"
};

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
        <div className="app-stat-value">{value}</div>
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
      <Container className="app-loader flex-column gap-3 text-center">
        <Spinner animation="border" />
        <div className="app-loader-text">Loading analytics...</div>
      </Container>
    );
  }

  return (
    <div className="app-page">
      <Container fluid="xl" className="app-page-shell py-4 py-lg-5">
        {error && <Alert variant="danger">{error.message}</Alert>}

        <Row className="g-4">
          <Col xl={4}>
            <Card className="app-hero-card h-100">
              <Card.Body className="p-4 p-lg-5 d-flex flex-column">
                <div className="app-eyebrow app-eyebrow-dark mb-3">Analytics Overview</div>
                <h1 className="app-display-title">The current issue picture at a glance.</h1>
                <p className="app-hero-lead mb-4">
                  This page turns the issue backlog into a quick operational read: workload, resolution health,
                  and the categories creating the most pressure.
                </p>

                <div className="app-info-grid mt-auto">
                  <Card className="app-glass-card border-0">
                    <Card.Body>
                      <div className="app-eyebrow app-eyebrow-dark mb-3">Resolution Rate</div>
                      <div className="fw-bold" style={{ fontSize: "2.2rem" }}>{resolutionRate}%</div>
                    </Card.Body>
                  </Card>

                  <Card className="app-glass-card border-0">
                    <Card.Body>
                      <div className="app-eyebrow app-eyebrow-dark mb-3">Leading Categories</div>
                      {topCategories.length === 0 ? (
                        <div style={{ color: "rgba(255,255,255,0.86)" }}>No issue data yet.</div>
                      ) : (
                        topCategories.map(([category, count]) => (
                          <div key={category} className="app-inline-metric mb-2">
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
                <Card className="app-surface-card border-0 h-100">
                  <Card.Body className="p-4">
                    <h4 className="app-panel-title mb-2">Status Distribution</h4>
                    <p className="app-panel-subtitle mb-4">
                      A quick view of how the backlog is split between new work, active work, and resolved work.
                    </p>

                    <div className="app-chart-shell" style={{ width: "100%", height: "360px", padding: "1rem" }}>
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
                <Card className="app-surface-card border-0 h-100">
                  <Card.Body className="p-4">
                    <h4 className="app-panel-title mb-2">Category Pressure</h4>
                    <p className="app-panel-subtitle mb-4">
                      The most common report types in the current dataset.
                    </p>

                    {topCategories.length === 0 ? (
                      <p className="mb-0 app-muted">No category data available yet.</p>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {topCategories.map(([category, count]) => {
                          const width = totalIssues ? (count / totalIssues) * 100 : 0;

                          return (
                            <div key={category}>
                              <div className="d-flex justify-content-between mb-2">
                                <span className="fw-semibold app-text-strong">{category}</span>
                                <span className="fw-semibold app-muted">{count}</span>
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
