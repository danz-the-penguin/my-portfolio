"use client";

import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";

export default function VisitorGlobe() {
  const canvasRef = useRef();
  const [visitor, setVisitor] = useState({
    country: "Loading location...",
    latitude: 3.139,
    longitude: 101.6869, // Default fallback (e.g., Kuala Lumpur)
  });

  // 1. Fetch visitor's location on mount
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.latitude && data.longitude) {
          setVisitor({
            country: data.country_name || "Your Country",
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      })
      .catch(() => {
        setVisitor((prev) => ({ ...prev, country: "Global Visitor" }));
      });
  }, []);

  // 2. Initialize and update COBE globe when visitor coordinates load
  useEffect(() => {
    if (!canvasRef.current) return;

    let phi = 0;
    let animationFrameId;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: canvasRef.current.offsetWidth * 2,
      height: canvasRef.current.offsetWidth * 2,
      phi: 0,
      theta: 0.2,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.1, 0.1, 0.12],
      markerColor: [0.1, 0.8, 1],
      glowColor: [0.2, 0.3, 0.5],
      markers: [
        // Dynamic visitor marker with ID for CSS anchor positioning
        {
          location: [visitor.latitude, visitor.longitude],
          size: 0.06,
          id: "visitor-loc",
        },
      ],
    });

    // Continuous rotation loop
    function animate() {
      phi += 0.003;
      globe.update({ phi });
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();

    // Dynamically update markers if coordinates change after fetch completes
    globe.update({
      markers: [
        {
          location: [visitor.latitude, visitor.longitude],
          size: 0.06,
          id: "visitor-loc",
        },
      ],
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      globe.destroy();
    };
  }, [visitor.latitude, visitor.longitude]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#050505",
      }}
    >
      <div style={{ width: "500px", height: "500px", position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            contain: "layout paint size",
          }}
        />

        {/* 3. CSS Anchor Positioned Label tracking the visitor's marker */}
        <div
          className="visitor-label"
          style={{
            positionAnchor: `--cobe-visitor-loc`,
            opacity: `var(--cobe-visible-visitor-loc, 0)`,
          }}
        >
          📍 {visitor.country}
        </div>
      </div>

      <style jsx>{`
        .visitor-label {
          position: absolute;
          bottom: anchor(top);
          left: anchor(center);
          translate: -50% 0;
          margin-bottom: 8px;
          padding: 0.3rem 0.6rem;
          background: #1a1a1a;
          color: #fff;
          font-family: sans-serif;
          font-size: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          transition: opacity 0.3s ease;
        }

        /* Fallback for browsers without CSS Anchor Positioning support */
        @supports not (anchor-name: --test) {
          .visitor-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
