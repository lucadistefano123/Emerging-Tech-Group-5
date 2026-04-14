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
    "radial-gradient(circle at top left, rgba(243,201,105,0.22), transparent 28%), linear-gradient(180deg, #0f2334 0%, #132f46 42%, #f6f1e8 42%, #f8f5ef 100%)",
  border: "1px solid rgba(14, 34, 51, 0.08)"
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
  borderRight: "1px solid rgba(255,255,255,0.08)"
};

function SummaryMetric({ label, value, accent }) {
  return (
    <Card className="border-0 shadow-sm h-100 rounded-4" style={panelStyle}>
      <Card.Body>
        <div
          className="d-inline-flex align-items-center rounded-pill px-2 py-1 mb-3 small fw-semibold"
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
          <h5 className="fw-bold mb-1" style={{ color: "#102536" }}>{title}</h5>
          <p className="small text-secondary mb-0">{subtitle}</p>
        </div>

        <div className="d-flex flex-column gap-3">
          {data.map((item) => (
            <div key={item.label}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold text-capitalize" style={{ color: "#183048" }}>
                  {item.label}
                </span>
                <span className="small fw-semibold" style={{ color: "#355063" }}>
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
          <h5 className="fw-bold mb-1" style={{ color: "#102536" }}>Issue Velocity</h5>
          <p className="small text-secondary mb-0">
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
              <text x={point.x} y="212" textAnchor="middle" fontSize="11" fill="#597184">
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
        <div
          className="small fw-semibold mb-1 px-1"
          style={{ color: isUser ? "#486173" : "#7d5f10", textAlign: isUser ? "right" : "left" }}
        >
          {isUser ? "You" : "CivicCase AI"}
        </div>
        <div
          className="rounded-4 px-3 py-3"
          style={{
            background: isUser
              ? "linear-gradient(135deg, #17324d 0%, #214765 100%)"
              : "linear-gradient(180deg, #fffefb 0%, #f6efe1 100%)",
            color: isUser ? "#fff" : "#1a2d3d",
            border: isUser ? "none" : "1px solid #ebdfc5",
            boxShadow: isUser
              ? "0 14px 30px rgba(23,50,77,0.18)"
              : "0 12px 24px rgba(147,121,46,0.08)",
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
    <Container fluid="xl" className="py-4 py-lg-5">
      <div className="rounded-5 shadow-lg overflow-hidden" style={shellStyle}>
        <Row className="g-0">
          <Col
            xl={4}
            xxl={3}
            className="p-4 p-lg-5 text-start text-white position-relative"
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

            <div className="position-relative">
              <Badge
                className="px-3 py-2 rounded-pill text-uppercase fw-semibold mb-3"
                style={{
                  background: "rgba(243, 201, 105, 0.18)",
                  border: "1px solid rgba(243, 201, 105, 0.35)",
                  color: "#fff3ca",
                  letterSpacing: "0.08em"
                }}
              >
                CivicCase Intelligence
              </Badge>

              <h1
                className="fw-bold mb-3"
                style={{
                  fontSize: "clamp(2.4rem, 4.1vw, 4.25rem)",
                  lineHeight: 0.96,
                  letterSpacing: "-0.04em",
                  color: "#fdfaf2",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  maxWidth: "10ch",
                  textWrap: "balance",
                  textShadow: "0 3px 14px rgba(0,0,0,0.22)"
                }}
              >
                A chatbot page that actually looks like part of the product.
              </h1>

              <p
                className="mb-4"
                style={{ color: "rgba(255, 249, 235, 0.92)", lineHeight: 1.75, maxWidth: "28rem" }}
              >
                Ask for trends, hotspots, or category breakdowns and the workspace updates the conversation,
                analytics, and live map together.
              </p>

              <div className="d-flex flex-column gap-3 mb-4" style={{ maxWidth: "24rem" }}>
                {suggestionPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="text-start rounded-4 px-3 py-3"
                    style={{
                      ...glassStyle,
                      color: "#fffdf7",
                      boxShadow: "0 14px 30px rgba(3, 12, 22, 0.16)"
                    }}
                    onClick={() => setMessage(prompt)}
                  >
                    <div className="small text-uppercase fw-semibold mb-1" style={{ color: "#ffe39d" }}>
                      Suggested prompt
                    </div>
                    <div style={{ lineHeight: 1.55, color: "#f8f3e8" }}>{prompt}</div>
                  </button>
                ))}
              </div>

              <Card className="border-0 rounded-4 text-white" style={{ ...glassStyle, maxWidth: "24rem" }}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span
                      className="small text-uppercase fw-semibold"
                      style={{ letterSpacing: "0.12em", color: "#fff1c0" }}
                    >
                      AI Engine
                    </span>
                    <Badge bg={latestResult?.aiEnabled ? "success" : "secondary"}>
                      {latestResult?.aiEnabled ? "Gemini live" : "Analytics fallback"}
                    </Badge>
                  </div>
                  <p className="small mb-0" style={{ color: "rgba(255,255,255,0.90)", lineHeight: 1.65 }}>
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
                    <div className="small text-uppercase fw-semibold mb-1" style={{ color: "#735710", letterSpacing: "0.08em" }}>
                      Conversation Studio
                    </div>
                    <h3 className="fw-bold mb-1" style={{ color: "#102536" }}>Ask. Analyze. Act.</h3>
                    <p className="mb-0" style={{ color: "#455b6d" }}>
                      Keep the conversation on one side and the evidence on the other.
                    </p>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <Badge bg="light" text="dark" className="rounded-pill px-3 py-2 border" style={{ color: "#23384a" }}>
                      {chatHistory.length / 2 || 0} prompts run
                    </Badge>
                    <Badge bg="light" text="dark" className="rounded-pill px-3 py-2 border" style={{ color: "#23384a" }}>
                      {analytics?.hotspots?.length || 0} mapped points
                    </Badge>
                  </div>
                </div>

                <div
                  className="rounded-5 p-3 p-lg-4 mb-4"
                  style={{
                    minHeight: "320px",
                    maxHeight: "420px",
                    overflowY: "auto",
                    background:
                      "linear-gradient(180deg, rgba(236,243,246,0.95) 0%, rgba(248,245,239,0.92) 100%)",
                    border: "1px solid rgba(23,50,77,0.08)"
                  }}
                >
                  {chatHistory.length === 0 ? (
                    <div className="h-100 d-flex flex-column justify-content-center text-start">
                      <div className="small text-uppercase fw-semibold mb-2" style={{ color: "#735710", letterSpacing: "0.08em" }}>
                        Ready for first analysis
                      </div>
                      <h4 className="fw-bold mb-2" style={{ color: "#102536" }}>
                        Ask about issue trends, category pressure, or location clusters.
                      </h4>
                      <p className="mb-0" style={{ maxWidth: "38rem", color: "#486173" }}>
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
                      style={{
                        borderRadius: "1.25rem",
                        border: "1px solid #b8c8d4",
                        padding: "0.95rem 1.1rem",
                        color: "#102536",
                        background: "#fffefb"
                      }}
                    />
                    <Button
                      type="submit"
                      disabled={loading}
                      className="px-4 rounded-4 fw-semibold"
                      style={{
                        background: "linear-gradient(135deg, #17324d 0%, #254c6e 100%)",
                        border: "none",
                        minWidth: "210px"
                      }}
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
                        <h5 className="fw-bold mb-1" style={{ color: "#102536" }}>Issue Hotspot Map</h5>
                        <p className="small text-secondary mb-0">
                          Live coordinates for each issue with valid location data.
                        </p>
                      </div>
                      <Badge bg="light" text="dark" className="border rounded-pill px-3 py-2">
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
  );
}
