"use client";

import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";

export default function Globe({ isDark = true }) {
  const canvasRef = useRef();

  // Current rotation angles
  const phiRef = useRef(0);
  const thetaRef = useRef(0.3);

  // Interaction tracking
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef({ x: 0, y: 0 });

  // Visitor state
  const [visitor, setVisitor] = useState({
    country: "Detecting location...",
    code: "my",
    latitude: 3.139,
    longitude: 101.6869,
  });

  // Geolocation Fetch
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

  // Cobe Globe Initialization
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
        // Slow auto-rotation when idle
        phiRef.current += 0.003;
      } else {
        // Smoothly interpolate current movement towards target offset for a natural feel
        const targetPhi =
          pointerInteracting.current.phi + pointerInteractionMovement.current.x;
        const targetTheta =
          pointerInteracting.current.theta +
          pointerInteractionMovement.current.y;

        // Smooth spring dampening (0.1 = smooth inertia response)
        phiRef.current += (targetPhi - phiRef.current) * 0.15;

        // Clamp vertical angle to prevent flipping completely over
        const clampedTargetTheta = Math.max(-0.8, Math.min(0.8, targetTheta));
        thetaRef.current += (clampedTargetTheta - thetaRef.current) * 0.15;
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
        userSelect: "none",
        touchAction: "none",
      }}
      onPointerDown={(e) => {
        // Capture initial pointer position and current globe angles
        pointerInteracting.current = {
          x: e.clientX,
          y: e.clientY,
          phi: phiRef.current,
          theta: thetaRef.current,
        };
        pointerInteractionMovement.current = { x: 0, y: 0 };
        e.currentTarget.style.cursor = "grabbing";
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (pointerInteracting.current !== null) {
          // Calculate direct pixel distance moved from point of contact
          const deltaX = e.clientX - pointerInteracting.current.x;
          const deltaY = e.clientY - pointerInteracting.current.y;

          // Scale sensitivity down for natural 1:1 control (0.005 radians per pixel)
          pointerInteractionMovement.current = {
            x: deltaX * 0.005,
            y: deltaY * 0.005,
          };
        }
      }}
      onPointerUp={(e) => {
        if (pointerInteracting.current !== null) {
          // Freeze final calculated position before releasing
          phiRef.current =
            pointerInteracting.current.phi +
            pointerInteractionMovement.current.x;
          thetaRef.current = Math.max(
            -0.8,
            Math.min(
              0.8,
              pointerInteracting.current.theta +
                pointerInteractionMovement.current.y,
            ),
          );
        }
        pointerInteracting.current = null;
        e.currentTarget.style.cursor = "grab";
        e.currentTarget.releasePointerCapture(e.pointerId);
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

      {/* Visitor Badge */}
      <div
        className="visitor-badge"
        style={{
          positionAnchor: `--cobe-visitor-loc`,
          opacity: `var(--cobe-visible-visitor-loc, 0)`,
        }}
      >
        <span>
          Are <strong>you</strong> from <strong>📍{visitor.country}</strong>
        </span>
        <img
          src={`https://flagcdn.com/24x18/${visitor.code}.png`}
          alt={visitor.country}
          width={18}
          height={13}
          style={{ borderRadius: "2px", objectFit: "cover" }}
        />
        <strong>?</strong>
      </div>

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
