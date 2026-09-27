"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

interface DotData {
  lng: number
  lat: number
}

const LAND_DATA_URL =
  "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json"

export default function RotatingEarth({ width = 800, height = 600, className = "" }: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    // Set up responsive dimensions
    const containerWidth = Math.min(width, window.innerWidth - 40)
    const containerHeight = Math.min(height, window.innerHeight - 100)
    const radius = Math.min(containerWidth, containerHeight) / 2.5

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    // Prevent the browser from hijacking touch gestures (scroll/zoom) on the globe
    canvas.style.touchAction = "none"
    context.scale(dpr, dpr)

    // Create projection and path generator for Canvas
    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }

      return inside
    }

    const pointInFeature = (point: [number, number], feature: GeoJSON.Feature): boolean => {
      const geometry = feature.geometry

      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates
        // Check if point is in outer ring
        if (!pointInPolygon(point, coordinates[0])) {
          return false
        }
        // Check if point is in any hole (inner rings)
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) {
            return false // Point is in a hole
          }
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        // Check each polygon in the MultiPolygon
        for (const polygon of geometry.coordinates) {
          // Check if point is in outer ring
          if (pointInPolygon(point, polygon[0])) {
            // Check if point is in any hole
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) {
              return true
            }
          }
        }
        return false
      }

      return false
    }

    const generateDotsInPolygon = (feature: GeoJSON.Feature, dotSpacing = 16) => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds

      const stepSize = dotSpacing * 0.08

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
          }
        }
      }

      return dots
    }

    const allDots: DotData[] = []
    let landFeatures: GeoJSON.FeatureCollection | null = null

    // rotation is a [lng, phi] tuple — typed as such so d3's rotate() accepts it
    const rotation: [number, number] = [0, 0]

    const render = () => {
      // Clear canvas
      context.clearRect(0, 0, containerWidth, containerHeight)

      const currentScale = projection.scale()
      const scaleFactor = currentScale / radius

      // Draw ocean (globe background)
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle = "#000000"
      context.fill()
      context.strokeStyle = "#ffffff"
      context.lineWidth = 2 * scaleFactor
      context.stroke()

      if (landFeatures) {
        // Draw graticule
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        context.strokeStyle = "#ffffff"
        context.lineWidth = 1 * scaleFactor
        context.globalAlpha = 0.25
        context.stroke()
        context.globalAlpha = 1

        // Draw land outlines
        context.beginPath()
        landFeatures.features.forEach((feature) => {
          path(feature)
        })
        context.strokeStyle = "#ffffff"
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        // Geographic center of the visible hemisphere for the current rotation.
        // projection() does NOT apply clipAngle, so far-side dots would otherwise
        // be drawn mirrored onto the disc — cull them with an angular-distance test.
        const visibleCenter: [number, number] = [-rotation[0], -rotation[1]]

        // Draw halftone dots
        allDots.forEach((dot) => {
          // Skip dots on the far hemisphere (angular distance > 90° from center)
          if (d3.geoDistance([dot.lng, dot.lat], visibleCenter) > Math.PI / 2) {
            return
          }
          const projected = projection([dot.lng, dot.lat])
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.beginPath()
            context.arc(projected[0], projected[1], 1.2 * scaleFactor, 0, 2 * Math.PI)
            context.fillStyle = "#999999"
            context.fill()
          }
        })
      }
    }

    const loadWorldData = async () => {
      try {
        setIsLoading(true)

        const response = await fetch(LAND_DATA_URL)
        if (!response.ok) throw new Error("Failed to load land data")

        landFeatures = (await response.json()) as GeoJSON.FeatureCollection

        // Generate dots for all land features
        landFeatures.features.forEach((feature) => {
          const dots = generateDotsInPolygon(feature, 16)
          dots.forEach(([lng, lat]) => {
            allDots.push({ lng, lat })
          })
        })

        render()
        setIsLoading(false)
      } catch {
        setError("Failed to load land map data")
        setIsLoading(false)
      }
    }

    // Set up rotation and interaction
    let autoRotate = true
    const rotationSpeed = 0.5

    const rotate = () => {
      if (autoRotate) {
        rotation[0] += rotationSpeed
        projection.rotate(rotation)
        render()
      }
    }

    // Auto-rotation timer
    const rotationTimer = d3.timer(rotate)

    // Unified pointer handling (mouse + touch + pen). Pointer capture keeps
    // move/up events flowing to the canvas even if the pointer leaves it,
    // and per-gesture listeners are removed on release — no document-level
    // listener leaks if the component unmounts mid-drag.
    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return
      if (event.pointerType === "mouse" && event.button !== 0) return
      event.preventDefault()

      autoRotate = false
      const startX = event.clientX
      const startY = event.clientY
      const startRotation: [number, number] = [...rotation]
      const activePointerId = event.pointerId

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== activePointerId) return
        const sensitivity = 0.5
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = startRotation[1] - dy * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]))

        projection.rotate(rotation)
        render()
      }

      const handlePointerUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== activePointerId) return
        canvas.removeEventListener("pointermove", handlePointerMove)
        canvas.removeEventListener("pointerup", handlePointerUp)
        canvas.removeEventListener("pointercancel", handlePointerUp)

        setTimeout(() => {
          autoRotate = true
        }, 10)
      }

      canvas.addEventListener("pointermove", handlePointerMove)
      canvas.addEventListener("pointerup", handlePointerUp)
      canvas.addEventListener("pointercancel", handlePointerUp)
      try {
        canvas.setPointerCapture(activePointerId)
      } catch {
        // setPointerCapture can throw for mouse in some edge cases — drag still works
      }
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
      const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * zoomFactor))
      projection.scale(newRadius)
      render()
    }

    canvas.addEventListener("pointerdown", handlePointerDown)
    canvas.addEventListener("wheel", handleWheel, { passive: false })

    // Load the world data
    loadWorldData()

    // Cleanup
    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("pointerdown", handlePointerDown)
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [width, height])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-card rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Error loading Earth visualization</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Interactive 3D wireframe globe. Drag to rotate, scroll to zoom."
        className="w-full h-auto rounded-2xl bg-background dark"
        style={{ maxWidth: "100%", height: "auto" }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-neutral-400 text-sm animate-pulse">Loading globe…</p>
        </div>
      )}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground px-2 py-1 rounded-md dark bg-neutral-900">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  )
}
