<script setup lang="ts">
const colorMode = useColorMode()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId: number
let removeResize: () => void

interface Orb {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  phase: number
}

// Orb positions/movement — same for both modes
const orbs: Orb[] = [
  { x: 0.20, y: 0.25, vx:  0.00022, vy:  0.00013, r: 0.52, phase: 0.0 },
  { x: 0.75, y: 0.60, vx: -0.00018, vy:  0.00020, r: 0.46, phase: 1.3 },
  { x: 0.50, y: 0.88, vx:  0.00014, vy: -0.00022, r: 0.42, phase: 2.6 },
  { x: 0.88, y: 0.18, vx: -0.00028, vy:  0.00009, r: 0.36, phase: 3.9 },
  { x: 0.08, y: 0.72, vx:  0.00019, vy: -0.00014, r: 0.44, phase: 5.2 },
  { x: 0.60, y: 0.35, vx: -0.00012, vy:  0.00025, r: 0.32, phase: 0.7 },
]

// Dark mode palette
const darkOrbs: [number, number, number][] = [
  [20,  83,  45],
  [15, 118, 110],
  [22, 101,  52],
  [13, 148, 136],
  [6,   78,  59],
  [5,  150, 105],
]
// Light mode palette — same hues, much higher brightness
const lightOrbs: [number, number, number][] = [
  [134, 239, 172],
  [94,  234, 212],
  [110, 231, 183],
  [52,  211, 153],
  [167, 243, 208],
  [45,  212, 191],
]

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const dpr = Math.min(window.devicePixelRatio, 2)
    const w = parent.clientWidth
    const h = parent.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)
  }

  window.addEventListener('resize', resize)
  removeResize = () => window.removeEventListener('resize', resize)
  resize()

  let t = 0
  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio, 2)
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    const minDim = Math.min(W, H)
    const isDark = colorMode.value === 'dark'

    if (isDark) {
      ctx.fillStyle = '#030a06'
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'screen'

      for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i]
        orb.x += orb.vx; orb.y += orb.vy
        if (orb.x < -0.2) orb.x = 1.2
        if (orb.x >  1.2) orb.x = -0.2
        if (orb.y < -0.2) orb.y = 1.2
        if (orb.y >  1.2) orb.y = -0.2

        const cx = orb.x * W
        const cy = orb.y * H
        const pulse = 1 + 0.045 * Math.sin(t * 0.38 + orb.phase)
        const r = orb.r * minDim * pulse
        const [rr, g, b] = darkOrbs[i]

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        grad.addColorStop(0,    `rgba(${rr},${g},${b},0.60)`)
        grad.addColorStop(0.45, `rgba(${rr},${g},${b},0.22)`)
        grad.addColorStop(1,    `rgba(${rr},${g},${b},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      // Dark vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(0,0,0,0.55)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)
    } else {
      // Light mode base — warm white with faint green tint
      ctx.fillStyle = '#f0fdf4'
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'multiply'

      for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i]
        orb.x += orb.vx; orb.y += orb.vy
        if (orb.x < -0.2) orb.x = 1.2
        if (orb.x >  1.2) orb.x = -0.2
        if (orb.y < -0.2) orb.y = 1.2
        if (orb.y >  1.2) orb.y = -0.2

        const cx = orb.x * W
        const cy = orb.y * H
        const pulse = 1 + 0.045 * Math.sin(t * 0.38 + orb.phase)
        const r = orb.r * minDim * pulse
        const [rr, g, b] = lightOrbs[i]

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        grad.addColorStop(0,    `rgba(${rr},${g},${b},0.55)`)
        grad.addColorStop(0.5,  `rgba(${rr},${g},${b},0.18)`)
        grad.addColorStop(1,    `rgba(${rr},${g},${b},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      // Soft light vignette — barely visible
      const vig = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72)
      vig.addColorStop(0, 'rgba(240,253,244,0)')
      vig.addColorStop(1, 'rgba(187,247,208,0.25)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)
    }

    t += 0.016
    animId = requestAnimationFrame(draw)
  }

  draw()
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  if (removeResize) removeResize()
})
</script>

<template>
  <canvas ref="canvasRef" class="block" />
</template>
