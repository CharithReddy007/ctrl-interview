import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { submitAnswer, endInterview, analyzeAudio } from '../services/api'
import { useMultimodalMetrics } from '../hooks/useMultimodalMetrics'

function MeterBar({ label, value, color = 'var(--yellow)' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function ScorePill({ label, value }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '14px 8px', background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 900, color: 'var(--yellow)' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

export default function InterviewPage() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const [question, setQuestion] = useState(state?.question)
  const [questionNumber, setQuestionNumber] = useState(state?.questionNumber || 1)
  const [totalQuestions] = useState(state?.totalQuestions || 7)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [analyzingAudio, setAnalyzingAudio] = useState(false)
  const [audioIntel, setAudioIntel] = useState(null)
  const [lastScore, setLastScore] = useState(null)
  const [nextQuestionData, setNextQuestionData] = useState(null)
  const [error, setError] = useState('')
  const [useCamera, setUseCamera] = useState(true)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [startingCamera, setStartingCamera] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const {
    metrics, isRecording, transcript, setTranscript,
    permissionError, hasPermissions,
    requestPermissions, startRecording, stopRecording,
    getAudioMetrics, getVisualMetrics, resetMetrics,
  } = useMultimodalMetrics()

  const sessionId = state?.sessionId
  const role = state?.role
  const resumeData = state?.resumeData

  useEffect(() => {
    if (!sessionId) navigate('/')
  }, [sessionId, navigate])

  const initCamera = useCallback(async () => {
    setStartingCamera(true)
    const stream = await requestPermissions()
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
      setCameraStarted(true)
    }
    setStartingCamera(false)
  }, [requestPermissions])

  useEffect(() => {
    if (useCamera) initCamera()
  }, []) // eslint-disable-line

  // Sync transcript to textarea
  useEffect(() => {
    if (transcript) setAnswerText(transcript)
  }, [transcript])

  const handleStopRecording = async () => {
    setAnalyzingAudio(true)
    const blob = await stopRecording()
    if (blob) {
      try {
        const fd = new FormData()
        fd.append('file', blob, 'audio.webm')
        const res = await analyzeAudio(fd)
        if (res.data.transcript) {
          setAnswerText(prev => prev ? prev + ' ' + res.data.transcript : res.data.transcript)
        }
        setAudioIntel(res.data)
      } catch (e) {
        console.warn('Audio analysis failed', e)
      }
    }
    setAnalyzingAudio(false)
  }

  const handleSubmit = async () => {
    if (!answerText.trim()) { setError('Please record or type your answer'); return }
    setSubmitting(true); setError('')

    const audioMetrics = cameraStarted ? getAudioMetrics() : null
    const visualMetrics = cameraStarted ? getVisualMetrics() : null

    // Merge advanced intel if available
    if (audioIntel) {
      audioMetrics.pitch_variation = audioIntel.pitch_variation
      audioMetrics.pauses = audioIntel.pauses
      audioMetrics.tone = audioIntel.tone
    }

    try {
      const res = await submitAnswer({
        session_id: sessionId,
        question_id: question.id,
        question_text: question.text,
        answer_text: answerText,
        audio_metrics: audioMetrics,
        visual_metrics: visualMetrics,
      })

      const data = res.data
      setLastScore(data.score)

      if (data.interview_complete) {
        stopRecording()
        navigate('/report', { state: { sessionId } })
        return
      }

      setNextQuestionData({
        question: data.next_question,
        questionNumber: data.question_number
      })

    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnd = async () => {
    if (!window.confirm('End interview now and generate report?')) return
    stopRecording()
    try { await endInterview(sessionId) } catch (e) {}
    navigate('/report', { state: { sessionId } })
  }

  const handleNextQuestion = () => {
    setQuestion(nextQuestionData.question)
    setQuestionNumber(nextQuestionData.questionNumber)
    setAnswerText('')
    setTranscript('')
    setLastScore(null)
    setNextQuestionData(null)
    setAudioIntel(null)
    resetMetrics()
  }

  const diffColor = (q) => q?.difficulty === 'EASY' ? 'var(--green)' : q?.difficulty === 'HARD' ? 'var(--red)' : 'var(--yellow)'

  return (
    <div>
      <Navbar />
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="tag">{role?.title?.toUpperCase()}</div>
          <div className="tag">SENIORITY: {resumeData?.seniority?.toUpperCase()}</div>
          <div className="tag yellow">Q {questionNumber} / {totalQuestions}</div>
        </div>
        <button className="btn-secondary" onClick={handleEnd} style={{ fontSize: '0.7rem', padding: '8px 16px' }}>
          ☐ END &amp; GENERATE REPORT
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: 'calc(100vh - 112px)' }}>
        {/* Left: Video + transcript */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          {/* Video area */}
          <div style={{ height: 450, background: '#000', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            {useCamera ? (
              <>
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraStarted ? 'block' : 'none' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {!cameraStarted && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'absolute', top: 0, left: 0 }}>
                    {startingCamera ? (
                      <><span className="spinner" /><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>REQUESTING CAMERA...</span></>
                    ) : permissionError ? (
                      <>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--red)', marginBottom: 8 }}>CAMERA UNAVAILABLE</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center', maxWidth: 320 }}>{permissionError}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>FALLBACK MODE: TYPE YOUR ANSWERS BELOW</div>
                      </>
                    ) : (
                      <button className="btn-secondary" onClick={initCamera}>ENABLE CAMERA</button>
                    )}
                  </div>
                )}
              </>
            ) : null}

            {/* Progress overlay */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--border)' }}>
              <div style={{ height: '100%', width: `${((questionNumber - 1) / totalQuestions) * 100}%`, background: 'var(--yellow)', transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* Transcript + submit */}
          <div style={{ flex: 1, padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 6 }}>MIC — TRANSCRIPT (EDITABLE)</div>
            <textarea
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
              placeholder="Your transcript appears here. You can edit before submitting, or type directly."
              style={{ flex: 1, resize: 'none', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: 10, minHeight: 80 }}
            />
            {error && <div className="error-msg" style={{ marginBottom: 8 }}>{error}</div>}
            
            {nextQuestionData ? (
              <button
                className="btn-primary"
                onClick={handleNextQuestion}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '10px' }}
              >
                NEXT QUESTION →
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-secondary"
                  onClick={() => { setAnswerText(''); setTranscript('') }}
                  style={{ fontSize: '0.7rem', padding: '10px 16px' }}
                >
                  ✕ CLEAR
                </button>
                <button
                  className={isRecording ? "btn-primary" : "btn-secondary"}
                  onClick={() => isRecording ? handleStopRecording() : startRecording(videoRef.current)}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '10px', background: isRecording ? 'var(--red)' : '' }}
                  disabled={submitting || analyzingAudio || !cameraStarted}
                >
                  {analyzingAudio ? <><span className="spinner" /> ANALYZING...</> : isRecording ? '⏹ STOP RECORDING' : '⏺ RECORD ANSWER'}
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting || analyzingAudio || isRecording}
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '10px' }}
                >
                  {submitting ? <><span className="spinner" /> EVALUATING...</> : '↑ SUBMIT ANSWER'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Current question */}
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', flex: '0 0 auto' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: 10 }}>
              ✦ CURRENT QUESTION
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div className="tag">{question?.category}</div>
              <div className="tag" style={{ borderColor: diffColor(question), color: diffColor(question) }}>{question?.difficulty}</div>
            </div>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.55 }}>
              {question?.text}
            </p>
          </div>

          {/* Live signals / Evaluation */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flex: '0 0 auto' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: 12 }}>
              {lastScore ? '◈ ANSWER EVALUATION' : '◈ MULTIMODAL SIGNAL'}
            </div>
            
            {lastScore ? (
              <>
                <MeterBar label="ANSWER CORRECTNESS" value={lastScore.correctness || 0} />
                <MeterBar label="TECHNICAL DEPTH" value={lastScore.depth || 0} />
                <MeterBar label="RESPONSE STRUCTURE" value={lastScore.structure || 0} />
              </>
            ) : (
              <>
                <MeterBar label="CONFIDENCE (AUDIO+VISION)" value={metrics.confidence} />
                <MeterBar label="COMMUNICATION CLARITY" value={metrics.communication} />
                <MeterBar label="ENGAGEMENT (POSE+EYE CONTACT)" value={metrics.engagement} />
              </>
            )}

            {!isRecording && cameraStarted && !audioIntel && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 6 }}>
                WAITING TO RECORD...
              </div>
            )}
            {!cameraStarted && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 6 }}>
                ⚠ FALLBACK MODE — METRICS FROM TEXT ONLY
              </div>
            )}
          </div>

          {/* Brief Analysis */}
          {lastScore && lastScore.judgment && (
            <div style={{ padding: '16px 20px', flex: '0 0 auto' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: 12 }}>
                ◈ BRIEF ANALYSIS
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', lineHeight: 1.65, color: 'var(--text-secondary)', background: 'var(--bg-card2)', padding: '12px', borderLeft: '2px solid var(--yellow)' }}>
                {lastScore.judgment}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
