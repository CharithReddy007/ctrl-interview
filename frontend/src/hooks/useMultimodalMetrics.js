import { useRef, useState, useCallback, useEffect } from 'react'
import { initCV, analyzeFrame } from '../services/cvModel'

export function useMultimodalMetrics() {
  const [metrics, setMetrics] = useState({ confidence: 0, communication: 0, engagement: 0 })
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [permissionError, setPermissionError] = useState(null)
  const [hasPermissions, setHasPermissions] = useState(false)

  const streamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const videoRef = useRef(null)
  const metricsIntervalRef = useRef(null)
  const isAnalyzingRef = useRef(false)
  const speechDataRef = useRef({ words: [], pauses: 0, volume_peaks: 0, total_frames: 0 })
  const rawAudioMetricsRef = useRef({ wpm: 0, pauses: 0, volume_variance: 0, hesitations: 0 })
  const rawVisualMetricsRef = useRef({ face_present: 0, eye_contact: 0, stress: 0 })

  const requestPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      setHasPermissions(true)
      setPermissionError(null)
      return stream
    } catch (e) {
      setPermissionError(e.message || 'Permission denied')
      setHasPermissions(false)
      return null
    }
  }, [])

  const startRecording = useCallback(async (videoElement) => {
    videoRef.current = videoElement

    await initCV()

    let stream = streamRef.current
    if (!stream) {
      stream = await requestPermissions()
      if (!stream) return false
    }

    // Attach video if not already attached
    if (videoElement && videoElement.srcObject !== stream) {
      videoElement.srcObject = stream
      videoElement.play().catch(() => {})
    }

    // Audio analysis
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioCtxRef.current = new AudioContext()
      const source = audioCtxRef.current.createMediaStreamSource(stream)
      const analyser = audioCtxRef.current.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
    } catch (e) { console.warn('Audio analysis unavailable', e) }

    // Speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.onresult = (event) => {
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' '
          } else {
            // we could handle interim results if we want live-live, but let's just use final for simplicity or concatenate
            // Wait, standard behavior was to just use isFinal. To make it more responsive, we can append interim?
            // Actually, the previous code was: if (event.results[i].isFinal) final += ...
            // Let's just fix the initial bugs first.
          }
        }
        if (final) {
          setTranscript(prev => prev + final)
          const words = final.trim().split(/\s+/).length
          speechDataRef.current.words.push({ words, time: Date.now() })
        }
      }
      rec.onerror = (e) => { console.warn('Speech recognition error', e) }
      try { rec.start() } catch(e) {}
      recognitionRef.current = rec
    }

    // Start MediaRecorder for audio blob
    audioChunksRef.current = []
    try {
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.start(1000)
      mediaRecorderRef.current = mr
    } catch(e) { console.warn('MediaRecorder error', e) }

    setIsRecording(true)
    speechDataRef.current = { words: [], pauses: 0, volume_peaks: 0, total_frames: 0 }

    // Metrics update loop
    metricsIntervalRef.current = setInterval(() => {
      _updateMetrics()
    }, 800)

    return true
  }, [requestPermissions])

  const _updateMetrics = useCallback(() => {
    // Audio metrics
    let volumeLevel = 0
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)
      volumeLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      if (volumeLevel > 30) speechDataRef.current.volume_peaks++
    }

    // WPM calculation (rolling 30s)
    const now = Date.now()
    const recentWords = speechDataRef.current.words.filter(w => now - w.time < 30000)
    const totalWords = recentWords.reduce((a, w) => a + w.words, 0)
    const wpm = Math.round(totalWords * 2) // words per 30s -> per minute approx

    rawAudioMetricsRef.current = {
      wpm: Math.min(wpm, 250),
      volume: Math.round(volumeLevel),
      speaking: volumeLevel > 15,
    }

    // Visual metrics using CV Model
    let facePresent = 0, eyeContact = 0, stressScore = 0
    if (videoRef.current && !isAnalyzingRef.current) {
      isAnalyzingRef.current = true
      analyzeFrame(videoRef.current).then(cvResult => {
        if (cvResult) {
          facePresent = cvResult.facePresent
          eyeContact = cvResult.eyeContact
          stressScore = cvResult.stress
        }
        rawVisualMetricsRef.current = {
          face_present: facePresent,
          eye_contact: eyeContact,
          stress: stressScore,
        }
        
        // Compute live meters
        const speaking = volumeLevel > 15
        const wpmScore = wpm > 0 ? Math.min(100, Math.round((wpm / 150) * 100)) : 0
        const confidence = Math.round((facePresent * 0.2) + (wpmScore * 0.4) + (speaking ? 20 : 0) + (Math.max(0, 100 - (stressScore || 0)) * 0.2)) || 0
        const communication = Math.round((wpmScore * 0.5) + (speaking ? 30 : 0) + 20) || 0
        const engagement = Math.round((eyeContact * 0.6) + (facePresent * 0.2) + (speaking ? 20 : 0)) || 0

        setMetrics({
          confidence: Math.max(0, Math.min(100, confidence)),
          communication: Math.max(0, Math.min(100, communication)),
          engagement: Math.max(0, Math.min(100, engagement)),
          stress: Math.max(0, Math.min(100, stressScore || 0))
        })
        isAnalyzingRef.current = false
      }).catch(() => { isAnalyzingRef.current = false })
    }
  }, [])

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      setIsRecording(false)
      if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current)
      if (recognitionRef.current) { try { recognitionRef.current.stop() } catch(e) {} }
      if (audioCtxRef.current) { try { audioCtxRef.current.close() } catch(e) {} }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          resolve(blob)
        }
        mediaRecorderRef.current.stop()
      } else {
        resolve(null)
      }
    })
  }, [])

  const cleanupStream = useCallback(() => {
    stopRecording()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setHasPermissions(false)
  }, [stopRecording])

  const getAudioMetrics = useCallback(() => rawAudioMetricsRef.current, [])
  const getVisualMetrics = useCallback(() => rawVisualMetricsRef.current, [])

  const resetMetrics = useCallback(() => {
    setMetrics({ confidence: 0, communication: 0, engagement: 0 })
    rawAudioMetricsRef.current = { wpm: 0, pauses: 0, volume_variance: 0, hesitations: 0 }
    rawVisualMetricsRef.current = { face_present: 0, eye_contact: 0, stress: 0 }
  }, [])

  useEffect(() => () => cleanupStream(), [cleanupStream])

  return {
    metrics, isRecording, transcript, setTranscript,
    permissionError, hasPermissions,
    requestPermissions, startRecording, stopRecording,
    getAudioMetrics, getVisualMetrics, resetMetrics,
  }
}
