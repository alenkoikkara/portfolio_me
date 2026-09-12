import React from 'react'
import { useSpring, animated as a } from '@react-spring/three'
import { Html } from '@react-three/drei'
import useDeviceStore from './useDeviceStore'
import { PROJECTS } from '../data/projects'
import * as THREE from 'three'

/**
 * Projector — appears above the device after a cartridge is inserted.
 * Shows a holographic-style 3D preview plane and an HTML overlay with project info.
 * The open camera looks straight down, so the hologram lies flat and hovers
 * above the device towards the viewer.
 */
export default function Projector() {
  const mode = useDeviceStore((s) => s.mode)
  const focusedIndex = useDeviceStore((s) => s.focusedIndex)

  const isProjecting = mode === 'PROJECTING'
  const project = PROJECTS[focusedIndex]

  // Fade + scale spring
  const spring = useSpring({
    opacity: isProjecting ? 0.85 : 0,
    scale: isProjecting ? 1 : 0.5,
    posY: isProjecting ? 0.10 : 0.06,
    config: { tension: 160, friction: 22 },
    delay: isProjecting ? 300 : 0,
  })

  if (!project) return null
  if (mode === 'IDLE' || mode === 'BROWSING') return null

  return (
    <a.group
      position-x={0}
      position-y={spring.posY}
      position-z={0}
      scale={spring.scale}
    >
      {/* Holographic preview plane — emissive glow, not lit */}
      <a.mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.04, 0.03]} />
        <a.meshBasicMaterial
          color={project.color}
          transparent
          opacity={spring.opacity}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </a.mesh>

      {/* Glow halo behind the plane */}
      <a.mesh rotation={[-Math.PI / 2, 0, 0]} position-y={-0.001}>
        <planeGeometry args={[0.05, 0.04]} />
        <a.meshBasicMaterial
          color={project.color}
          transparent
          opacity={spring.opacity.to(v => v * 0.25)}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </a.mesh>

      {/* HTML overlay — project info card */}
      {isProjecting && (
        <Html
          position={[0, 0.03, -0.035]}
          center
          distanceFactor={0.18}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="projector-card" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '24px 32px',
            minWidth: '280px',
            maxWidth: '380px',
            boxShadow: `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)`,
            textAlign: 'center',
            fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: project.color,
              margin: '0 auto 12px',
            }} />
            <h3 style={{
              margin: '0 0 6px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#1a1a2e',
              letterSpacing: '-0.02em',
            }}>{project.title}</h3>
            <p style={{
              margin: '0 0 16px',
              fontSize: '13px',
              color: '#6b7280',
              lineHeight: 1.4,
            }}>{project.subtitle}</p>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '8px 20px',
                borderRadius: '8px',
                background: project.color,
                color: project.inkColor ?? '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseOver={e => {
                e.target.style.transform = 'scale(1.05)'
                e.target.style.boxShadow = `0 4px 16px ${project.color}66`
              }}
              onMouseOut={e => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
            >
              Visit Project →
            </a>
          </div>
        </Html>
      )}
    </a.group>
  )
}
