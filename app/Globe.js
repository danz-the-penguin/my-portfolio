"use client";

import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";

export default function Globe({ isDark = true }) {
  const canvasRef = useRef();

  // ==========================================
  // 1. STATE & ROTATION TRACKING REFS
  // ==========================================
  const phiRef = useRef(0);
  const thetaRef = useRef(0.3);

  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef({ x: 0, y: 0 });

  // Visitor state storing country name, coordinates, and country code for flags
  const [visitor, setVisitor] = useState({
    country: "Detecting location...",
    code: "my", // Default fallback code (e.g. Malaysia)
    latitude: 3.139,
    longitude: 101.6869,
  });

  // ==========================================
  // 2. GEOLOCATION FETCH (Client-side)
  // ==========================================
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.latitude && data.longitude) {
          setVisitor({
            country: data.country_name || "Your Location",
            code: (data.country_code || "my").toLowerCase(),
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      })
      .catch(() => {
        setVisitor((prev) => ({
          ...prev,
          country: "Global Visitor",
          code: "un",
        }));
      });
  }, []);

  // ==========================================
  // 3. COBE GLOBE INITIALIZATION & ANIMATION LOOP
  // ==========================================
  useEffect(() => {
    let width = 0;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: isDark ? 1 : 0,
      diffuse: 1.2,
      mapSamples: 30000,
      mapBrightness: isDark ? 6 : 10,
      baseColor: isDark ? [0.2, 0.2, 0.25] : [1, 1, 1],
      markerColor: isDark ? [0.1, 0.8, 1] : [0.15, 0.2, 0.35],
      glowColor: isDark ? [0.2, 0.3, 0.5] : [0.95, 0.95, 0.98],
      markers: [
        {
          location: [visitor.latitude, visitor.longitude],
          size: 0.05,
          id: "visitor-loc",
        },
      ],
    });

    let animationFrameId;
    function animate() {
      if (pointerInteracting.current === null) {
        // Continuous auto-spin when idle
        phiRef.current += 0.003;
      } else {
        // Apply 360 delta tracking during drag interactions
        phiRef.current =
          pointerInteracting.current.phi + pointerInteractionMovement.current.x;

        // Clamp theta vertically to prevent flipping completely upside down (-PI/2 to PI/2)
        const newTheta =
          pointerInteracting.current.theta +
          pointerInteractionMovement.current.y;
        thetaRef.current = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, newTheta),
        );
      }

      globe.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        width: width * 2,
        height: width * 2,
      });
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [isDark, visitor.latitude, visitor.longitude]);

  // ==========================================
  // 4. RENDER COMPONENT & POINTER INTERACTION HANDLERS
  // ==========================================
  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        right: "-10%",
        transform: "translate(0, -50%)",
        width: "100%",
        maxWidth: "650px",
        aspectRatio: "1 / 1",
        zIndex: 0,
        pointerEvents: "auto",
        cursor: "grab",
        opacity: isDark ? 0.9 : 0.95,
      }}
      onPointerDown={(e) => {
        pointerInteracting.current = {
          phi: phiRef.current,
          theta: thetaRef.current,
          x: e.clientX,
          y: e.clientY,
        };
        e.currentTarget.style.cursor = "grabbing";
      }}
      onPointerUp={(e) => {
        pointerInteracting.current = null;
        e.currentTarget.style.cursor = "grab";
      }}
      onPointerOut={(e) => {
        pointerInteracting.current = null;
        e.currentTarget.style.cursor = "grab";
      }}
      onPointerMove={(e) => {
        if (pointerInteracting.current !== null) {
          // Inverted deltaX from '-' to '+' so dragging left matches natural cursor movement
          const deltaX = (e.clientX - pointerInteracting.current.x) * 0.005;
          const deltaY = (e.clientY - pointerInteracting.current.y) * 0.005;
          pointerInteractionMovement.current = { x: deltaX, y: -deltaY };
        }
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          contain: "layout paint size",
          pointerEvents: "none",
        }}
      />

      {/* CSS Anchor Positioned Visitor Label featuring Country Flag */}
      <div
        className="visitor-badge"
        style={{
          positionAnchor: `--cobe-visitor-loc`,
          opacity: `var(--cobe-visible-visitor-loc, 0)`,
        }}
      >
        <img
          src={`https://flagcdn.com/24x18/${visitor.code}.png`}
          alt={visitor.country}
          width={18}
          height={13}
          style={{ borderRadius: "2px", objectFit: "cover" }}
        />
        <span>
          You are from <strong>{visitor.country}</strong>
        </span>
      </div>

      {/* ==========================================
          5. STYLES & CSS ANCHOR POSITIONING
         ========================================== */}
      <style jsx>{`
        .visitor-badge {
          position: absolute;
          bottom: anchor(top);
          left: anchor(center);
          translate: -50% 0;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0.35rem 0.7rem;
          background: var(--bg-card);
          color: var(--text-main);
          border: 1px solid var(--border-color);
          font-size: 0.75rem;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: opacity 0.3s ease;
        }

        @supports not (anchor-name: --test) {
          .visitor-badge {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
