import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner
} from "react-bootstrap";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./ChatBotPage.css";

const CHATBOT = gql`
  mutation Chatbot($message: String!) {
    chatbot(message: $message) {
      reply
      aiEnabled
      analytics {
        totalIssues
        statusCounts {
          label
          value
        }
        categoryCounts {
          label
          value
        }
        dailyTrend {
          label
          value
        }
        hotspots {
          id
          title
          category
          status
          latitude
          longitude
        }
      }
    }
  }
`;

const suggestionPrompts = [
  "Give me a trend summary for issue activity this week.",
  "Which categories have the most reports right now?",
  "Show me where the biggest issue hotspots are on the map."
];

const statusColors = {
  open: "#db5c44",
  in_progress: "#f0b84a",
  resolved: "#2c9c6a"
};

const markerIcon = new L.DivIcon({
  className: "civiccase-map-pin",
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#17324d;border:3px solid #f3c969;box-shadow:0 10px 24px rgba(23,50,77,0.30);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const shellStyle = {
  background:
    "radial-gradient(circle at top left, rgba(243,201,105,0.22), transparent 28%), linear-gradient(180deg, #0f2334 0%, #132f46 42%, rgba(255,255,255,0.88) 42%, rgba(248,250,252,0.94) 100%)",
  border: "1px solid rgba(14, 34, 51, 0.08)",
  backdropFilter: "blur(10px)"
};

const glassStyle = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.18)",
  backdropFilter: "blur(16px)"
};

const panelStyle = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(24, 48, 72, 0.08)"
};

const leftPanelStyle = {
  minWidth: 0,
  background:
    "linear-gradient(180deg, rgba(15,35,52,0.98) 0%, rgba(19,47,70,0.95) 58%, rgba(28,52,73,0.92) 100%)",
  borderRight: "1px solid rgba(255,255,255,0.08)",
  minHeight: "100%",
  display: "flex",
  flexDirection: "column"
};

function SummaryMetric({ label, value, accent }) {
  return (
    <Card className="border-0 shadow-sm h-100 rounded-4" style={panelStyle}>
      <Card.Body>
        <div
          className="d-inline-flex align-items-center rounded-pill px-2 py-1 mb-3 small fw-semibold metric-label"
          style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}33` }}
        >
          {label}
        </div>
        <div className="fw-bold" style={{ fontSize: "2rem", color: "#102536" }}>
          {value}
        </div>
      </Card.Body>
    </Card>
  );
}

function BarChartCard({ title, subtitle, data, color }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card className="border-0 shadow-sm h-100 rounded-4" style={panelStyle}>
      <Card.Body className="p-4">
        <div className="mb-4">
          <h5 className="chart-title mb-1">{title}</h5>
          <p className="chart-subtitle mb-0">{subtitle}</p>
        </div>

        <div className="d-flex flex-column gap-3">
          {data.map((item) => (
            <div key={item.label}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="chart-label text-capitalize">
                  {item.label}
                </span>
                <span className="chart-value">
                  {item.value}
                </span>
              </div>
              <div
                className="rounded-pill"
                style={{ height: "12px", background: "#e4ecf1", overflow: "hidden" }}
              >
                <div
                  className="rounded-pill"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

function TrendChartCard({ data }) {
  const points = useMemo(() => {
    const width = 560;
    const height = 220;
    const padding = 24;
    const maxValue = Math.max(...data.map((item) => item.value), 1);

    return data.map((item, index) => {
      const x =
        padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
      const y =
        height - padding - ((item.value || 0) * (height - padding * 2)) / maxValue;

      return { ...item, x, y };
    });
  }, [data]);

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = points.length
    ? `24,196 ${linePoints} 536,196`
    : "";

  return (
    <Card className="border-0 shadow-sm h-100 rounded-4" style={panelStyle}>
      <Card.Body className="p-4">
        <div className="mb-3">
          <h5 className="chart-title mb-1">Issue Velocity</h5>
          <p className="chart-subtitle mb-0">
            Report creation over the most recent tracked days.
          </p>
        </div>

        <svg viewBox="0 0 560 220" className="w-100" role="img" aria-label="Issue trend chart">
          <defs>
            <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#17324d" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#17324d" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="560" height="220" rx="18" fill="#eff4f6" />
          <line x1="24" y1="196" x2="536" y2="196" stroke="#d2dde4" strokeWidth="2" />
          {areaPoints ? <polygon fill="url(#velocityFill)" points={areaPoints} /> : null}
          {linePoints ? (
            <polyline
              fill="none"
              stroke="#17324d"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={linePoints}
            />
          ) : null}

          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="6" fill="#f3c969" stroke="#17324d" strokeWidth="3" />
              <text x={point.x} y="212" textAnchor="middle" fontSize="11" fill="#4a6578">
                {point.label.slice(5)}
              </text>
            </g>
          ))}
        </svg>
      </Card.Body>
    </Card>
  );
}

function ChatBubble({ role, text }) {
  const isUser = role === "user";

  return (
    <div className={`d-flex mb-3 ${isUser ? "justify-content-end" : "justify-content-start"}`}>
      <div style={{ maxWidth: "88%" }}>
        <div className={isUser ? "chat-bubble-user-name" : "chat-bubble-bot-name"}>
          {isUser ? "You" : "CivicCase AI"}
        </div>
        <div
          className={`rounded-4 px-3 py-3 ${isUser ? "chat-bubble-user" : "chat-bubble-bot"}`}
          style={{
            whiteSpace: "pre-wrap"
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

export default function ChatBotPage() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [sendMessage, { loading }] = useMutation(CHATBOT, {
    onCompleted: (data) => {
      const result = data.chatbot;

      setLatestResult(result);
      setChatHistory((prev) => [
        ...prev,
        { role: "user", text: message.trim() },
        { role: "bot", text: result.reply }
      ]);
      setMessage("");
      setErrorMsg("");
    },
    onError: (error) => {
      setErrorMsg(error.message);
    }
  });

  const analytics = latestResult?.analytics;
  const mapCenter = analytics?.hotspots?.length
    ? [analytics.hotspots[0].latitude, analytics.hotspots[0].longitude]
    : [43.6532, -79.3832];

  const latestOpen = analytics?.statusCounts.find((item) => item.label === "open")?.value ?? 0;
  const latestProgress =
    analytics?.statusCounts.find((item) => item.label === "in progress")?.value ?? 0;
  const latestResolved =
    analytics?.statusCounts.find((item) => item.label === "resolved")?.value ?? 0;

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    sendMessage({
      variables: {
        message: message.trim()
      }
    });
  };

  return (
    <div className="app-page">
      <Container fluid="xl" className="app-page-shell py-4 py-lg-5">
      <div className="rounded-5 shadow-lg overflow-hidden" style={shellStyle}>
        <Row className="g-0">
          <Col
            xl={4}
            xxl={3}
            className="p-4 p-lg-5 text-start text-white position-relative left-panel-container"
            style={leftPanelStyle}
          >
            <div
              className="position-absolute top-0 start-0 rounded-circle"
              style={{
                width: "220px",
                height: "220px",
                background: "rgba(243, 201, 105, 0.12)",
                filter: "blur(12px)",
                transform: "translate(-25%, -20%)"
              }}
            />

            <div className="left-panel-content">
              <Badge
                className="civiccase-badge px-3 py-2 rounded-pill text-uppercase fw-semibold mb-3"
              >
                CivicCase Intelligence
              </Badge>

              <h1
                className="fw-bold mb-3 civiccase-heading"
              >
                A chatbot page that actually looks like part of the product.
              </h1>

              <p
                className="mb-4 civiccase-panel-text"
              >
                Ask for trends, hotspots, or category breakdowns and the workspace updates the conversation,
                analytics, and live map together.
              </p>

              <div className="d-flex flex-column gap-3 mb-4" style={{ maxWidth: "24rem" }}>
                {suggestionPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="civiccase-glass-button"
                    onClick={() => setMessage(prompt)}
                  >
                    <div className="prompt-label">
                      Suggested prompt
                    </div>
                    <div className="prompt-text">{prompt}</div>
                  </button>
                ))}
              </div>

              <Card className="border-0 rounded-4 civiccase-info-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="info-label">
                      AI Engine
                    </span>
                    <Badge bg={latestResult?.aiEnabled ? "success" : "secondary"} className={latestResult?.aiEnabled ? "civiccase-badge-success" : "civiccase-badge-secondary"}>
                      {latestResult?.aiEnabled ? "Gemini live" : "Analytics fallback"}
                    </Badge>
                  </div>
                  <p className="small mb-0 info-text">
                    Gemini replies are used when the server key is valid. Otherwise the page still delivers live
                    issue analytics from your own data.
                  </p>
                </Card.Body>
              </Card>
            </div>
          </Col>

          <Col xl={8} className="p-3 p-lg-4 p-xl-5" style={{ background: "#f8f5ef" }}>
            {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

            <Card className="border-0 shadow-sm rounded-5 mb-4" style={panelStyle}>
              <Card.Body className="p-3 p-lg-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                  <div className="text-start">
                    <div className="content-label">
                      Conversation Studio
                    </div>
                    <h3 className="content-heading mb-1">Ask. Analyze. Act.</h3>
                    <p className="content-subtext mb-0">
                      Keep the conversation on one side and the evidence on the other.
                    </p>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <Badge bg="light" text="dark" className="civiccase-badge-info rounded-pill px-3 py-2">
                      {chatHistory.length / 2 || 0} prompts run
                    </Badge>
                    <Badge bg="light" text="dark" className="civiccase-badge-info rounded-pill px-3 py-2">
                      {analytics?.hotspots?.length || 0} mapped points
                    </Badge>
                  </div>
                </div>

                <div className="chat-history-container mb-4">
                  {chatHistory.length === 0 ? (
                    <div className="h-100 d-flex flex-column justify-content-center text-start">
                      <div className="content-label mb-2">
                        Ready for first analysis
                      </div>
                      <h4 className="content-heading mb-2">
                        Ask about issue trends, category pressure, or location clusters.
                      </h4>
                      <p className="content-subtext mb-0" style={{ maxWidth: "38rem" }}>
                        The reply will appear here and the dashboard below will update with counts, charts, and a live map.
                      </p>
                    </div>
                  ) : (
                    chatHistory.map((item, index) => (
                      <ChatBubble key={`${item.role}-${index}`} role={item.role} text={item.text} />
                    ))
                  )}
                </div>

                <Form onSubmit={handleSubmit}>
                  <div className="d-flex flex-column flex-lg-row gap-3 align-items-stretch">
                    <Form.Control
                      type="text"
                      size="lg"
                      placeholder="Ask about hotspots, issue volume, resolution pace, or category load..."
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className="chatbot-input"
                    />
                    <Button
                      type="submit"
                      disabled={loading}
                      className="chatbot-submit-btn"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Running analysis...
                        </>
                      ) : (
                        "Generate insights"
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>

            <Row className="g-3 mb-4">
              <Col sm={6} xl={3}>
                <SummaryMetric label="Total Issues" value={analytics?.totalIssues ?? 0} accent="#17324d" />
              </Col>
              <Col sm={6} xl={3}>
                <SummaryMetric label="Open" value={latestOpen} accent={statusColors.open} />
              </Col>
              <Col sm={6} xl={3}>
                <SummaryMetric label="In Progress" value={latestProgress} accent={statusColors.in_progress} />
              </Col>
              <Col sm={6} xl={3}>
                <SummaryMetric label="Resolved" value={latestResolved} accent={statusColors.resolved} />
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col lg={6}>
                <BarChartCard
                  title="Status Breakdown"
                  subtitle="A fast read on workload distribution across the system."
                  data={analytics?.statusCounts || []}
                  color="#17324d"
                />
              </Col>
              <Col lg={6}>
                <BarChartCard
                  title="Top Categories"
                  subtitle="The issue types pulling the most attention right now."
                  data={analytics?.categoryCounts || []}
                  color="#d9a53c"
                />
              </Col>
            </Row>

            <Row className="g-3">
              <Col lg={6}>
                <TrendChartCard data={analytics?.dailyTrend || []} />
              </Col>
              <Col lg={6}>
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden h-100" style={panelStyle}>
                  <Card.Body className="p-4 pb-2">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <div>
                        <h5 className="chart-title mb-1">Issue Hotspot Map</h5>
                        <p className="chart-subtitle mb-0">
                          Live coordinates for each issue with valid location data.
                        </p>
                      </div>
                      <Badge bg="light" text="dark" className="civiccase-badge-info border rounded-pill px-3 py-2">
                        {analytics?.hotspots?.length || 0} pins
                      </Badge>
                    </div>
                  </Card.Body>

                  <div style={{ height: "360px", padding: "0 1rem 1rem" }}>
                    <div className="rounded-4 overflow-hidden h-100" style={{ border: "1px solid #dde7ed" }}>
                      <MapContainer
                        center={mapCenter}
                        zoom={12}
                        scrollWheelZoom={false}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {(analytics?.hotspots || []).map((spot) => (
                          <Marker
                            key={spot.id}
                            position={[spot.latitude, spot.longitude]}
                            icon={markerIcon}
                          >
                            <Popup>
                              <strong>{spot.title}</strong>
                              <br />
                              {spot.category}
                              <br />
                              {spot.status.replace("_", " ")}
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
      </Container>
    </div>
  );
}
