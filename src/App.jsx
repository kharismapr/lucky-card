import { useState, useEffect, useCallback, useRef } from 'react'
import postImg from './assets/post.png'
import luckyCardImg from './assets/lucky card.png'
import './App.css'

/*PHASES */
const PH = {
  MAILBOX: 'mailbox',   // Initial state
  ENVELOPE: 'envelope',  // Envelope visible, flap closed
  CARD_PEEK: 'card_peek', // Flap open, card peeking behind inner
  CARD_UP: 'card_up',   // Card fully risen above everything
  CARD_ZOOM: 'card_zoom', // Card fills screen with glow
}

/* Spark */
const SPARK_COLORS = ['#ffd700', '#ffe566', '#ffec99', '#ffa520', '#ffe033']

function burstSparks(x, y, count = 10) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.className = 'spark'
    const size = Math.random() * 5 + 2
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * 45 + 12
    const dur = (Math.random() * 0.4 + 0.35).toFixed(2)
    const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]
    el.style.cssText = `
      left:${x}px; top:${y}px;
      width:${size}px; height:${size}px;
      background:${color};
      box-shadow:0 0 ${size * 2}px ${color};
      --x:${(Math.cos(angle) * dist).toFixed(1)}px;
      --y:${(Math.sin(angle) * dist).toFixed(1)}px;
      --d:${dur}s;
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), dur * 1000)
  }
}

/* Confetti burst */
function burstConfetti(cx, cy, count = 40) {
  const COLORS = ['#ffd700', '#ff6b6b', '#4ecdc4', '#a78bfa', '#34d399', '#f472b6', '#60a5fa']
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.className = 'confetti'
    const size = Math.random() * 11 + 4
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * 340 + 100
    const r = (Math.random() * 700 - 350).toFixed(0)
    const dur = (Math.random() * 1.8 + 1.4).toFixed(2)
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const round = Math.random() > 0.5 ? '50%' : '2px'
    el.style.cssText = `
      left:${cx}px; top:${cy}px;
      width:${size}px; height:${size}px;
      background:${color}; border-radius:${round};
      --x:${(Math.cos(angle) * dist).toFixed(1)}px;
      --y:${(Math.sin(angle) * dist - 180).toFixed(1)}px;
      --r:${r}deg; --d:${dur}s;
    `
    document.body.appendChild(el)
    setTimeout(() => el.remove(), dur * 1000)
  }
}

/* Sound */
function playPop() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.frequency.setValueAtTime(700, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.08)
    g.gain.setValueAtTime(0.14, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.start(); osc.stop(ctx.currentTime + 0.25)
  } catch { }
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ;[523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.connect(g); g.connect(ctx.destination)
        osc.type = 'sine'
        const t = ctx.currentTime + i * 0.13
        osc.frequency.setValueAtTime(freq, t)
        g.gain.setValueAtTime(0.09, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
        osc.start(t); osc.stop(t + 0.9)
      })
  } catch { }
}

/* Custom Cursor */
function Cursor({ hovering }) {
  const ref = useRef(null)

  useEffect(() => {
    let raf, mx = 0, my = 0, cx = 0, cy = 0

    const onMove = e => {
      mx = e.clientX; my = e.clientY
      if (Math.random() > 0.55) burstSparks(mx, my, 1)
    }
    const loop = () => {
      cx += (mx - cx) * 0.18
      cy += (my - cy) * 0.18
      if (ref.current) {
        ref.current.style.left = `${cx}px`
        ref.current.style.top = `${cy}px`
      }
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div ref={ref} className={`cursor${hovering ? ' cursor--hover' : ''}`}>
      <div className="cursor__dot" />
    </div>
  )
}

/* Scene: Mailbox */
function MailboxScene({ onMailboxClick }) {
  const [wobble, setWobble] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setWobble(true)
      setTimeout(() => setWobble(false), 600)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mailbox-scene">
      <p className="mailbox-text">
        Oh, look! You've got something<br />in mailbox…
      </p>

      <div
        className={`mailbox-wrap${wobble ? ' wobble' : ''}`}
        onClick={onMailboxClick}
        role="button"
        id="mailbox-btn"
        tabIndex={0}
        aria-label="Open mailbox"
      >
        <img src={postImg} alt="Mailbox" className="mailbox-img" />
      </div>

      <p className="hint-text">tap the mailbox </p>
    </div>
  )
}

/* Scene: Envelope */
function EnvelopeScene({ phase, onCardPeekClick, onCardClick, slideOut }) {
  const [localFlap, setLocalFlap] = useState(false)

  // Flap state: toggled locally in ENVELOPE phase, always open in later phases
  const flapOpen = phase === PH.ENVELOPE
    ? localFlap
    : (phase === PH.CARD_PEEK || phase === PH.CARD_UP || phase === PH.CARD_ZOOM)

  // Card peeks when flap is open (local toggle or later phase)
  const cardPeeking = phase === PH.ENVELOPE
    ? localFlap
    : (phase === PH.CARD_PEEK || phase === PH.CARD_UP)

  const cardRisen = phase === PH.CARD_UP
  const sealBurst = flapOpen

  // Toggle flap open/close on each envelope click
  const handleEnvClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    burstSparks(r.left + r.width / 2, r.top + r.height / 3, 12)
    playPop()
    setLocalFlap(prev => !prev)
  }

  // Card is clickable when peeking (local) or in later phases
  const cardClickable = (phase === PH.ENVELOPE && localFlap) ||
    phase === PH.CARD_PEEK ||
    phase === PH.CARD_UP

  const handleCardClick = (e) => {
    e.stopPropagation() // prevent bubbling to envelope toggle
    if (phase === PH.CARD_UP) {
      onCardClick(e)
    } else {
      onCardPeekClick(e)
    }
  }

  const label = phase === PH.ENVELOPE ? 'A letter just for you… 💌' : ''

  const hintText = phase === PH.ENVELOPE
    ? (localFlap ? 'tap the card!' : 'tap the envelope to open')
    : phase === PH.CARD_PEEK ? 'tap the card!'
      : phase === PH.CARD_UP ? 'tap the card again!'
        : ''

  return (
    <div className={`envelope-scene${slideOut ? ' slide-out' : ''}`}>

      <div className="env-wrap">
        {label && <p className="envelope-text">{label}</p>}
        <div
          className="env"
          onClick={phase === PH.ENVELOPE ? handleEnvClick : undefined}
          role={phase === PH.ENVELOPE ? 'button' : undefined}
          id="envelope"
          tabIndex={phase === PH.ENVELOPE ? 0 : -1}
          aria-label="Open envelope"
        >
          <div className="env__back" />

          {/* ── Card ── */}
          <div
            className={`card-rise-wrap${cardRisen ? ' risen' : cardPeeking ? ' peeking' : ''}`}
            onClick={cardClickable ? handleCardClick : undefined}
            role={cardClickable ? 'button' : undefined}
            id="lucky-card"
            tabIndex={cardClickable ? 0 : -1}
            aria-label="Tap lucky card"
          >
            <img src={luckyCardImg} alt="You're Lucky card" className="lucky-card-img" />
          </div>

          {/* ── Inner slot ── */}
          <div className="env__inner" />

          {/* ── Flap ── */}
          <div className={`env__flap-wrap${flapOpen ? ' open' : ''}`}>
            <div className="env__flap" />
          </div>

          {/* ── Seal ── */}
          <div className={`env__seal${sealBurst ? ' burst' : ''}`} />
        </div>
      </div>

      {hintText && <p className="hint-text">{hintText}</p>}
    </div>
  )
}


/* Scene: Card Zoomed */
function CardZoomScene() {
  return (
    <div className="card-zoom-scene">
      <div className="card-zoom-img-wrap">
        <div className="card-zoom-glow" />
        <img
          src={luckyCardImg}
          alt="You're Lucky!"
          className="card-zoom-img"
        />
      </div>
    </div>
  )
}

/* Back Button */
function BackButton({ onClick }) {
  return (
    <button
      className="btn-back"
      onClick={onClick}
      id="back-btn"
      aria-label="Back to start"
    >
      <span className="btn-back__arrow">←</span>
      back
    </button>
  )
}

/* Main App */
export default function App() {
  const [phase, setPhase] = useState(PH.MAILBOX)
  const [hovering, setHovering] = useState(false)
  const [slideOut, setSlideOut] = useState(false)

  useEffect(() => {
    const on = () => setHovering(true)
    const off = () => setHovering(false)
    const attach = () => {
      document.querySelectorAll('[role="button"], button').forEach(el => {
        el.addEventListener('mouseenter', on)
        el.addEventListener('mouseleave', off)
      })
    }
    const obs = new MutationObserver(attach)
    obs.observe(document.body, { childList: true, subtree: true })
    attach()
    return () => { obs.disconnect() }
  }, [])

  /* ── MAILBOX click → ENVELOPE ── */
  const handleMailboxClick = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect()
    burstSparks(r.left + r.width / 2, r.top + r.height / 2, 16)
    playPop()
    setTimeout(() => setPhase(PH.ENVELOPE), 350)
  }, [])

  /* ── CARD_PEEK click → CARD_UP (card rises to top layer) ── */
  const handleCardPeekClick = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect()
    burstSparks(r.left + r.width / 2, r.top + r.height / 2, 8)
    playPop()
    setPhase(PH.CARD_UP)
  }, [])

  /* ── CARD_UP click → CARD_ZOOM ── */
  const handleCardClick = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect()
    burstConfetti(r.left + r.width / 2, r.top + r.height / 2, 50)
    playChime()
    setSlideOut(true)
    setTimeout(() => setPhase(PH.CARD_ZOOM), 350)
  }, [])

  /* ── BACK button → MAILBOX ── */
  const handleBack = useCallback(() => {
    setSlideOut(false)
    setPhase(PH.MAILBOX)
  }, [])

  const showBack = phase !== PH.MAILBOX

  return (
    <div className="app">
      <Cursor hovering={hovering} />

      {showBack && <BackButton onClick={handleBack} />}

      {/* Mailbox scene */}
      {phase === PH.MAILBOX && (
        <MailboxScene onMailboxClick={handleMailboxClick} />
      )}

      {/* Envelope scene */}
      {(phase === PH.ENVELOPE || phase === PH.CARD_PEEK || phase === PH.CARD_UP) && (
        <EnvelopeScene
          phase={phase}
          onCardPeekClick={handleCardPeekClick}
          onCardClick={handleCardClick}
          slideOut={slideOut}
        />
      )}

      {/* Card zoom */}
      {phase === PH.CARD_ZOOM && <CardZoomScene />}

    </div>
  )
}
