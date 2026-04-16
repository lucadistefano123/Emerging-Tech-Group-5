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
      <Container className="app-loader flex-column gap-3 text-center">
        <Spinner animation="border" />
        <div className="app-loader-text">Loading map...</div>
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
                <div className="app-eyebrow app-eyebrow-dark mb-3">Geographic View</div>
                <h1 className="app-display-title">Where issues are happening across the city.</h1>
                <p className="app-hero-lead mb-4">
                  This map gives staff and residents a geographic view of reported issues so clusters stand out
                  immediately instead of being buried in lists.
                </p>

                <div className="app-info-grid mt-auto">
                  <Card className="app-glass-card border-0">
                    <Card.Body>
                      <div className="app-eyebrow app-eyebrow-dark mb-3">Mapped Issues</div>
                      <div className="fw-bold" style={{ fontSize: "2.2rem" }}>{mappedIssues.length}</div>
                    </Card.Body>
                  </Card>

                  <Card className="app-glass-card border-0">
                    <Card.Body>
                      <div className="app-eyebrow app-eyebrow-dark mb-3">Open Right Now</div>
                      <div className="fw-bold" style={{ fontSize: "2.2rem" }}>{openIssues}</div>
                    </Card.Body>
                  </Card>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xl={8}>
            <Card className="app-surface-card border-0 mb-4">
              <Card.Body className="p-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                  <div className="text-start">
                    <div className="app-eyebrow app-eyebrow-light mb-3">Live Map</div>
                    <h3 className="app-panel-title mb-1">Issue Hotspots</h3>
                    <p className="app-panel-subtitle mb-0">
                      Every marker below represents a report with valid coordinates.
                    </p>
                  </div>

                  <Badge bg="light" text="dark" className="rounded-pill px-3 py-2 border">
                    {mappedIssues.length} visible pins
                  </Badge>
                </div>

                <div className="app-map-frame" style={{ height: "560px" }}>
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
