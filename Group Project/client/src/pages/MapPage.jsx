import { Container, Card, Row, Col, Badge, Spinner, Alert } from "react-bootstrap";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const GET_ISSUES = gql`
  query MapIssues {
    issues {
      id
      title
      category
      status
      latitude
      longitude
    }
  }
`;

const markerIcon = new L.DivIcon({
  className: "civiccase-map-pin",
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#13344c;border:3px solid #ffd16f;box-shadow:0 10px 24px rgba(19,52,76,0.28);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const pageStyle = {
  background:
    "radial-gradient(circle at top left, rgba(255,209,111,0.18), transparent 18%), linear-gradient(180deg, #f6f1e8 0%, #f8f5ef 100%)"
};

const surfaceStyle = {
  background: "#fffdf9",
  border: "1px solid #dde6ec"
};

export default function MapPage() {
  const { data, loading, error } = useQuery(GET_ISSUES);

  const issues = Array.isArray(data?.issues) ? data.issues : [];
  const mappedIssues = issues.filter(
    (issue) =>
      typeof issue.latitude === "number" &&
      typeof issue.longitude === "number" &&
      Number.isFinite(issue.latitude) &&
      Number.isFinite(issue.longitude)
  );

  const center = mappedIssues.length
    ? [mappedIssues[0].latitude, mappedIssues[0].longitude]
    : [43.6532, -79.3832];

  const openIssues = issues.filter((issue) => issue.status === "open").length;

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
                  Geographic View
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
                  Where issues are happening across the city.
                </h1>

                <p className="mb-4" style={{ color: "rgba(247,244,236,0.92)", lineHeight: 1.7 }}>
                  This map gives staff and residents a geographic view of reported issues so clusters stand out
                  immediately instead of being buried in lists.
                </p>

                <div className="d-flex flex-column gap-3 mt-auto">
                  <Card className="border-0 rounded-4" style={{ background: "rgba(255,255,255,0.10)" }}>
                    <Card.Body>
                      <div className="small text-uppercase fw-semibold mb-1" style={{ color: "#ffe19a", letterSpacing: "0.08em" }}>
                        Mapped Issues
                      </div>
                      <div className="fw-bold" style={{ fontSize: "2rem" }}>{mappedIssues.length}</div>
                    </Card.Body>
                  </Card>

                  <Card className="border-0 rounded-4" style={{ background: "rgba(255,255,255,0.10)" }}>
                    <Card.Body>
                      <div className="small text-uppercase fw-semibold mb-1" style={{ color: "#ffe19a", letterSpacing: "0.08em" }}>
                        Open Right Now
                      </div>
                      <div className="fw-bold" style={{ fontSize: "2rem" }}>{openIssues}</div>
                    </Card.Body>
                  </Card>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xl={8}>
            <Card className="border-0 shadow-sm rounded-5 mb-4" style={surfaceStyle}>
              <Card.Body className="p-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                  <div className="text-start">
                    <div className="small fw-semibold text-uppercase mb-1" style={{ color: "#81631a", letterSpacing: "0.08em" }}>
                      Live Map
                    </div>
                    <h3 className="fw-bold mb-1" style={{ color: "#10283a" }}>Issue Hotspots</h3>
                    <p className="mb-0" style={{ color: "#587182" }}>
                      Every marker below represents a report with valid coordinates.
                    </p>
                  </div>

                  <Badge bg="light" text="dark" className="rounded-pill px-3 py-2 border" style={{ color: "#1f394c" }}>
                    {mappedIssues.length} visible pins
                  </Badge>
                </div>

                <div className="rounded-4 overflow-hidden" style={{ border: "1px solid #dbe5eb", height: "560px" }}>
                  <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {mappedIssues.map((issue) => (
                      <Marker key={issue.id} position={[issue.latitude, issue.longitude]} icon={markerIcon}>
                        <Popup>
                          <strong>{issue.title}</strong>
                          <br />
                          {issue.category || "General"}
                          <br />
                          {String(issue.status || "").replace("_", " ")}
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
