import * as faceapi from '@vladmandic/face-api'

let isInitialized = false

export async function initCV() {
  if (isInitialized) return true
  try {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
    ])
    isInitialized = true
    return true
  } catch (e) {
    console.error('Failed to init CV models', e)
    return false
  }
}

export async function analyzeFrame(videoElement) {
  if (!isInitialized || !videoElement || videoElement.paused || videoElement.ended) {
    return null
  }

  try {
    const detection = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()

    if (!detection) return null

    // Parse Expressions for Stress/Engagement
    // Stress = Fear + Sadness + Disgust + Angry
    const exp = detection.expressions
    const stressScore = Math.min(100, (exp.fear + exp.sad + exp.disgust + exp.angry) * 100 * 2) // scale up
    
    // Parse Landmarks for Eye Contact / Pose
    // A simple heuristic: distance between eyes vs nose position
    const landmarks = detection.landmarks
    const nose = landmarks.getNose()
    const leftEye = landmarks.getLeftEye()
    const rightEye = landmarks.getRightEye()
    
    // Calculate center of eyes
    const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2
    const noseX = nose[3].x // Tip of nose
    const faceWidth = detection.detection.box.width
    
    // Ratio of nose deviation from center of eyes
    const deviation = Math.abs(noseX - eyeCenterX) / faceWidth
    // Small deviation means looking straight. Max deviation ~0.2 means looking away.
    const eyeContactScore = Math.max(0, 100 - (deviation * 500))

    return {
      stress: stressScore,
      eyeContact: eyeContactScore,
      facePresent: 100
    }
  } catch (e) {
    return null
  }
}
